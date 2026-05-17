import { describe, expect, it } from "vitest";
import { suspiciousPhraseSignals } from "./suspicious-phrases";

describe("suspiciousPhraseSignals", () => {
  it("detects upfront-fee scams as high severity", () => {
    const out = suspiciousPhraseSignals(
      "You must pay a processing fee before we send your starter kit.",
    );
    const upfront = out.find((s) => s.label === "Upfront fee or deposit");
    expect(upfront).toBeDefined();
    expect(upfront!.severity).toBe("high");
    expect(upfront!.score).toBeGreaterThanOrEqual(20);
  });

  it("detects off-platform contact requests", () => {
    const out = suspiciousPhraseSignals(
      "Send your resume via WhatsApp to discuss next steps.",
    );
    expect(out.some((s) => s.label === "Off-platform contact requested")).toBe(
      true,
    );
  });

  it("rewards trust signals with negative scores", () => {
    const out = suspiciousPhraseSignals(
      "Salary range: $120k-$150k. Benefits include health, dental, and 401k. " +
        "We follow a structured interview process and are an equal opportunity employer.",
    );
    const trust = out.filter((s) => (s.score ?? 0) < 0);
    expect(trust.length).toBeGreaterThanOrEqual(3);
  });

  it("returns nothing for an empty string", () => {
    expect(suspiciousPhraseSignals("")).toEqual([]);
  });
});
