# API reference

All endpoints are mounted under `/api`. The source of truth is
[`lib/api-spec/openapi.yaml`](https://github.com/gh63/hireshield/blob/main/lib/api-spec/openapi.yaml).
React Query hooks and Zod validators are generated from it — run
`pnpm --filter @workspace/api-spec run codegen` after any change.

## Conventions

- All requests and responses are JSON.
- Errors use the shape:

  ```json
  { "error": "Human-readable message", "code": "OPTIONAL_CODE" }
  ```

- Pagination uses simple `limit` query params (no cursors yet).
- All timestamps are RFC 3339 strings in UTC.

## Endpoints

### `GET /api/healthz`

Liveness check. Returns immediately, does not touch the database.

```json
{ "status": "ok" }
```

### `POST /api/analyses`

Analyze a job posting. The most important endpoint in the API.

**Request body:**

```json
{
  "jobTitle": "Senior Software Engineer",
  "company": "Acme Corp",
  "recruiterEmail": "talent@acme.example",
  "jobUrl": "https://careers.acme.example/job/12345",
  "jobDescription": "We are urgently looking for...",
  "makePublic": true
}
```

Either `jobDescription` **or** `jobUrl` is required. When `jobUrl` is
provided and `jobDescription` is empty, the server fetches the page (with
an [Apify](https://apify.com/) fallback for JS-rendered sites if
`APIFY_API_TOKEN` is configured).

**Response — `201 Created`:**

```json
{
  "id": "abc123",
  "trustScore": 67,
  "fraudRisk": "medium",
  "ghostJobProbability": 24,
  "confidenceLevel": 88,
  "signals": [
    {
      "kind": "urgency",
      "severity": "medium",
      "detail": "Multiple urgency phrases detected: \"start ASAP\", \"limited spots\""
    }
  ],
  "aiExplanation": "...",
  "candidateSummary": "...",
  "recommendedActions": [
    "Verify the recruiter's email matches the company's domain",
    "Check whether this role is listed on the company's official careers page"
  ],
  "createdAt": "2026-05-17T10:30:00Z"
}
```

### `GET /api/analyses`

List recent public analyses (those created with `makePublic: true`).

| Query param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Max 50 |

Returns an array of summaries (subset of fields — no `aiExplanation` or
`recommendedActions`).

### `GET /api/analyses/{id}`

Fetch a single analysis by id with all fields.

::: warning Route order
Express matches `/analyses/:id` before any sibling literal path. The
codebase deliberately uses different prefixes (`/analysis-examples`,
`/community/stats`) for non-param sibling routes — be careful when
adding new endpoints.
:::

### `GET /api/analysis-examples`

A small curated set of analyses used by the landing page. Read-only.

### `GET /api/community/stats`

Aggregate telemetry. Powers the `/community` dashboard.

```json
{
  "totalAnalyses": 1247,
  "flaggedCount": 312,
  "averageTrustScore": 71,
  "ghostJobShare": 0.18,
  "riskBreakdown": {
    "low": 612,
    "medium": 323,
    "high": 244,
    "critical": 68
  },
  "topSignals": [
    { "kind": "urgency", "count": 184 },
    { "kind": "suspicious_phrase", "count": 142 }
  ]
}
```

### `POST /api/waitlist`

Append an email to the community waitlist. Idempotent on email.

```json
{ "email": "candidate@example.com" }
```

Returns `204 No Content` on success.

## Client usage (React)

The generated React Query hooks live in `@workspace/api-client-react`:

```tsx
import { useCreateAnalysis } from "@workspace/api-client-react";

function AnalyzeForm() {
  const { mutate, data, isPending } = useCreateAnalysis();
  return (
    <button
      onClick={() =>
        mutate({ data: { jobDescription: "...", makePublic: true } })
      }
      disabled={isPending}
    >
      Analyze
    </button>
  );
}
```

Always import from the package root, never `@workspace/api-client-react/src/generated/...` — Orval's
output paths are not exported as subpath specifiers.
