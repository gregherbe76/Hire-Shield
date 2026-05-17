# ADR-0004: Single-process, single-port production topology

- **Status:** Accepted
- **Date:** 2026-04-09
- **Deciders:** Founding team

## Context

In Replit, the API and the frontend run as separate artifacts behind a
shared reverse proxy: `/api/*` routes to Express, `/*` routes to the Vite
dev server. The proxy handles path-based routing.

Outside Replit (Docker, bare metal, generic cloud), there is no shared
proxy. Forkers running `docker compose up` would need to either:

1. Run two containers behind their own reverse proxy (Caddy, nginx, Traefik).
2. Bake both services into one image.

Option 1 multiplies operational complexity for a fork that just wants to
try the tool. Option 2 is awkward if it means running two Node processes
inside one container.

There is a third option: **have the API server also serve the built
frontend as static files** when running outside Replit. One process, one
port, one image.

## Decision

In production mode, when `NODE_ENV=production` and `STATIC_DIR` points to
the Vite build output, the Express server serves the frontend statically
with an SPA fallback. The `/api/*` routes still take precedence; everything
else falls through to `index.html`.

In Replit, `SERVE_STATIC=0` disables this behaviour because the shared
proxy already handles frontend routing.

The Docker image bakes the frontend build into `/app/public` and sets
`STATIC_DIR=/app/public`. One container, one port (8080).

## Consequences

### Positive

- `docker compose up` is genuinely one command. No reverse proxy required.
- Single image to ship; single artifact to vulnerability-scan.
- Health checks and observability hit one port.

### Negative / trade-offs

- Couples the API process to frontend serving. A buggy static-file
  middleware could affect API latency. Mitigated by mounting static
  middleware *after* the `/api` router, so API requests never go through
  the static handler.
- Cache headers on static assets are simpler than what nginx would give
  us (`maxAge: "1h"` blanket). Acceptable for the asset volumes we have;
  put a CDN in front if it ever matters.
- Frontend rebuilds require an image rebuild. We accept this — frontend
  releases are coupled to API releases in this product anyway.

### Neutral

- The Replit path keeps the two-process topology, which is fine because
  the proxy was going to be in the picture either way.

## Alternatives considered

### Multi-container compose with Caddy

Cleaner separation, but adds a third service (Caddy) and a Caddyfile that
forks need to understand. Rejected for the default path; documented as
an option in the [Deployment guide](../guide/deployment).

### Vite preview server in production

`vite preview` is explicitly documented as a development tool. Rejected.

## References

- `artifacts/api-server/src/app.ts` — static middleware gated on
  `NODE_ENV` + `STATIC_DIR`
- `Dockerfile` — multi-stage build, single runtime image
- [Deployment guide](../guide/deployment)
