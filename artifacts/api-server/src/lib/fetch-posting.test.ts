import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DNS so SSRF tests and response-handling tests don't hit real DNS.
// We default to a public-looking IP; individual tests override per call.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

// Mock undici so the pinned dispatcher is a no-op object; the real fetch
// is stubbed at the global level below and never actually uses it.
vi.mock("undici", () => ({
  Agent: class {
    constructor(_opts: unknown) {}
  },
}));

import { lookup as dnsLookup } from "node:dns/promises";
import { fetchPostingFromUrl } from "./fetch-posting";

// dnsLookup is overloaded; we always call it with { all: true } which returns
// an array. The mock's typing collapses to the non-array overload, so we cast.
const mockedLookup = vi.mocked(dnsLookup) as unknown as ReturnType<
  typeof vi.fn<
    (
      hostname: string,
      options: unknown,
    ) => Promise<Array<{ address: string; family: number }>>
  >
>;

describe("fetchPostingFromUrl — SSRF guard (assertSafeUrl)", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(fetchPostingFromUrl("file:///etc/passwd")).rejects.toThrow(
      /http and https/i,
    );
    await expect(fetchPostingFromUrl("ftp://example.com")).rejects.toThrow(
      /http and https/i,
    );
    await expect(fetchPostingFromUrl("javascript:alert(1)")).rejects.toThrow();
  });

  it("rejects malformed URLs", async () => {
    await expect(fetchPostingFromUrl("not a url")).rejects.toThrow(
      /invalid url/i,
    );
  });

  it.each([
    "http://localhost/admin",
    "http://0.0.0.0:8080",
    "http://127.0.0.1/secret",
    "http://10.0.0.5/internal",
    "http://192.168.1.1/router",
    "http://172.16.0.1/aws-metadata",
    "http://169.254.169.254/latest/meta-data", // AWS IMDS
    "http://api.internal/foo",
    "http://service.local/foo",
    "http://[::1]/loopback-v6",
  ])("rejects private/loopback host %s", async (url) => {
    await expect(fetchPostingFromUrl(url)).rejects.toThrow(/not allowed/i);
  });

  it("rejects IPv6 unique-local (fc/fd) and link-local (fe80) addresses", async () => {
    await expect(
      fetchPostingFromUrl("http://[fc00::1]/internal"),
    ).rejects.toThrow(/not allowed/i);
    await expect(
      fetchPostingFromUrl("http://[fd12:3456::1]/internal"),
    ).rejects.toThrow(/not allowed/i);
    await expect(
      fetchPostingFromUrl("http://[fe80::1]/internal"),
    ).rejects.toThrow(/not allowed/i);
  });

  it.each([
    "http://[::ffff:127.0.0.1]/loopback",
    "http://[::ffff:169.254.169.254]/aws-imds",
    "http://[::ffff:10.0.0.1]/rfc1918",
    "http://[::ffff:192.168.1.1]/router",
  ])("rejects IPv4-mapped IPv6 bypass %s", async (url) => {
    await expect(fetchPostingFromUrl(url)).rejects.toThrow(/not allowed/i);
  });
});

describe("fetchPostingFromUrl — DNS rebinding defense", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mockedLookup.mockReset();
    mockedLookup.mockImplementation(
      async () => [{ address: "93.184.216.34", family: 4 }],
    );
  });

  it.each([
    ["127.0.0.1", 4],
    ["10.1.2.3", 4],
    ["192.168.50.1", 4],
    ["169.254.169.254", 4], // AWS IMDS
    ["172.20.0.1", 4],
    ["::1", 6],
    ["fc00::1", 6],
    ["fe80::1", 6],
  ] as const)(
    "rejects when a public-looking host resolves to %s",
    async (address, family) => {
      mockedLookup.mockResolvedValueOnce([{ address, family }]);
      await expect(
        fetchPostingFromUrl("http://attacker.example/job"),
      ).rejects.toThrow(/blocked address/i);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects if any one of multiple resolved IPs is blocked", async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(
      fetchPostingFromUrl("http://attacker.example/job"),
    ).rejects.toThrow(/blocked address/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when DNS resolution fails", async () => {
    mockedLookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(
      fetchPostingFromUrl("http://does-not-exist.example/x"),
    ).rejects.toThrow(/resolve URL host/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a redirect that points at an internal hostname", async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ]);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    );
    await expect(
      fetchPostingFromUrl("https://example.com/start"),
    ).rejects.toThrow(/not allowed/i);
  });

  it("rejects a redirect whose host resolves to an internal IP", async () => {
    mockedLookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://rebind.example/admin" },
      }),
    );
    await expect(
      fetchPostingFromUrl("https://example.com/start"),
    ).rejects.toThrow(/blocked address/i);
  });
});

