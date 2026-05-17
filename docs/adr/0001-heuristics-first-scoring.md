# ADR-0001: Heuristics-first scoring, LLM-second

- **Status:** Accepted
- **Date:** 2026-01-12
- **Deciders:** Founding team

## Context

HireShield needs to produce a trust score for arbitrary job postings. Two
broad strategies were on the table:

1. **LLM-driven scoring** — send the posting to a large language model and
   ask it to produce a score and reasoning in one call.
2. **Heuristics-driven scoring** — compute the score from deterministic
   text features (suspicious phrases, urgency markers, stylometry,
   metadata, duplicate detection) and use an LLM only for qualitative
   reasoning.

The product premise — *give candidates a transparent second opinion* —
puts auditability and reproducibility at the top of the requirements list.
We also need the system to work when the LLM is misconfigured, rate-limited,
or temporarily unavailable.

## Decision

The trust score is computed by `lib/nlp-engine` from deterministic
heuristics. The LLM contributes a **candidate-facing summary**, **0–3
qualitative signals**, and **recommended actions** — none of which feed back
into the score. The score is a pure function of the heuristic signals.

## Consequences

### Positive

- Every score is reproducible from the same input — debuggable, testable,
  unit-coverable.
- The system gracefully degrades: if the LLM fails, the report still ships
  with all numeric outputs intact.
- Costs are predictable. The LLM is one call per analysis, capped at 8192
  completion tokens.
- Forks can swap the LLM (or remove it entirely) without changing the
  scoring contract.

### Negative / trade-offs

- We give up some "smartness". The LLM can spot semantic red flags the
  heuristics miss; those become qualitative signals but don't affect the
  number.
- Heuristics require ongoing curation as scam patterns evolve.

### Neutral

- Two code paths (deterministic + LLM) need to stay in sync at the
  reporting layer — the report component handles both signal sources.

## Alternatives considered

### LLM-only scoring

Cheaper to build, but: non-reproducible scores, opaque reasoning, vendor
lock-in, and a hard dependency on a network call for every analysis.
Rejected.

### Hybrid scoring (LLM adjusts heuristic score)

We considered letting the LLM nudge the score by ±10. This was rejected
because it reintroduces non-determinism without the upside of an LLM-only
approach. The current shape — LLM as a parallel reasoner, not a scorer —
is cleaner.

## References

- `lib/nlp-engine/src/analyze.ts` — `runHeuristics`, `fraudRiskFromScore`
- `artifacts/api-server/src/lib/analyzer.ts` — fusion layer
- [Heuristics guide](../guide/heuristics)
