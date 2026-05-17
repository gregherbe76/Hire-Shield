import { describe, expect, it } from "vitest";
import { fraudRiskFromScore, runHeuristics } from "./analyze";

const LEGIT_POSTING = `
Senior Backend Engineer — Payments Platform

We are hiring a senior backend engineer to join our payments platform team.
You will design and maintain reliable distributed services that process millions
of transactions every day. Our interview process includes a take-home, a system
design discussion, and two technical conversations with the team.

Salary range: $170,000 – $210,000 USD depending on experience.
Benefits include health, dental, vision, 401k matching, and generous PTO.
We are an equal opportunity employer and welcome candidates from all backgrounds.

Apply through our careers site and our recruiting team will follow up within
five business days. Application deadline: Q2 2026.
`.trim();

const SCAM_POSTING = `
URGENT HIRE! Work from home — easy money, guaranteed income!
No experience necessary. Earn $5,000 per week from your phone.
Send your resume on WhatsApp to start tomorrow. Apply now, limited spots!
You must pay a fee for your starter kit before we can begin.
Bitcoin payments accepted!!! Hurry, last chance!
`.trim();

describe("runHeuristics", () => {
  it("gives a legitimate posting a high trust score", () => {
    const result = runHeuristics({
      jobTitle: "Senior Backend Engineer",
      company: "Stripe",
      recruiterEmail: "talent@stripe.com",
      jobUrl: "https://stripe.com/jobs/123",
      jobDescription: LEGIT_POSTING,
    });
    expect(result.heuristicTrustScore).toBeGreaterThanOrEqual(70);
    expect(result.ghostJobProbability).toBeLessThan(50);
    expect(result.inputConfidence).toBeGreaterThan(70);
  });

  it("gives a clear scam posting a low trust score", () => {
    const result = runHeuristics({
      jobTitle: "Remote Worker",
      recruiterEmail: "hr@mailinator.com",
      jobDescription: SCAM_POSTING,
    });
    expect(result.heuristicTrustScore).toBeLessThan(40);
    expect(result.signals.length).toBeGreaterThan(5);
    expect(
      result.signals.some((s) => s.label === "Upfront fee or deposit"),
    ).toBe(true);
  });

  it("flags vague always-hiring postings as likely ghost jobs", () => {
    const result = runHeuristics({
      jobDescription:
        "We are always hiring on a rolling basis for our talent pool. " +
        "Send us your CV and we will reach out for future opportunities.",
    });
    expect(result.ghostJobProbability).toBeGreaterThan(60);
  });

  it("clamps trust score between 1 and 99", () => {
    const result = runHeuristics({ jobDescription: "x" });
    expect(result.heuristicTrustScore).toBeGreaterThanOrEqual(1);
    expect(result.heuristicTrustScore).toBeLessThanOrEqual(99);
  });
});

describe("fraudRiskFromScore", () => {
  it("maps score bands to risk levels", () => {
    expect(fraudRiskFromScore(90)).toBe("low");
    expect(fraudRiskFromScore(75)).toBe("low");
    expect(fraudRiskFromScore(60)).toBe("medium");
    expect(fraudRiskFromScore(40)).toBe("high");
    expect(fraudRiskFromScore(20)).toBe("critical");
  });
});