describe("fetchPostingFromUrl — response handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    mockedLookup.mockImplementation(
      async () => [{ address: "93.184.216.34", family: 4 }],
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockedLookup.mockReset();
    mockedLookup.mockImplementation(
      async () => [{ address: "93.184.216.34", family: 4 }],
    );
  });

  function mockResponse(opts: {
    body?: string;
    contentType?: string;
    status?: number;
  }): Response {
    const body = opts.body ?? "";
    const encoder = new TextEncoder();
    const chunk = encoder.encode(body);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.close();
      },
    });
    return new Response(stream, {
      status: opts.status ?? 200,
      headers: { "content-type": opts.contentType ?? "text/html" },
    });
  }

  it("throws on non-2xx status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ status: 503, body: "" }),
    );
    await expect(
      fetchPostingFromUrl("https://example.com/job"),
    ).rejects.toThrow(/status 503/);
  });

  it("rejects non-HTML content types", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ body: "{}", contentType: "application/json" }),
    );
    await expect(
      fetchPostingFromUrl("https://example.com/api"),
    ).rejects.toThrow(/unsupported content type/i);
  });

  it("rejects responses larger than 2 MB", async () => {
    const big = "a".repeat(3 * 1024 * 1024);
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: big }));
    await expect(
      fetchPostingFromUrl("https://example.com/large"),
    ).rejects.toThrow(/too large/i);
  });

  it("extracts a job description from a basic HTML page", async () => {
    const html = `
      <html>
        <head>
          <title>Senior Engineer — Acme</title>
          <meta property="og:title" content="Senior Engineer — Acme" />
          <meta property="og:site_name" content="Acme Inc" />
        </head>
        <body>
          <header>nav stuff</header>
          <main>
            ${"<p>We are hiring a senior engineer to work on our distributed platform. " +
              "You will own the metadata service and partner with the SRE team. " +
              "Strong systems background required. Full remote within EU. " +
              "Comprehensive benefits and competitive compensation in the range of $150k to $200k.</p>".repeat(3)}
          </main>
          <footer>footer stuff</footer>
        </body>
      </html>
    `;
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: html }));
    const result = await fetchPostingFromUrl("https://acme.example.com/jobs/1");
    expect(result.jobTitle).toBe("Senior Engineer — Acme");
    expect(result.company).toBe("Acme Inc");
    expect(result.jobDescription).toContain("senior engineer");
    expect(result.jobDescription).not.toContain("<p>");
    expect(result.jobDescription).not.toContain("nav stuff");
    expect(result.jobDescription).not.toContain("footer stuff");
  });

  it("falls back to hostname when og:site_name is missing", async () => {
    const html =
      "<html><head><title>Job</title></head><body><main>" +
      "Detailed job description ".repeat(40) +
      "</main></body></html>";
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: html }));
    const result = await fetchPostingFromUrl("https://careers.foo.com/x");
    expect(result.company).toBe("careers.foo.com");
  });

  it("sends a descriptive User-Agent so sites can identify the crawler", async () => {
    const html =
      "<html><head><title>x</title></head><body><main>" +
      "Job body text. ".repeat(40) +
      "</main></body></html>";
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: html }));
    await fetchPostingFromUrl("https://example.com/x");
    const call = vi.mocked(fetch).mock.calls[0];
    const init = call?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/HireShieldBot/);
  });

  it("passes a pinned dispatcher to fetch so DNS isn't re-resolved", async () => {
    const html =
      "<html><head><title>x</title></head><body><main>" +
      "Job body text. ".repeat(40) +
      "</main></body></html>";
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: html }));
    await fetchPostingFromUrl("https://example.com/x");
    const call = vi.mocked(fetch).mock.calls[0];
    const init = call?.[1] as RequestInit & { dispatcher?: unknown };
    expect(init.dispatcher).toBeDefined();
  });
});
