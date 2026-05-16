import * as cheerio from "cheerio";

export interface FetchedPosting {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 10_000;

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
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host === "::1" ||
    host.startsWith("[fc") ||
    host.startsWith("[fd")
  ) {
    throw new Error("URL host is not allowed");
  }
  return url;
}

function collapseWhitespace(s: string): string {
  return s.replace(/[ \t\f\v]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const APIFY_TIMEOUT_MS = 60_000;

async function fetchPostingViaApify(
  url: URL,
): Promise<FetchedPosting | null> {
  const token = process.env.APIFY_TOKEN;
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

export async function fetchPostingFromUrl(
  rawUrl: string,
): Promise<FetchedPosting> {
  const url = assertSafeUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HireShieldBot/1.0; +https://hireshield.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new Error("Request timed out while fetching the URL");
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
  const company = (ogSiteName || url.hostname).slice(0, 200);

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
    const apifyResult = await fetchPostingViaApify(url).catch((err: Error) => {
      throw new Error(
        `Page didn't expose enough text via plain fetch, and Apify fallback failed: ${err.message}`,
      );
    });
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
