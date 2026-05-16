# HireShield

Open-source job-posting fraud detector. Paste a suspicious job posting; HireShield analyzes it with NLP heuristics + an LLM and returns a trust score, risk level, ghost-job probability, and detailed signals — without directly accusing the company.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, mounted at `/api`)
- `pnpm --filter @workspace/hireshield run dev` — Vite frontend (mounted at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`
- Optional env: `APIFY_TOKEN` — enables JS-rendered page scraping fallback for `/analyze` URL mode

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, wouter, TanStack Query, Tailwind, shadcn/ui, framer-motion, recharts
- API: Express 5, OpenAI SDK (via Replit AI Integrations proxy, model `gpt-5.4`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- DB schema: `lib/db/src/schema.ts` (tables: `analyses`, `waitlist`)
- API contract (source of truth): `lib/api-spec/openapi.yaml` — regenerate with codegen after changes
- NLP heuristics: `lib/nlp-engine/src/` (tokenize, tfidf, suspicious-phrases, urgency, stylometry, metadata, duplicate, analyze)
- Analyzer (heuristics + LLM fusion): `artifacts/api-server/src/lib/analyzer.ts`
- OpenAI client: `artifacts/api-server/src/lib/openai-client.ts`
- URL → posting extractor: `artifacts/api-server/src/lib/fetch-posting.ts` (simple fetch + cheerio, with Apify Website Content Crawler as JS-rendered fallback)
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/hireshield/src/pages/{home,analyze,community,analysis-permalink,not-found}.tsx`
- Report component: `artifacts/hireshield/src/components/analysis-report.tsx`
- Theme: `artifacts/hireshield/src/index.css` (dark cybersecurity palette, orange/amber accent, JetBrains Mono + Geist)

## Architecture decisions

- Heuristics-first, LLM-second: the NLP engine produces deterministic signals; the LLM only adds qualitative reasoning and a candidate summary. Trust score is computed from signals, not from the LLM.
- Never accuse: copy is framed as "trust signals" and "confidence" — we surface evidence and recommended actions, not verdicts about specific employers.
- Contract-first API: `openapi.yaml` drives both the React Query hooks (`@workspace/api-client-react`) and Zod validators. Always regen after spec changes.
- Path routing under the shared proxy: API at `/api/*`, frontend at `/`. Generated client paths must match Express route registration order (e.g. `/analyses/:id` collides with sibling literal paths, so we use `/analysis-examples` and `/community/stats`).
- OpenAI is called via the Replit AI Integrations proxy using the standard `openai` SDK with `response_format: { type: "json_object" }`, no `temperature`, `max_completion_tokens: 8192`.

## Product

- `/` — Landing: pitch, how it works, example reports.
- `/analyze` — Paste a job posting; get a full trust report (signals, ghost-job probability, candidate summary, recommended actions). Optional fields: title, company, recruiter email, job URL.
- `/analyses/:id` — Permalink to a report (shareable).
- `/community` — Aggregated telemetry: total analyses, flagged count, average trust score, ghost-job share, risk breakdown chart, top detected signals, live feed of recent analyses.

## Gotchas

- Express matches `/analyses/:id` before any sibling literal path under `/analyses/*`. Keep new endpoints under different prefixes (`/analysis-examples`, `/community/stats`) or register literals before the param route.
- After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` — the frontend imports operation paths from the generated client.
- Frontend imports from `@workspace/api-client-react` (the package root), never from `@workspace/api-client-react/src/generated/api` — Orval output paths are not exported as subpath specifiers.
- Do not pass `temperature` to `gpt-5.4`; use `max_completion_tokens`, not `max_tokens`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
