import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  analysesTable,
  postingFingerprintsTable,
} from "@workspace/db";
import { postingFingerprint } from "@workspace/nlp-engine";
import {
  CreateAnalysisBody,
  ListAnalysesQueryParams,
  GetAnalysisParams,
  GetAnalysisResponse,
  ListAnalysesResponse,
} from "@workspace/api-zod";
import { analyzePosting } from "../lib/analyzer";
import { fetchPostingFromUrl } from "../lib/fetch-posting";
import {
  createRateLimit,
  defaultRateLimitOptions,
} from "../middlewares/rate-limit";

const router: IRouter = Router();

const analyzeRateLimit = createRateLimit(defaultRateLimitOptions());

function pickTopSignal(signals: { label: string; severity: string }[]) {
  const order: Record<string, number> = { high: 3, medium: 2, low: 1, info: 0 };
  const sorted = [...signals].sort(
    (a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0),
  );
  return sorted[0]?.label;
}

/**
 * Coerces an unknown into a sanity-checked Date. Accepts both `Date` instances
 * (after orval's `z.coerce.date()` parses the request body) and ISO strings
 * (e.g. when we copy a value from `fetched.postedAt`).
 */
function parsePostedAt(raw: unknown): Date | undefined {
  if (raw == null || raw === "") return undefined;
  let d: Date;
  if (raw instanceof Date) {
    d = raw;
  } else if (typeof raw === "string") {
    d = new Date(raw);
  } else {
    return undefined;
  }
  if (Number.isNaN(d.getTime())) return undefined;
  const year = d.getUTCFullYear();
  const nowYear = new Date().getUTCFullYear();
  if (year < 2000 || year > nowYear + 1) return undefined;
  return d;
}

