export type Severity = "info" | "low" | "medium" | "high";

export type SignalCategory =
  | "nlp"
  | "metadata"
  | "urgency"
  | "stylometry"
  | "duplicate"
  | "domain"
  | "llm"
  | "temporal";

export interface HeuristicSignal {
  label: string;
  severity: Severity;
  category: SignalCategory;
  detail: string;
  /** Positive numbers reduce trust score, negative numbers add trust */
  score?: number;
}

export interface HeuristicResult {
  signals: HeuristicSignal[];
  /** Aggregate score 0-100 derived from heuristics alone (higher = more trustworthy) */
  heuristicTrustScore: number;
  /** 0-100 probability that this is a ghost / non-real posting */
  ghostJobProbability: number;
  /** 0-100 confidence in the analysis based on input richness */
  inputConfidence: number;
}
