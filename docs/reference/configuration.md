# Configuration

Every option is set via environment variables. See `.env.example` for a
fillable template.

## Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string. Drizzle reads this. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible endpoint base URL. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API key for the endpoint above. |

The naming follows the Replit AI Integrations convention but the values
work with any OpenAI-compatible provider (OpenAI proper, Azure OpenAI,
OpenRouter, Ollama, etc.).

## Recommended

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the Express server binds to. |
| `NODE_ENV` | `development` | Set to `production` in deployments. |
| `SESSION_SECRET` | _empty_ | Strong random string. Required if you enable session-based features. |
| `LOG_LEVEL` | `info` | One of `trace`, `debug`, `info`, `warn`, `error`. |

## Optional

| Variable | Default | Description |
|---|---|---|
| `APIFY_API_TOKEN` | _empty_ | Enables [Apify Website Content Crawler](https://apify.com/apify/website-content-crawler) as a fallback for JS-rendered job pages. Without it, the URL extractor falls back to plain fetch + cheerio. |
| `STATIC_DIR` | _empty_ | When set and `NODE_ENV=production`, the API server also serves the built frontend from this directory. Used by the Docker image. |
| `SERVE_STATIC` | `1` | Set to `0` to disable static serving even when `STATIC_DIR` is set. Used in Replit, where the shared proxy serves the frontend. |

## LLM tuning

The model is currently pinned to `gpt-5.4` and called with:

```ts
response_format: { type: "json_object" }
max_completion_tokens: 8192
// no temperature
```

To swap models, edit `artifacts/api-server/src/lib/openai-client.ts`. Any
model that respects `response_format: json_object` and reasonable
completion-token caps will work.

::: warning
Do **not** pass `temperature` to `gpt-5.4` — the API rejects it. Use
`max_completion_tokens`, not `max_tokens`.
:::

## Database

Schema lives in `lib/db/src/schema.ts`. To apply changes:

```bash
pnpm --filter @workspace/db run push
```

In production, prefer the `migrate` flow:

```bash
pnpm --filter @workspace/db run generate   # creates SQL files
pnpm --filter @workspace/db run migrate    # applies them
```

The Docker Compose stack runs `push` as a one-shot service before the app
starts — fine for local and demo, but for production deploys you should
generate and apply explicit SQL migrations.
