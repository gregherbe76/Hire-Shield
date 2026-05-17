import * as cheerio from "cheerio";
import { lookup as dnsLookup } from "node:dns/promises";
import { Agent, type Dispatcher } from "undici";

export interface FetchedPosting {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

function normalizeIpv4Mapped(host: string): string {
  // IPv4-mapped IPv6 has two surface forms:
  //   - dotted-quad:  "::ffff:127.0.0.1"
  //   - hex (the form Node's URL normalizes to):  "::ffff:7f00:1"
  // Round-trip both back to dotted-quad so the IPv4 checks below catch them.
  const dottedMatch =
    /^::(?:ffff:)?((?:\d{1,3}\.){3}\d{1,3})$/.exec(host) ??
    /^::(?:ffff:)?0:((?:\d{1,3}\.){3}\d{1,3})$/.exec(host);
  if (dottedMatch) return dottedMatch[1]!;
  const hexMatch = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (hexMatch) {
    const hi = parseInt(hexMatch[1]!, 16);
    const lo = parseInt(hexMatch[2]!, 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return host;
}

function isBlockedHost(host: string): boolean {
  const effective = normalizeIpv4Mapped(host);
  return (
    effective === "localhost" ||
    effective === "0.0.0.0" ||
    effective.endsWith(".localhost") ||
    effective.endsWith(".local") ||
    effective.endsWith(".internal") ||
    /^127\./.test(effective) ||
    /^10\./.test(effective) ||
    /^192\.168\./.test(effective) ||
    /^169\.254\./.test(effective) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(effective) ||
    effective === "::1" ||
    effective === "::" ||
    effective.startsWith("fc") ||
    effective.startsWith("fd") ||
    effective.startsWith("fe80:") ||
    effective.startsWith("fec0:")
  );
}

function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  // Node's URL keeps IPv6 hostnames in bracketed form ("[::1]"), so strip
  // brackets before comparing — otherwise the loopback check silently misses.
  const host = stripBrackets(url.hostname.toLowerCase());
  if (isBlockedHost(host)) {
    throw new Error("URL host is not allowed");
  }
  return url;
}

interface ResolvedHost {
  address: string;
  family: 4 | 6;
}

/**
 * Resolve the hostname and reject if any answer falls in the SSRF blocklist.
 *
 * The hostname-string check in `assertSafeUrl` is not enough on its own: an
 * attacker can register a public domain whose A record points at 127.0.0.1
 * (or 169.254.169.254, etc). Without this resolve-and-check step, the fetch
 * would happily connect to that internal address.
 */
async function resolveAndCheckHost(hostname: string): Promise<ResolvedHost> {
  const host = stripBrackets(hostname.toLowerCase());
  let entries: Array<{ address: string; family: number }>;
  try {
    entries = await dnsLookup(host, { all: true });
  } catch {
    throw new Error("Could not resolve URL host");
  }
  if (entries.length === 0) {
    throw new Error("Could not resolve URL host");
  }
  for (const { address } of entries) {
    if (isBlockedHost(address.toLowerCase())) {
      throw new Error("URL host resolves to a blocked address");
    }
  }
  const first = entries[0]!;
  return {
    address: first.address,
    family: first.family === 6 ? 6 : 4,
  };
}

/**
 * Build a dispatcher that pins the TCP connection to a specific IP. This
 * defeats DNS rebinding: even if the resolver returns a fresh (malicious)
 * answer between our check and the socket connect, we ignore it and connect
 * to the address we already validated.
 */
function makePinnedDispatcher(resolved: ResolvedHost): Dispatcher {
  return new Agent({
    connect: {
      lookup: (
        _hostname: string,
        _options: unknown,
        cb: (
          err: NodeJS.ErrnoException | null,
          address: string,
          family: number,
        ) => void,
      ) => {
        cb(null, resolved.address, resolved.family);
      },
    },
  });
}

function collapseWhitespace(s: string): string {
  return s.replace(/[ \t\f\v]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const APIFY_TIMEOUT_MS = 60_000;

async function fetchPostingViaApify(
  url: URL,
): Promise<FetchedPosting | null> {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  if (!token) return null;

  const endpoint = `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=55`;

  const input = {
    startUrls: [{ url: url.toString() }],
    maxCrawlPages: 1,
    maxCrawlDepth: 0,
    crawlerType: "playwright:adaptive",
    removeElementsCssSelector:
      "nav, footer, header, aside, script, style, noscript, iframe, .cookie, .banner, .newsletter",
    saveMarkdown: true,
    saveHtml: false,
    proxyConfiguration: { useApifyProxy: true },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new Error("Apify request timed out");
    }
    throw new Error(`Apify request failed: ${(err as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Apify returned ${res.status}: ${body.slice(0, 200) || "no body"}`,
    );
  }

  const items = (await res.json()) as Array<{
    text?: string;
    markdown?: string;
    metadata?: { title?: string; description?: string; canonicalUrl?: string };
    url?: string;
  }>;
  if (!Array.isArray(items) || items.length === 0) return null;

  const item = items[0];
  const text = (item.markdown || item.text || "").trim();
  if (text.length < 100) return null;

  const jobDescription = collapseWhitespace(text).slice(0, 20000);
  const jobTitle = item.metadata?.title?.trim().slice(0, 300) || undefined;
  const company = url.hostname.slice(0, 200);

  return { jobDescription, jobTitle, company };
}

/**
 * Fetch the URL while defending against DNS rebinding. We follow redirects
 * manually so each hop's host is re-validated and pinned independently —
 * a 302 to an internal address is rejected the same way the initial URL
 * would be.
 */
async function safeFetchHtml(
  startUrl: URL,
  signal: AbortSignal,
): Promise<{ response: Response; finalUrl: URL }> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const resolved = await resolveAndCheckHost(current.hostname);
    const dispatcher = makePinnedDispatcher(resolved);
    const init = {
      method: "GET",
      redirect: "manual" as const,
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HireShieldBot/1.0; +https://hireshield.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
      dispatcher,
    };
    const res = await fetch(current.toString(), init as RequestInit);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return { response: res, finalUrl: current };
      }
      // Drain & close the redirect body so the socket can be released.
      await res.body?.cancel().catch(() => {});
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error("Redirect location is not a valid URL");
      }
      // Re-run the hostname-string guard on each hop.
      assertSafeUrl(next.toString());
      current = next;
      continue;
    }
    return { response: res, finalUrl: current };
  }
  throw new Error("Too many redirects");
}

