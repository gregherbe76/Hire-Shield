# Deployment

HireShield has been built to run anywhere Node.js + Postgres run. Three
documented paths below.

## Docker

The reference deployment. `docker-compose.yml` at the repo root brings up
Postgres, runs migrations, and serves the app on port 8080.

```bash
cp .env.example .env
docker compose up --build -d
```

Build a production image for your registry:

```bash
docker build -t ghcr.io/gh63/hireshield:latest .
docker push ghcr.io/gh63/hireshield:latest
```

Then run it against any managed Postgres:

```bash
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL=postgres://... \
  -e AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e AI_INTEGRATIONS_OPENAI_API_KEY=sk-... \
  ghcr.io/gh63/hireshield:latest
```

The image is multi-stage (`node:24-alpine`), runs as a non-root user, and
ships with a healthcheck on `/api/healthz`.

## Replit

This project's reference live deployment runs on Replit at
<https://hire-shield.replit.app>.

The setup is split:

- Frontend (Vite build) served at `/`
- API server at `/api/*`

Both are wired through the shared proxy via `.replit-artifact/artifact.toml`
files. To deploy your own:

1. Fork the repo to your Replit account.
2. Add `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, and
   `AI_INTEGRATIONS_OPENAI_API_KEY` as Replit Secrets.
3. Hit **Deploy**.

## Bare metal / VPS

For a minimal single-VM setup:

```bash
# On the VM
git clone https://github.com/gh63/hireshield.git
cd hireshield
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/hireshield run build
pnpm --filter @workspace/db run push

NODE_ENV=production \
PORT=8080 \
STATIC_DIR=$(pwd)/artifacts/hireshield/dist \
DATABASE_URL=... \
AI_INTEGRATIONS_OPENAI_BASE_URL=... \
AI_INTEGRATIONS_OPENAI_API_KEY=... \
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Run it under `systemd`, `pm2`, or `tmux`. Front with Caddy or nginx for
TLS and add a reverse-proxy rule to forward to port 8080.

## Production checklist

- [ ] `DATABASE_URL` points to a **managed** Postgres with backups
- [ ] `AI_INTEGRATIONS_OPENAI_API_KEY` is a **read-only** key scoped to
      the model you use
- [ ] `SESSION_SECRET` is set to a strong random value (not the default)
- [ ] TLS terminator in front (Caddy, nginx, cloud load balancer)
- [ ] `/api/healthz` wired into your uptime monitor
- [ ] Log aggregation reads pino JSON from stdout
- [ ] `APIFY_API_TOKEN` set only if you need JS-rendered scraping

## Scaling notes

- The API server is **stateless**. Horizontal scaling is just running more
  containers behind a load balancer.
- The duplicate-detection heuristic queries the analyses table. Add an
  index on `created_at` if it's not already there once your dataset
  exceeds ~100k rows.
- LLM latency dominates total response time. Cache aggressively on the
  client; the report permalink page is fully static after first render.