router.get("/analyses", async (req, res): Promise<void> => {
  const parsed = ListAnalysesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 20;
  const rows = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(limit);
  const payload = rows.map((r) => ({
    id: r.id,
    jobTitle: r.jobTitle,
    company: r.company,
    trustScore: r.trustScore,
    fraudRisk: r.fraudRisk,
    ghostJobProbability: r.ghostJobProbability,
    confidenceLevel: r.confidenceLevel,
    topSignal: pickTopSignal(r.signals ?? []),
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(ListAnalysesResponse.parse(payload));
});

router.post("/analyses", analyzeRateLimit, async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid analysis body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;

  // Resolve job description: either provided directly, or fetched from URL.
  let jobDescription = body.jobDescription?.trim() ?? "";
  let jobTitle = body.jobTitle?.trim() ?? "";
  let company = body.company?.trim() ?? "";
  let postedAt = parsePostedAt(body.postedAt);

  if (jobDescription.length < 20) {
    if (!body.jobUrl) {
      res.status(400).json({
        error:
          "Provide either a job description (min 20 characters) or a job URL to fetch.",
      });
      return;
    }
    try {
      const fetched = await fetchPostingFromUrl(body.jobUrl);
      jobDescription = fetched.jobDescription;
      if (!jobTitle && fetched.jobTitle) jobTitle = fetched.jobTitle;
      if (!company && fetched.company) company = fetched.company;
      if (!postedAt && fetched.postedAt) {
        postedAt = parsePostedAt(fetched.postedAt);
      }
    } catch (err) {
      req.log.warn({ err, url: body.jobUrl }, "URL fetch failed");
      res.status(400).json({
        error: `Could not fetch posting from URL: ${(err as Error).message}`,
      });
      return;
    }
  }

  // Pull a small corpus of recent descriptions for duplicate detection
  const corpusRows = await db
    .select({
      id: analysesTable.id,
      description: analysesTable.jobDescription,
    })
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(50);

  // Look up prior history for this exact content (republication detection).
  const fingerprint = postingFingerprint(jobDescription);
  const [priorFingerprint] = await db
    .select()
    .from(postingFingerprintsTable)
    .where(eq(postingFingerprintsTable.fingerprint, fingerprint));

  const history = priorFingerprint
    ? {
        firstSeenAt: priorFingerprint.firstSeenAt,
        lastSeenAt: priorFingerprint.lastSeenAt,
        seenCount: priorFingerprint.seenCount,
      }
    : undefined;

  const result = await analyzePosting({
    jobTitle: jobTitle || "Untitled role",
    company: company || "Unknown company",
    recruiterEmail: body.recruiterEmail,
    jobUrl: body.jobUrl,
    jobDescription,
    corpus: corpusRows,
    postedAt,
    history,
  });

  const [row] = await db
    .insert(analysesTable)
    .values({
      jobTitle: jobTitle || "Untitled role",
      company: company || "Unknown company",
      recruiterEmail: body.recruiterEmail ?? null,
      jobUrl: body.jobUrl ?? null,
      jobDescription,
      postedAt: postedAt ?? null,
      fingerprint,
      trustScore: result.trustScore,
      fraudRisk: result.fraudRisk,
      ghostJobProbability: result.ghostJobProbability,
      confidenceLevel: result.confidenceLevel,
      signals: result.signals,
      aiExplanation: result.aiExplanation,
      candidateSummary: result.candidateSummary,
      recommendedActions: result.recommendedActions,
    })
    .returning();

  // Atomic upsert: avoids the read-then-write race where two concurrent
  // submissions of the same content would either collide on the PK or
  // under-count `seenCount`. Postgres performs the increment in-row so the
  // counter is exact even under concurrency.
  const now = new Date();
  const [updatedFingerprint] = await db
    .insert(postingFingerprintsTable)
    .values({
      fingerprint,
      firstSeenAt: now,
      lastSeenAt: now,
      seenCount: 1,
      lastAnalysisId: row.id,
    })
    .onConflictDoUpdate({
      target: postingFingerprintsTable.fingerprint,
      set: {
        lastSeenAt: now,
        seenCount: sql`${postingFingerprintsTable.seenCount} + 1`,
        lastAnalysisId: row.id,
      },
    })
    .returning();

  // Send post-increment history snapshot to the candidate ("we've seen this
  // posting N times") — it's clearer than the pre-increment count we used
  // internally for the temporal signals.
  const postingHistory =
    updatedFingerprint.seenCount > 1
      ? {
          firstSeenAt: updatedFingerprint.firstSeenAt.toISOString(),
          lastSeenAt: updatedFingerprint.lastSeenAt.toISOString(),
          seenCount: updatedFingerprint.seenCount,
        }
      : null;

  res.status(201).json(
    GetAnalysisResponse.parse({
      id: row.id,
      jobTitle: row.jobTitle,
      company: row.company,
      recruiterEmail: row.recruiterEmail ?? undefined,
      jobUrl: row.jobUrl ?? undefined,
      jobDescription: row.jobDescription,
      trustScore: row.trustScore,
      fraudRisk: row.fraudRisk,
      ghostJobProbability: row.ghostJobProbability,
      confidenceLevel: row.confidenceLevel,
      signals: row.signals,
      aiExplanation: row.aiExplanation,
      candidateSummary: row.candidateSummary,
      recommendedActions: row.recommendedActions ?? [],
      postedAt: row.postedAt ? row.postedAt.toISOString() : null,
      postingHistory,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

router.get("/analyses/:id", async (req, res): Promise<void> => {
  const parsed = GetAnalysisParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, parsed.data.id));
  if (!row) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  // Hydrate posting history snapshot when we have a fingerprint for this row.
  let postingHistory: {
    firstSeenAt: string;
    lastSeenAt: string;
    seenCount: number;
  } | null = null;
  if (row.fingerprint) {
    const [fp] = await db
      .select()
      .from(postingFingerprintsTable)
      .where(eq(postingFingerprintsTable.fingerprint, row.fingerprint));
    if (fp && fp.seenCount > 1) {
      postingHistory = {
        firstSeenAt: fp.firstSeenAt.toISOString(),
        lastSeenAt: fp.lastSeenAt.toISOString(),
        seenCount: fp.seenCount,
      };
    }
  }

  res.json(
    GetAnalysisResponse.parse({
      id: row.id,
      jobTitle: row.jobTitle,
      company: row.company,
      recruiterEmail: row.recruiterEmail ?? undefined,
      jobUrl: row.jobUrl ?? undefined,
      jobDescription: row.jobDescription,
      trustScore: row.trustScore,
      fraudRisk: row.fraudRisk,
      ghostJobProbability: row.ghostJobProbability,
      confidenceLevel: row.confidenceLevel,
      signals: row.signals,
      aiExplanation: row.aiExplanation,
      candidateSummary: row.candidateSummary,
      recommendedActions: row.recommendedActions ?? [],
      postedAt: row.postedAt ? row.postedAt.toISOString() : null,
      postingHistory,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

export default router;
