import { Router, type IRouter } from "express";
import { db, analysesTable } from "@workspace/db";
import { GetCommunityStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/community/stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      trustScore: analysesTable.trustScore,
      fraudRisk: analysesTable.fraudRisk,
      ghostJobProbability: analysesTable.ghostJobProbability,
      signals: analysesTable.signals,
      createdAt: analysesTable.createdAt,
    })
    .from(analysesTable);

  const total = rows.length;
  const flagged = rows.filter(
    (r) =>
      r.fraudRisk === "medium" ||
      r.fraudRisk === "high" ||
      r.fraudRisk === "critical",
  ).length;
  const avgTrust =
    total === 0
      ? 0
      : Math.round(
          rows.reduce((a, r) => a + r.trustScore, 0) / total,
        );
  const ghostFlagged = rows.filter((r) => r.ghostJobProbability >= 60).length;
  const ghostShare =
    total === 0 ? 0 : Math.round((ghostFlagged / total) * 1000) / 10;

  const riskCounts: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const r of rows) {
    riskCounts[r.fraudRisk] = (riskCounts[r.fraudRisk] ?? 0) + 1;
  }

  const signalCounts = new Map<string, number>();
  for (const r of rows) {
    for (const s of r.signals ?? []) {
      if (s.severity === "info") continue;
      signalCounts.set(s.label, (signalCounts.get(s.label) ?? 0) + 1);
    }
  }
  const topSignals = [...signalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  const lastUpdated =
    rows
      .map((r) => r.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() ?? new Date().toISOString();

  res.json(
    GetCommunityStatsResponse.parse({
      totalAnalyses: total,
      flaggedCount: flagged,
      averageTrustScore: avgTrust,
      ghostJobShare: ghostShare,
      riskBreakdown: (["low", "medium", "high", "critical"] as const).map(
        (risk) => ({ risk, count: riskCounts[risk] ?? 0 }),
      ),
      topSignals,
      contributors: 1,
      lastUpdated,
    }),
  );
});

export default router;
