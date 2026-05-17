import type { HeuristicSignal } from "./types";

export interface PostingHistory {
  firstSeenAt: Date;
  lastSeenAt: Date;
  seenCount: number;
}

export interface TemporalInput {
  /** Self-declared / extracted original posting date. */
  postedAt?: Date;
  /** History of prior submissions of the same content fingerprint. */
  history?: PostingHistory;
  /** Override for "now" — used by tests for deterministic time travel. */
  now?: Date;
}

const DAY_MS = 86_400_000;

/**
 * Time-based signals that contribute to the ghost-job probability.
 *
 * These signals are *not* meant to influence the fraud trust score: a job
 * being old or republished doesn't make it a scam, it makes it a likely
 * ghost listing. The analyzer keeps the "temporal" category out of the
 * trust-score aggregate and adds it to the ghost score instead.
 */
export function temporalSignals(input: TemporalInput): HeuristicSignal[] {
  const now = input.now ?? new Date();
  const signals: HeuristicSignal[] = [];

  if (input.postedAt instanceof Date && !Number.isNaN(input.postedAt.getTime())) {
    const ageDays = Math.max(
      0,
      (now.getTime() - input.postedAt.getTime()) / DAY_MS,
    );
    const ageRounded = Math.round(ageDays);
    if (ageDays > 120) {
      signals.push({
        label: "Posting is over 4 months old",
        severity: "high",
        category: "temporal",
        detail: `First posted ${ageRounded} days ago. Listings that linger this long without being filled are a strong ghost-job indicator.`,
        score: 14,
      });
    } else if (ageDays > 60) {
      signals.push({
        label: "Posting is over 2 months old",
        severity: "medium",
        category: "temporal",
        detail: `First posted ${ageRounded} days ago. Real openings rarely stay unfilled this long.`,
        score: 8,
      });
    } else if (ageDays > 30) {
      signals.push({
        label: "Posting is over a month old",
        severity: "low",
        category: "temporal",
        detail: `First posted ${ageRounded} days ago.`,
        score: 3,
      });
    }
  }

  const history = input.history;
  if (history && history.seenCount >= 1) {
    const spanDays = Math.max(
      0,
      (history.lastSeenAt.getTime() - history.firstSeenAt.getTime()) / DAY_MS,
    );
    const dormancyDays = Math.max(
      0,
      (now.getTime() - history.lastSeenAt.getTime()) / DAY_MS,
    );
    const totalAgeDays = spanDays + dormancyDays;

    if (history.seenCount >= 2 && spanDays > 21) {
      const heavy = history.seenCount >= 4;
      signals.push({
        label: heavy
          ? "Same posting republished repeatedly"
          : "Same posting republished over time",
        severity: heavy ? "high" : "medium",
        category: "temporal",
        detail: `Identical content first seen ${Math.round(totalAgeDays)} days ago and submitted ${history.seenCount} times. Pattern often seen with ghost jobs and evergreen recruiting funnels.`,
        score: heavy ? 16 : 10,
      });
    } else if (history.seenCount >= 2) {
      signals.push({
        label: "Posting recently analyzed before",
        severity: "low",
        category: "temporal",
        detail: `Identical content has been submitted ${history.seenCount} times in the last few weeks.`,
        score: 3,
      });
    }

    if (dormancyDays > 90) {
      signals.push({
        label: "Posting reappeared after a long pause",
        severity: "medium",
        category: "temporal",
        detail: `Same content was last seen ${Math.round(dormancyDays)} days ago. Long-dormant listings that come back are often evergreen ghost ads.`,
        score: 6,
      });
    }
  }

  return signals;
}
