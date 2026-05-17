import type { HeuristicResult, HeuristicSignal } from "./types";
import { suspiciousPhraseSignals } from "./suspicious-phrases";
import { urgencySignals } from "./urgency";
import { stylometrySignals } from "./stylometry";
import { metadataSignals } from "./metadata";
import { duplicateSignals } from "./duplicate";
import { temporalSignals, type PostingHistory } from "./temporal";

export interface HeuristicInput {
  jobTitle?: string;
  company?: string;
  recruiterEmail?: string;
  jobUrl?: string;
  jobDescription: string;
  corpus?: { id: string; description: string }[];
  /** Self-declared / extracted original posting date. */
  postedAt?: Date;
  /** Snapshot of prior submissions of the same fingerprint (from the DB). */
  history?: PostingHistory;
  /** Override for "now" — for deterministic tests. */
  now?: Date;
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
    ...temporalSignals({
      postedAt: input.postedAt,
      history: input.history,
      now: input.now,
    }),
  ];

  // Input richness drives confidence
  let confidence = 40;
  if (desc.length > 400) confidence += 15;
  if (desc.length > 1200) confidence += 10;
  if (input.recruiterEmail) confidence += 10;
  if (input.jobUrl) confidence += 8;
  if (input.company) confidence += 7;
  if (input.jobTitle) confidence += 5;
  if (input.postedAt) confidence += 3;
  if (input.history) confidence += 4;
  confidence = clamp(confidence, 20, 95);

  // Trust score: aggregate everything *except* temporal signals — a stale or
  // republished posting isn't fraud, it's a ghost-job pattern. Temporal flows
  // into the ghost-job probability below instead.
  const isFraudCategory = (s: HeuristicSignal) => s.category !== "temporal";
  const totalNegative = signals
    .filter((s) => isFraudCategory(s) && (s.score ?? 0) > 0)
    .reduce((a, s) => a + (s.score ?? 0), 0);
  const totalPositive = signals
    .filter((s) => isFraudCategory(s) && (s.score ?? 0) < 0)
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

  // Temporal signals push ghost probability up — that's their whole purpose.
  const temporalGhostBoost = signals
    .filter((s) => s.category === "temporal")
    .reduce((a, s) => a + (s.score ?? 0), 0);
  ghost += temporalGhostBoost;

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
