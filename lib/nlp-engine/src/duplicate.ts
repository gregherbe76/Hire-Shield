import type { HeuristicSignal } from "./types";
import { similarity } from "./tfidf";

export function duplicateSignals(
  description: string,
  corpus: { id: string; description: string }[],
): HeuristicSignal[] {
  if (corpus.length === 0) return [];
  let best = { id: "", score: 0 };
  for (const item of corpus) {
    const s = similarity(description, item.description);
    if (s > best.score) best = { id: item.id, score: s };
  }
  if (best.score >= 0.85) {
    return [
      {
        label: "Near-duplicate of known posting",
        severity: "high",
        category: "duplicate",
        detail: `${(best.score * 100).toFixed(0)}% similarity to a previously analyzed listing — common scam-template behavior.`,
        score: 18,
      },
    ];
  }
  if (best.score >= 0.7) {
    return [
      {
        label: "Heavy template reuse",
        severity: "medium",
        category: "duplicate",
        detail: `${(best.score * 100).toFixed(0)}% similarity to another posting in our corpus.`,
        score: 10,
      },
    ];
  }
  if (best.score >= 0.5) {
    return [
      {
        label: "Partial template overlap",
        severity: "low",
        category: "duplicate",
        detail: `${(best.score * 100).toFixed(0)}% similarity to another posting — minor template reuse.`,
        score: 4,
      },
    ];
  }
  return [];
}
