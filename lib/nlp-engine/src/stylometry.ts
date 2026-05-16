import type { HeuristicSignal } from "./types";
import { sentences, tokenize } from "./tokenize";

export function stylometrySignals(text: string): HeuristicSignal[] {
  const signals: HeuristicSignal[] = [];
  const tokens = tokenize(text);
  const sents = sentences(text);
  if (tokens.length === 0 || sents.length === 0) return signals;

  // ALL CAPS bursts
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  if (capsWords >= 4) {
    signals.push({
      label: "Excessive ALL-CAPS",
      severity: capsWords >= 8 ? "high" : "medium",
      category: "stylometry",
      detail: `${capsWords} fully capitalized words — common in low-effort scam templates.`,
      score: Math.min(15, 4 + capsWords),
    });
  }

  // Exclamation density
  const excl = (text.match(/!/g) ?? []).length;
  if (excl >= 5) {
    signals.push({
      label: "Exclamation overload",
      severity: excl >= 10 ? "high" : "medium",
      category: "stylometry",
      detail: `${excl} exclamation marks in ${sents.length} sentences.`,
      score: Math.min(10, excl),
    });
  }

  // Sentence length variance — scam templates are short and repetitive
  const lengths = sents.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (sents.length >= 4 && mean < 7) {
    signals.push({
      label: "Choppy short sentences",
      severity: "low",
      category: "stylometry",
      detail: `Average sentence length is ${mean.toFixed(1)} words.`,
      score: 4,
    });
  }

  // Unique-word ratio
  const unique = new Set(tokens).size;
  const ratio = unique / tokens.length;
  if (tokens.length > 60 && ratio < 0.35) {
    signals.push({
      label: "Low vocabulary diversity",
      severity: "low",
      category: "stylometry",
      detail: `Only ${(ratio * 100).toFixed(0)}% of words are unique — possible copy-paste template.`,
      score: 5,
    });
  }

  // Trust signal — well-structured posts
  if (
    tokens.length > 120 &&
    ratio > 0.55 &&
    excl < 3 &&
    capsWords < 3 &&
    sents.length >= 6
  ) {
    signals.push({
      label: "Well-structured writing",
      severity: "info",
      category: "stylometry",
      detail: "Length, vocabulary, and tone are consistent with a legitimate posting.",
      score: -6,
    });
  }

  return signals;
}
