# Heuristics

The NLP engine lives in `lib/nlp-engine/` and is the deterministic core of
HireShield. Every heuristic is a pure function: same input, same output, no
network calls.

Every signal carries:

- A **kind** (one of the heuristic names below)
- A **severity** — `info`, `low`, `medium`, or `high`
- A **score impact** that contributes to the final trust score
- A **detail** string surfaced to the candidate

## The six heuristics

### 1. Suspicious phrases (`suspicious-phrases.ts`)

A curated list of red-flag phrases common in recruitment scams:

- *"work from home, no experience needed"*
- *"send your bank details for direct deposit setup"*
- *"buy your own equipment, we'll reimburse"*
- *"complete this WhatsApp screening interview"*

Matched case-insensitively against tokenized text. Each match contributes
to the score weighted by its category (financial, identity, off-channel).

### 2. Urgency language (`urgency.ts`)

Pressure tactics — *"start tomorrow"*, *"limited spots"*, *"respond within
24 hours"*. Real recruiters rarely use closing-language; scammers
disproportionately do.

Implemented as a small lexicon with per-phrase weights and a saturation
cap so a single posting full of urgency words doesn't dominate.

### 3. Stylometry (`stylometry.ts`)

Statistical text features that differentiate human-written postings from
template-spam or LLM-generated filler:

- Sentence length variance
- Type-token ratio (vocabulary diversity)
- Punctuation rate
- All-caps token density

Outputs a stylometry score; extremes in either direction (too uniform,
too chaotic) raise severity.

### 4. Metadata (`metadata.ts`)

Validates structured fields when present:

- **Recruiter email** — free webmail providers, lookalike domains,
  mismatched display name vs. address
- **Job URL** — IP-literal hostnames, very new TLDs, redirect chains
- **Company** — empty or single-character entries

### 5. Duplicate detection (`duplicate.ts`, `tfidf.ts`)

TF-IDF similarity against the recent corpus of analyzed postings. Near-
duplicates raise a signal: scammers re-post the same template with small
substitutions; legitimate companies repost too, but rarely with identical
phrasing.

The corpus is bounded (most-recent N) to keep similarity computation
fast and ensure the heuristic adapts to current patterns.

### 6. Ghost-job probability

A separate score from the trust score. Combines:

- Vagueness — generic responsibilities, no concrete tech stack
- Staleness — when posting metadata suggests an old listing
- Repost frequency — derived from duplicate detection

A high ghost-job probability with a *high* trust score is the most
common pattern: the listing isn't a scam, but the role likely isn't real.

## How signals combine

```
trustScore = clamp(
  100
  - sum(signal.scoreImpact for each signal)
  - llmFlaggedAdjustment,
  0,
  100
)
```

Then mapped to a risk level:

| Score | Risk level |
|-------|------------|
| 80–100 | `low` |
| 60–79 | `medium` |
| 30–59 | `high` |
| 0–29 | `critical` |

The mapping is deterministic and lives in `lib/nlp-engine/src/analyze.ts`
(see `fraudRiskFromScore`).

## What the LLM does (and doesn't)

The LLM **does**:

- Read the posting and the heuristic signals
- Write a candidate-facing summary
- Add 0–3 qualitative signals (tagged as LLM-generated)
- Suggest recommended actions

The LLM **does not**:

- Set or modify the trust score
- Override a heuristic-detected signal
- Make claims about specific employers

This separation is intentional: it makes the scoring auditable and
keeps the system useful even if the LLM is misconfigured or offline.
