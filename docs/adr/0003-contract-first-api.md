# ADR-0003: Contract-first API with OpenAPI codegen

- **Status:** Accepted
- **Date:** 2026-02-04
- **Deciders:** Founding team

## Context

The frontend and backend need to agree on request and response shapes for
every endpoint. The options for keeping them in sync:

1. **Hand-written types on both sides** — fast to start, drifts under
   any pressure.
2. **TypeScript types as the contract** (e.g. tRPC, Hono RPC) — strong
   ergonomics but couples the backend to TypeScript and loses
   language-agnostic interop.
3. **OpenAPI as the contract**, with code generated for both sides —
   slower setup, language-agnostic, tooling-rich.

We also want the API to be useful to third-party consumers (forks, custom
clients, future mobile apps). That argues for a spec other languages can
consume.

## Decision

`lib/api-spec/openapi.yaml` is the single source of truth for every API
endpoint. After any spec change:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This generates:

- `lib/api-client-react/` — React Query hooks (via Orval)
- `lib/api-zod/` — Zod validators

The backend imports the Zod validators for input/output validation. The
frontend imports the hooks. Neither side hand-writes request or response
types.

## Consequences

### Positive

- Drift is structurally impossible — if the spec doesn't describe a
  field, neither side can use it.
- Third-party consumers get a real OpenAPI document, not a TypeScript
  declaration.
- The Zod validators give us runtime safety on the server, not just
  compile-time hopes.
- New endpoints have a documented contract before any code is written.

### Negative / trade-offs

- Extra step in the dev loop: change spec → run codegen → use generated
  artifacts.
- Orval's output paths leak into the import graph. Generated files must
  be imported from the package root, not from the `generated/` subpath
  (Orval doesn't export subpath specifiers). This caught us once
  already.
- OpenAPI's expressiveness is bounded — discriminated unions and recursive
  types take work.

### Neutral

- Builds in a versioning point if we ever expose a public API.

## Alternatives considered

### tRPC

Excellent DX, but ties the API forever to TypeScript clients and complicates
serving non-Node consumers. Rejected.

### GraphQL

Strong schema, language-agnostic, but the overhead (resolvers, dataloader,
caching invalidation on the client) is disproportionate for an API with
~7 endpoints. Rejected.

### No codegen, manual types

Tried briefly. Drifted within a week. Rejected.

## References

- `lib/api-spec/openapi.yaml`
- [API reference](../reference/api)
- [Orval docs](https://orval.dev/)
