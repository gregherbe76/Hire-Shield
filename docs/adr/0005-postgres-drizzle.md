# ADR-0005: PostgreSQL + Drizzle ORM

- **Status:** Accepted
- **Date:** 2026-01-15
- **Deciders:** Founding team

## Context

HireShield needs a relational store for analyses and waitlist entries.
Volume is modest — analyses are write-once, read-mostly, with the largest
single document being the signal array (a few KB). The data model is
relational and likely to gain joins as features land (employer claims,
reviewer feedback, signal calibration metrics).

The TypeScript ecosystem offers several mature options for the ORM layer:
Prisma, Drizzle, Kysely, raw `pg`. Each makes different trade-offs around
codegen, runtime overhead, and schema authorship.

## Decision

**Storage:** PostgreSQL 14+. Any managed provider works (Neon, Supabase,
RDS, self-hosted). The Docker compose stack ships Postgres 16-alpine for
local dev.

**ORM:** [Drizzle ORM](https://orm.drizzle.team/) with `drizzle-zod` for
schema-derived Zod validators.

**Migrations:** `drizzle-kit push` in dev for fast iteration;
`drizzle-kit generate` + `migrate` in production for explicit SQL.

## Consequences

### Positive

- Drizzle's schema is plain TypeScript — no DSL, no codegen step in the
  hot path. The schema *is* the source of truth.
- `drizzle-zod` gives us free Zod validators that stay in sync with the
  schema. These compose with the OpenAPI-derived validators
  ([ADR-0003](./0003-contract-first-api)).
- Postgres is ubiquitous — every managed-DB provider supports it; every
  contributor has used it.
- JSONB columns let us store the signal array without modeling it
  relationally yet. We can normalize later if it pays off.

### Negative / trade-offs

- Drizzle is younger than Prisma. The ecosystem of third-party tooling
  (admin UIs, BI integrations) is thinner.
- `push` is convenient in dev but unsafe in prod. We document the
  `generate` + `migrate` flow but discipline still has to be enforced
  in CI.
- We're committing to a SQL database. Switching to a document store
  would be a meaningful rewrite of the analyses table. We don't expect
  to do this, but it's a real lock-in.

### Neutral

- Forks are likely to keep Postgres; the only real alternative for them
  is SQLite for tiny deployments. Drizzle supports SQLite, so that
  migration would be ergonomic.

## Alternatives considered

### Prisma

The TypeScript ORM most people reach for first. Rejected because:

- The Prisma schema language is a second source of truth alongside the
  generated TypeScript types — drift surface area we don't want.
- The Prisma client is heavy and bundles a Rust query engine. Drizzle is
  ~30 KB and runs entirely in Node.
- Prisma's migration story is excellent but the runtime overhead and
  bundle size aren't justified for this project's scale.

### Raw `pg` with `zod` validators

Maximum control, minimum magic. Rejected because we'd end up rebuilding
the join helpers and parameterization that Drizzle gives us for free.

### Kysely

Strong typed query builder, no ORM features. We liked it but didn't want
to hand-author the Zod schemas. Drizzle + `drizzle-zod` won that
trade.

## References

- `lib/db/src/schema.ts` — tables: `analyses`, `waitlist`
- `lib/db/drizzle.config.ts`
- [Drizzle ORM docs](https://orm.drizzle.team/)
