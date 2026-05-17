# ADR-0002: Never accuse specific employers

- **Status:** Accepted
- **Date:** 2026-01-18
- **Deciders:** Founding team

## Context

A fraud-detection tool that names companies makes two implicit promises it
cannot keep:

1. That the model is right.
2. That the model is *fair* — i.e. that two postings with the same signals
   receive the same verdict.

Both are demonstrably false in any heuristics-based system. Beyond the
quality argument, there is real legal exposure (defamation, tortious
interference) in publishing "Acme Corp is a scammer" based on a statistical
signal.

We need a framing that lets us be useful without making claims about
specific employers.

## Decision

All user-facing copy — UI strings, LLM prompts, README, documentation —
frames findings as **trust signals**, **confidence levels**, and
**recommended actions**. The system never outputs a verdict on a company.
Signals describe patterns ("this phrase is common in recruitment scams"),
not actors ("this company is a scammer").

Specifically:

- Severity labels are `info` / `low` / `medium` / `high`, never `scam` /
  `fraud` / `fake`.
- Risk levels are `low` / `medium` / `high` / `critical` — describing the
  *posting*, not the *poster*.
- Recommended actions are framed as candidate-side verification steps:
  *"Verify the recruiter's email matches the company's domain"*, not
  *"Avoid this company"*.
- The LLM system prompt forbids naming companies or making accusations.

## Consequences

### Positive

- Legally defensible. We publish observations about text, not judgments
  about entities.
- Aligns with the product's actual capability — heuristics detect
  patterns, not intent.
- Forces clearer copy. "This posting uses urgent language" is more useful
  to a candidate than "This is a scam".

### Negative / trade-offs

- Less satisfying for users who want a yes/no verdict. We mitigate this
  with strong recommended actions and ghost-job probability.
- Requires constant copy review when new heuristics ship. Easy to slip
  into accusation language under pressure.

### Neutral

- Sets up the project for future features (employer self-claim,
  evidence-based dispute) that depend on neutral framing.

## Alternatives considered

### Verdict mode with disclaimers

"This posting is likely a scam. *Not legal advice.*" Rejected — disclaimers
don't undo the framing damage, and the verdict is wrong often enough that
publishing it harms candidates and employers.

### Allowlist of "safe" verdicts

Only output verdicts when confidence > 95%. Rejected — the heuristic
confidence isn't calibrated to a probability, and the failure mode (a
false-positive verdict on a real company) is severe.

## References

- [Heuristics guide](../guide/heuristics) — see "What the LLM does (and
  doesn't)"
- LLM prompt: `artifacts/api-server/src/lib/analyzer.ts`
