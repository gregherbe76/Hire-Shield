# Contributing to HireShield

Thanks for your interest in making HireShield better. This document covers everything you need to get a working dev environment, the conventions we follow, and how to ship a PR that gets merged quickly.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior by opening a private security advisory or emailing the maintainers.

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/hireshield.git
cd hireshield
pnpm install
cp .env.example .env   # then fill in DATABASE_URL + AI_INTEGRATIONS_OPENAI_*
pnpm --filter @workspace/db run push
```

Run the API and frontend in separate terminals:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/hireshield run dev
```

## Project conventions

- **pnpm only.** A `preinstall` hook will reject npm or yarn.
- **TypeScript strict everywhere.** No `any` without a comment justifying it.
- **No `console.log` in server code.** Use `req.log` in route handlers and the singleton `logger` for non-request code.
- **Contract-first API.** Edit `lib/api-spec/openapi.yaml` first, then regenerate:
  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```
  Both the React Query hooks (`@workspace/api-client-react`) and the Zod validators come from this spec.
- **Never accuse.** Any new heuristic or copy must frame findings as *signals* and *confidence* — never as a verdict about a specific company.
- **Heuristics produce the score, the LLM does not.** Keep the trust-score math in `lib/nlp-engine` deterministic and unit-testable.
- **Imports.** Frontend imports from `@workspace/api-client-react` (the package root), never from `@workspace/api-client-react/src/generated/...`.
- **Express route order.** `/analyses/:id` matches before any sibling literal under `/analyses/*`. New endpoints go under a different prefix (e.g. `/analysis-examples`, `/community/stats`).
- **OpenAI calls.** Use `max_completion_tokens`, not `max_tokens`. Do not pass `temperature` to `gpt-5.4`.

## Workflow

1. Fork & branch from `main`. Branch names: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
2. Make your change. Keep PRs small and focused.
3. Run `pnpm run typecheck` — it must pass.
4. If you changed `openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` and commit the generated files.
5. Update `replit.md` if you changed architecture, env vars, or where things live.
6. Open a PR using the template. Link any related issue.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). The commit prefix drives our automated release process via [release-please](https://github.com/googleapis/release-please) — it scans merged commits and opens a release PR with the right version bump and changelog entries.

```
feat(nlp): add stylometry signal for excessive emoji density     → minor bump
fix(api): collapse duplicate /analyses route registration        → patch bump
feat(api)!: change /analyses response shape                      → major bump
docs(readme): clarify Apify fallback behaviour                   → no release
chore(deps): bump drizzle-orm to 0.31.0                          → no release
```

Recognized types: `feat`, `fix`, `perf`, `refactor`, `docs`, `build`, `ci`, `chore`, `test`, `style`. Append `!` after the type or include a `BREAKING CHANGE:` footer for major bumps.

Scope is optional but encouraged: `nlp`, `api`, `web`, `db`, `docs`, `deps`.

## Releasing

Releases are automated. Every push to `main` triggers the `Release Please` workflow:

1. It opens (or updates) a release PR containing the next version, an updated `CHANGELOG.md`, and a manifest bump.
2. When a maintainer merges that PR, the workflow tags `main` and creates a GitHub Release.

No manual tagging needed. There's no public package on npm — HireShield is deployed as a hosted app, and forks are expected to deploy their own.

## Getting credit

This project follows the [all-contributors](https://allcontributors.org/) specification. Any kind of contribution counts — code, docs, design, ideas, bug reports, reviews. To add yourself (or someone else), comment on any issue or PR:

```
@all-contributors please add @your-handle for code, doc
```

Valid types are listed in the [emoji key](https://allcontributors.org/docs/en/emoji-key). The bot will open a PR updating the README.

## Demo data

When running locally, you can populate the database with ~20 realistic example analyses (a mix of low-risk, medium-risk, and known scam patterns) so the `/community` page has real content while you develop:

```bash
docker compose --profile demo up seed
# or, without Docker:
pnpm --filter @workspace/scripts run seed:demo
```

The script is idempotent. Pass `FORCE_RESEED=1` to wipe prior seeded rows and reinsert.

## Documentation

The docs site (built with [VitePress](https://vitepress.dev/)) lives in `docs/` and is published to GitHub Pages at <https://gh63.github.io/hireshield/>. It's a standalone pnpm package — install separately:

```bash
cd docs
pnpm install
pnpm run dev
```

When you change behaviour or add a heuristic, please update the relevant guide page in the same PR.

## Reporting bugs

Open a [bug report](.github/ISSUE_TEMPLATE/bug_report.yml). Include:

- What you did
- What you expected
- What happened instead
- A minimal example posting (redacted) if relevant
- Your Node version and OS

## Proposing features

Open a [feature request](.github/ISSUE_TEMPLATE/feature_request.yml). Bigger ideas — new heuristics, new data sources, scoring changes — are best discussed in an issue before you write code.

Thanks again for contributing. 🛡️
