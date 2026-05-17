import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";
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

  const result = await analyzePosting({
    jobTitle: jobTitle || "Untitled role",
    company: company || "Unknown company",
    recruiterEmail: body.recruiterEmail,
    jobUrl: body.jobUrl,
    jobDescription,
    corpus: corpusRows,
  });

  const [row] = await db
    .insert(analysesTable)
    .values({
      jobTitle: jobTitle || "Untitled role",
      company: company || "Unknown company",
      recruiterEmail: body.recruiterEmail ?? null,
      jobUrl: body.jobUrl ?? null,
      jobDescription,
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
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

// Silence unused import warning when no other usage of sql exists
void sql;

export default router;
