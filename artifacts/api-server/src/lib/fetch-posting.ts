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
  if (jobDescription.length < 100) {
    throw new Error(
      "Could not extract a meaningful job description from the page",
    );
  }

  return { jobDescription, jobTitle, company };
}
