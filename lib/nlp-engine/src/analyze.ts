import type { HeuristicResult, HeuristicSignal } from "./types";
import { suspiciousPhraseSignals } from "./suspicious-phrases";
import { urgencySignals } from "./urgency";
import { stylometrySignals } from "./stylometry";
import { metadataSignals } from "./metadata";
import { duplicateSignals } from "./duplicate";

export interface HeuristicInput {
  jobTitle?: string;
  company?: string;
  recruiterEmail?: string;
  jobUrl?: string;
  jobDescription: string;
  corpus?: { id: string; description: string }[];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function runHeuristics(input: HeuristicInput): HeuristicResult {
  const desc = input.jobDescription;
  const signals: HeuristicSignal[] = [
    ...suspiciousPhraseSignals(desc),
    ...urgencySignals(desc),
    ...stylometrySignals(desc),
    ...metadataSignals({
      recruiterEmail: input.recruiterEmail,
      jobUrl: input.jobUrl,
      company: input.company,
    }),
    ...duplicateSignals(desc, input.corpus ?? []),
  ];

  // Input richness drives confidence
  let confidence = 40;
  if (desc.length > 400) confidence += 15;
  if (desc.length > 1200) confidence += 10;
  if (input.recruiterEmail) confidence += 10;
  if (input.jobUrl) confidence += 8;
  if (input.company) confidence += 7;
  if (input.jobTitle) confidence += 5;
  confidence = clamp(confidence, 20, 95);

  // Aggregate weighted scores
  const totalNegative = signals
    .filter((s) => (s.score ?? 0) > 0)
    .reduce((a, s) => a + (s.score ?? 0), 0);
  const totalPositive = signals
    .filter((s) => (s.score ?? 0) < 0)
    .reduce((a, s) => a + -(s.score ?? 0), 0);

  const baseline = 78;
  const heuristicTrustScore = clamp(
    Math.round(baseline - totalNegative + totalPositive * 0.6),
    1,
    99,
  );

  // Ghost-job heuristic: vague responsibilities, no salary, no benefits, no contact
  let ghost = 15;
  const lower = desc.toLowerCase();
  if (!/(\$|salary|compensation|usd|eur|gbp|inr|cad|aud)/i.test(desc)) ghost += 15;
  if (!/(benefits|health|dental|pto|401k|vacation|insurance)/i.test(lower)) ghost += 10;
  if (!input.recruiterEmail) ghost += 12;
  if (!input.jobUrl) ghost += 8;
  if (desc.length < 400) ghost += 18;
  if (/(rolling basis|always hiring|ongoing|evergreen|talent pool|future opportunities)/i.test(lower))
    ghost += 22;
  if (/(specific|deadline|by [a-z]+ \d+|q[1-4] \d{4})/i.test(lower)) ghost -= 12;
  if (input.recruiterEmail && /(salary|compensation) range/i.test(desc)) ghost -= 10;
  ghost = clamp(ghost, 2, 98);

  return {
    signals,
    heuristicTrustScore,
    ghostJobProbability: ghost,
    inputConfidence: confidence,
  };
}

export function fraudRiskFromScore(
  score: number,
): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  if (score >= 35) return "high";
  return "critical";
}
