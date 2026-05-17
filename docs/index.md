---
layout: home
title: HireShield
titleTemplate: Open-source job posting trust intelligence

hero:
  name: HireShield
  text: Don't get scammed by a job listing.
  tagline: Open-source trust intelligence for job postings — deterministic NLP heuristics fused with an LLM, never an accusation.
  image:
    src: /logo.svg
    alt: HireShield
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/gh63/hireshield
    - theme: alt
      text: Live demo
      link: https://hire-shield.replit.app

features:
  - icon: 🛡️
    title: Heuristics-first
    details: A deterministic NLP engine scores urgency language, stylometry anomalies, suspicious phrases, recruiter metadata, and duplicate-posting patterns. The LLM adds reasoning — it does not set the score.
  - icon: 🤖
    title: LLM-augmented
    details: A configurable OpenAI-compatible model (default `gpt-5.4` via the Replit AI Integrations proxy) produces a candidate-facing summary and qualitative signals. Strict JSON output, no temperature, capped tokens.
  - icon: 👻
    title: Ghost-job probability
    details: A separate probability score for legitimate-looking postings that companies likely have no real intent to fill, computed from staleness, vagueness, and posting-frequency signals.
  - icon: 🧭
    title: Never accuses
    details: Copy is framed as "trust signals" and "confidence" — HireShield surfaces evidence and recommended actions for candidates, not verdicts about specific employers.
  - icon: 🔌
    title: Contract-first API
    details: A single OpenAPI spec drives both the React Query hooks and Zod validators. Codegen keeps frontend and backend in lockstep.
  - icon: 🐳
    title: One-command setup
    details: <code>docker compose up</code> brings up Postgres, runs the migrations, and serves the app on a single port.
---

<style>
.VPHome .vp-doc a {
  text-decoration: none;
}
</style>

## Quick start

```bash
git clone https://github.com/gh63/hireshield.git
cd hireshield
cp .env.example .env   # fill in AI_INTEGRATIONS_OPENAI_*
docker compose up --build
# → http://localhost:8080
```

## What you get

| | |
|---|---|
| **Trust score** | 0–100, computed from deterministic signals |
| **Risk level** | `low` · `medium` · `high` · `critical` |
| **Ghost-job probability** | 0–100 — likelihood the role exists in name only |
| **Detected signals** | Categorized with severity + plain-language detail |
| **Candidate summary** | LLM-generated, framed for the applicant |
| **Recommended actions** | What to verify before applying |

## Why this exists

Job-posting fraud is a billion-dollar problem: fake recruiters harvesting personal data,
"ghost jobs" companies never intend to fill, listings reposted endlessly to inflate metrics.
Existing tools are closed-source, opinionated, and often label entire employers as scams.

HireShield takes a different approach: **show the evidence**, let the candidate decide.
Every signal is auditable. The scoring function is open. The LLM is replaceable.
