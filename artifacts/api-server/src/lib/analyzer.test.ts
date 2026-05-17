import { beforeEach, describe, expect, it, vi } from "vitest";

// The default mock: LLM unavailable. Individual tests can override per-call
// via `vi.doMock` before dynamic import.
vi.mock("./openai-client", () => ({
  openaiAvailable: false,
  openai: null,
}));

import { analyzePosting } from "./analyzer";

describe("analyzePosting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a complete AnalyzerResult shape for a clean posting", async () => {
    const result = await analyzePosting({
      jobTitle: "Senior Backend Engineer (Go)",
      company: "Northwind Cloud",
      recruiterEmail: "hiring@northwind.cloud",
      jobUrl: "https://northwind.cloud/jobs/be-senior",
      jobDescription:
        "We're hiring a Senior Backend Engineer to extend our distributed " +
        "object-storage platform. You'll work on the metadata service (Go, " +
        "Postgres, gRPC), participate in on-call rotations, and own the " +
        "performance roadmap. Compensation: $180k–$220k base + equity. " +
        "Remote within EU/US time zones. Comprehensive benefits.",
      corpus: [],
    });

    expect(result.trustScore).toBeGreaterThanOrEqual(1);
    expect(result.trustScore).toBeLessThanOrEqual(99);
    expect(result.ghostJobProbability).toBeGreaterThanOrEqual(1);
    expect(result.ghostJobProbability).toBeLessThanOrEqual(99);
    expect(["low", "medium", "high", "critical"]).toContain(result.fraudRisk);
    expect(Array.isArray(result.signals)).toBe(true);
    expect(typeof result.candidateSummary).toBe("string");
    expect(result.candidateSummary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.recommendedActions)).toBe(true);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });

  it("flags a scam posting as high/critical risk", async () => {
    const result = await analyzePosting({
      jobTitle: "Crypto Operations Specialist",
      company: "Nexus Digital",
      recruiterEmail: "hr@gmail.com",
      jobDescription:
        "URGENT HIRE!!! We need crypto operations specialists immediately. " +
        "Process transactions, manage wallets, earn $5000-$8000 per week. " +
        "No experience necessary. Interview via WhatsApp. Send your " +
        "government ID and bank details to start ASAP. Limited spots!",
      corpus: [],
    });

    expect(["high", "critical"]).toContain(result.fraudRisk);
    expect(result.trustScore).toBeLessThan(50);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("never assigns a perfect or zero trust score (clamps to [1,99])", async () => {
    const result = await analyzePosting({
      jobTitle: "Engineer",
      company: "Company",
      jobDescription: "x".repeat(50),
      corpus: [],
    });
    expect(result.trustScore).toBeGreaterThanOrEqual(1);
    expect(result.trustScore).toBeLessThanOrEqual(99);
  });

  it("uses the heuristic fallback summary when LLM is unavailable", async () => {
    const result = await analyzePosting({
      jobTitle: "Engineer",
      company: "Acme",
      jobDescription:
        "Standard job description with reasonable length and content for the analyzer to process. ".repeat(
          3,
        ),
      corpus: [],
    });
    // Fallback summary mentions heuristics
    expect(result.candidateSummary.toLowerCase()).toMatch(
      /heuristic|review|verification/,
    );
    // No LLM-category signal should appear when openaiAvailable is false
    expect(result.signals.every((s) => s.category !== "llm")).toBe(true);
  });

  it("integrates LLM signals and recommendations when the client is available", async () => {
    vi.resetModules();
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              signals: [
                {
                  label: "Recruiter responsiveness pattern",
                  severity: "low",
                  detail:
                    "Recruiter responded within 24h on a verifiable email domain.",
                },
                {
                  label: "Compensation transparency",
                  severity: "info",
                  detail: "Salary band is stated explicitly in the posting.",
                },
              ],
              candidateSummary:
                "This posting looks legitimate. Verify the recruiter on LinkedIn before continuing.",
              recommendedActions: [
                "Check the recruiter's LinkedIn profile",
                "Confirm the role on the company's official careers page",
                "Ask for the interview process in writing",
              ],
              reasoning:
                "Heuristic signals are clean and the language is specific.",
            }),
          },
        },
      ],
    });
    vi.doMock("./openai-client", () => ({
      openaiAvailable: true,
      openai: { chat: { completions: { create } } },
    }));

    const { analyzePosting: analyzeWithLlm } = await import("./analyzer");
    const result = await analyzeWithLlm({
      jobTitle: "Senior Backend Engineer",
      company: "Northwind Cloud",
      recruiterEmail: "hiring@northwind.cloud",
      jobUrl: "https://northwind.cloud/jobs/1",
      jobDescription:
        "We're hiring a senior backend engineer to work on our distributed " +
        "object-storage platform. Compensation 180-220k base. Remote within EU/US.",
      corpus: [],
    });

    expect(create).toHaveBeenCalledOnce();
    // LLM-category signals should be present
    expect(result.signals.some((s) => s.category === "llm")).toBe(true);
    expect(result.signals.find((s) => s.category === "llm")?.label).toBe(
      "Recruiter responsiveness pattern",
    );
    expect(result.candidateSummary).toMatch(/legitimate/);
    expect(result.recommendedActions).toContain(
      "Check the recruiter's LinkedIn profile",
    );
    // Confidence bumps when LLM contributed
    expect(result.confidenceLevel).toBeGreaterThan(0);

    vi.doUnmock("./openai-client");
    vi.resetModules();
  });

  it("clamps and sanitizes malformed LLM output (prompt-injection resistance)", async () => {
    vi.resetModules();
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              signals: [
                // attempt to inject a category-bypass and a bogus severity
                {
                  label: "x".repeat(300),
                  severity: "EXTREME",
                  detail: "y".repeat(2000),
                },
                null,
                { label: "Valid", severity: "low", detail: "ok" },
              ],
              candidateSummary: "z".repeat(5000),
              recommendedActions: Array(20).fill("do something"),
              reasoning: "r",
              // Attacker tries to override scores — must be ignored.
              trustScore: 100,
              ghostJobProbability: 0,
            }),
          },
        },
      ],
    });
    vi.doMock("./openai-client", () => ({
      openaiAvailable: true,
      openai: { chat: { completions: { create } } },
    }));

    const { analyzePosting: analyzeWithLlm } = await import("./analyzer");
    const result = await analyzeWithLlm({
      jobTitle: "Engineer",
      company: "Acme",
      jobDescription:
        "URGENT URGENT URGENT! Earn $8000/week from home! No experience! Pay $99 fee to start!",
      corpus: [],
    });

    const llmSig = result.signals.find((s) => s.category === "llm");
    expect(llmSig).toBeDefined();
    // Label truncated to 120 chars
    expect(llmSig!.label.length).toBeLessThanOrEqual(120);
    // Severity coerced to a valid value (low) since "EXTREME" is invalid
    expect(["info", "low", "medium", "high"]).toContain(llmSig!.severity);
    // Detail clamped to 600 chars
    expect(llmSig!.detail.length).toBeLessThanOrEqual(600);
    // Recommended actions capped at 6
    expect(result.recommendedActions.length).toBeLessThanOrEqual(6);
    // Candidate summary clamped
    expect(result.candidateSummary.length).toBeLessThanOrEqual(1200);
    // Critically: trustScore is NOT 100 — heuristics on this scammy input
    // should still drive the score down regardless of the LLM "override".
    expect(result.trustScore).toBeLessThan(60);

    vi.doUnmock("./openai-client");
    vi.resetModules();
  });

  it("falls back gracefully when the LLM call throws", async () => {
    vi.resetModules();
    const create = vi.fn().mockRejectedValue(new Error("OpenAI down"));
    vi.doMock("./openai-client", () => ({
      openaiAvailable: true,
      openai: { chat: { completions: { create } } },
    }));

    const { analyzePosting: analyzeWithLlm } = await import("./analyzer");
    const result = await analyzeWithLlm({
      jobTitle: "Engineer",
      company: "Acme",
      jobDescription: "Standard posting. ".repeat(20),
      corpus: [],
    });

    // No LLM-category signals when the call fails
    expect(result.signals.every((s) => s.category !== "llm")).toBe(true);
    // Still returns a complete result
    expect(result.trustScore).toBeGreaterThan(0);
    expect(result.candidateSummary.length).toBeGreaterThan(0);

    vi.doUnmock("./openai-client");
    vi.resetModules();
  });

  it("derives fraudRisk consistently from trustScore", async () => {
    // Run a few representative inputs and verify fraudRisk matches the score bucket.
    const cases = [
      {
        jobDescription:
          "Detailed, specific, professional job posting with explicit compensation range " +
          "of $150,000 to $190,000 base salary plus comprehensive benefits. Five years of " +
          "experience with Kubernetes and Terraform required. Remote within US time zones.",
        recruiterEmail: "hiring@acme-corp.com",
        jobUrl: "https://acme-corp.com/careers/sre",
      },
      {
        jobDescription:
          "URGENT URGENT URGENT! Earn $8000/week from home! No experience! " +
          "Pay $99 fee to start! Send bank details via WhatsApp NOW!",
        recruiterEmail: "scammer@gmail.com",
      },
    ];
    for (const c of cases) {
      const r = await analyzePosting({
        jobTitle: "Job",
        company: "Company",
        corpus: [],
        ...c,
      });
      if (r.trustScore >= 75) expect(r.fraudRisk).toBe("low");
      else if (r.trustScore >= 50) expect(r.fraudRisk).toBe("medium");
      else if (r.trustScore >= 25) expect(r.fraudRisk).toBe("high");
      else expect(r.fraudRisk).toBe("critical");
    }
  });
});