export async function fetchPostingFromUrl(
  rawUrl: string,
): Promise<FetchedPosting> {
  const url = assertSafeUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  let finalUrl: URL;
  try {
    const result = await safeFetchHtml(url, controller.signal);
    res = result.response;
    finalUrl = result.finalUrl;
  } catch (err) {
    clearTimeout(timer);
    const message = (err as Error).message;
    if ((err as Error).name === "AbortError") {
      throw new Error("Request timed out while fetching the URL");
    }
    // Preserve guard messages so callers / tests can distinguish them from
    // generic network failures.
    if (
      /not allowed|blocked address|Invalid URL|http and https|resolve URL host|Too many redirects|Redirect location/i.test(
        message,
      )
    ) {
      throw err;
    }
    throw new Error("Failed to fetch the URL");
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new Error(`URL returned status ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("xml")) {
    throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty response body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Response too large");
      }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, header, footer, form, aside").remove();

  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $('meta[name="twitter:title"]').attr("content")?.trim() ||
    "";
  const htmlTitle = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();
  const jobTitle = (ogTitle || h1 || htmlTitle || "").slice(0, 300) || undefined;

  const ogSiteName =
    $('meta[property="og:site_name"]').attr("content")?.trim() || "";
  const company = (ogSiteName || finalUrl.hostname).slice(0, 200);

  // Pick the largest text-bearing region as the body.
  let bestText = "";
  $("main, article, [role=main], section, div").each((_, el) => {
    const t = $(el).text();
    if (t.length > bestText.length) bestText = t;
  });
  if (bestText.length < 200) {
    bestText = $("body").text();
  }

  const jobDescription = collapseWhitespace(bestText).slice(0, 20000);
  if (jobDescription.length < 400) {
    // Simple fetch returned too little — try Apify (renders JS, bypasses bot walls).
    const apifyResult = await fetchPostingViaApify(finalUrl).catch(
      (err: Error) => {
        throw new Error(
          `Page didn't expose enough text via plain fetch, and Apify fallback failed: ${err.message}`,
        );
      },
    );
    if (apifyResult) return apifyResult;
    throw new Error(
      "Could not extract a meaningful job description from the page",
    );
  }

  return { jobDescription, jobTitle, company };
}

export async function fetchPostingFromUrlForce(
  rawUrl: string,
): Promise<FetchedPosting> {
  const url = assertSafeUrl(rawUrl);
  const result = await fetchPostingViaApify(url);
  if (!result) {
    throw new Error("Apify is not configured or returned no content");
  }
  return result;
}
