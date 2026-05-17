# Architecture

HireShield is a pnpm monorepo with three deployable artifacts and three shared
libraries.

## High-level flow

```
                          ┌──────────────────────────┐
  Job posting (URL/text)  │      /analyze (React)    │
  ───────────────────────►│                          │
                          └────────────┬─────────────┘
                                       │ POST /api/analyses
                                       ▼
              ┌──────────────────────────────────────────┐
              │  Express API — artifacts/api-server      │
              │                                          │
              │  ┌────────────────────────────────────┐  │
              │  │ fetch-posting (URL → text)         │  │
              │  │  · fetch + cheerio (static HTML)   │  │
              │  │  · Apify fallback (JS-rendered)    │  │
              │  └────────────────┬───────────────────┘  │
              │                   ▼                      │
              │  ┌────────────────────────────────────┐  │
              │  │ runHeuristics (deterministic)      │  │
              │  │   lib/nlp-engine                   │  │
              │  └────────────────┬───────────────────┘  │
              │                   ▼                      │
              │  ┌────────────────────────────────────┐  │
              │  │ LLM (gpt-5.4) — qualitative only   │  │
              │  └────────────────┬───────────────────┘  │
              │                   ▼                      │
              │  ┌────────────────────────────────────┐  │
              │  │ Trust score = f(signals) only      │  │
              │  └────────────────┬───────────────────┘  │
              └───────────────────┼──────────────────────┘
                                  │
                                  ▼
                        Postgres (analyses)
```

## Repo layout

```
hireshield/
├── artifacts/
│   ├── api-server/     # Express 5 API, mounted at /api
│   ├── hireshield/     # React 19 + Vite frontend
│   └── mockup-sandbox/ # Component preview server (dev only)
├── lib/
│   ├── api-spec/       # OpenAPI source of truth + Orval codegen
│   ├── api-client-react/  # generated React Query hooks
│   ├── api-zod/        # generated Zod validators
│   ├── db/             # Drizzle schema + migrations
│   └── nlp-engine/     # tokenize, tfidf, suspicious-phrases, urgency, ...
└── scripts/            # Workspace utility scripts
```

## Design principles

### 1. Heuristics-first, LLM-second

The trust score is **deterministic** — it's a pure function of signals
produced by `lib/nlp-engine`. The LLM only contributes:

- A natural-language **candidate summary**
- Qualitative **signals** (clearly labeled as LLM-generated)
- **Recommended actions**

If the LLM is unreachable, the analysis still works — only the qualitative
fields are dropped.

### 2. Never accuse

UI copy uses the language of *evidence* and *confidence*. We surface signals
and explain how to verify them. We do **not** label specific employers as
scams. This is a deliberate product choice that affects copy, severity
labels, and the structure of recommended actions.

### 3. Contract-first API

`lib/api-spec/openapi.yaml` is the single source of truth. After every
change, run codegen:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:

- `lib/api-client-react/` — React Query hooks (Orval output)
- `lib/api-zod/` — Zod validators

Both frontend and backend import from these generated packages.

### 4. Path-routed under a shared proxy

In development, all traffic flows through `localhost:80`:

- `/api/*` → Express
- `/*`     → Vite

In production (Docker), Express serves both: API routes under `/api/*`, the
built React bundle for everything else.

## Data model

Two tables:

- **`analyses`** — every analysis is persisted with its full signal set,
  scores, and the original input. Used by the live community feed.
- **`waitlist`** — optional email capture, used by `/community`.

Schema lives in `lib/db/src/schema.ts`. Push with:

```bash
pnpm --filter @workspace/db run push
```

## Where to look

| What | Where |
|------|-------|
| OpenAPI contract | `lib/api-spec/openapi.yaml` |
| Heuristics | `lib/nlp-engine/src/` |
| LLM fusion | `artifacts/api-server/src/lib/analyzer.ts` |
| URL → text | `artifacts/api-server/src/lib/fetch-posting.ts` |
| API routes | `artifacts/api-server/src/routes/` |
| Frontend pages | `artifacts/hireshield/src/pages/` |
| Report component | `artifacts/hireshield/src/components/analysis-report.tsx` |
