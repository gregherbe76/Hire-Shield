import type { HeuristicSignal } from "./types";

const URGENCY_TERMS = [
  "urgent","urgently","immediately","asap","right away","today only",
  "limited spots","limited time","hurry","apply now","start tomorrow","start today",
  "act fast","don't miss","last chance","first come first served",
];

export function urgencySignals(text: string): HeuristicSignal[] {
  const lower = text.toLowerCase();
  const hits = URGENCY_TERMS.filter((t) => lower.includes(t));
  if (hits.length === 0) return [];
  const severity: HeuristicSignal["severity"] =
    hits.length >= 3 ? "high" : hits.length >= 2 ? "medium" : "low";
  return [
    {
      label: "High-pressure urgency language",
      severity,
      category: "urgency",
      detail: `Found ${hits.length} urgency cue${hits.length > 1 ? "s" : ""}: ${hits.slice(0, 4).join(", ")}`,
      score: 4 + hits.length * 3,
    },
  ];
}
