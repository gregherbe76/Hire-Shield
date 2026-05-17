# Architecture Decision Records

This directory captures the *why* behind significant technical decisions in
HireShield. Each record is short, dated, immutable, and links to the
discussion that produced it.

We use the [MADR](https://adr.github.io/madr/) format. New ADRs are appended;
old ones are superseded rather than rewritten.

## When to write one

Open an ADR when a change:

- Affects how data flows through the system (scoring pipeline, request path)
- Locks the project into a vendor or runtime (database, LLM provider, deploy target)
- Changes a guarantee we make to users (privacy, accusation framing, performance)
- Reverses or supersedes a prior ADR

Skip ADRs for routine refactors, dependency bumps, or copy changes.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-heuristics-first-scoring) | Heuristics-first scoring, LLM-second | Accepted | 2026-01 |
| [0002](./0002-never-accuse-framing) | Never accuse specific employers | Accepted | 2026-01 |
| [0003](./0003-contract-first-api) | Contract-first API with OpenAPI codegen | Accepted | 2026-02 |
| [0004](./0004-monolithic-single-port) | Single-process, single-port production topology | Accepted | 2026-04 |
| [0005](./0005-postgres-drizzle) | PostgreSQL + Drizzle ORM | Accepted | 2026-01 |

## Writing a new ADR

Copy [`template.md`](./template) into `docs/adr/NNNN-short-title.md`,
fill it in, and add an entry to the table above. Link it from the PR
that implements the decision.
