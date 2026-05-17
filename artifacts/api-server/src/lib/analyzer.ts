import {
  runHeuristics,
  fraudRiskFromScore,
  type PostingHistory,
} from "@workspace/nlp-engine";
import type { StoredSignal } from "@workspace/db";
import { openai, openaiAvailable } from "./openai-client";

export interface AnalyzerInput {
  jobTitle: string;
  company: string;
  recruiterEmail?: string;
  jobUrl?: string;
  jobDescription: string;
  corpus: { id: string; description: string }[];
  /** Self-declared / extracted original posting date. */
  postedAt?: Date;
  /** Prior submissions of the same fingerprint (looked up by the route). */
  history?: PostingHistory;
}

export interface AnalyzerResult {
  trustScore: number;
  fraudRisk: "low" | "medium" | "high" | "critical";
  ghostJobProbability: number;
  confidenceLevel: number;
  signals: StoredSignal[];
  aiExplanation: string;
  candidateSummary: string;
  recommendedActions: string[];
}

interface LlmShape {
  signals: {
    label: string;
    severity: "info" | "low" | "medium" | "high";
    detail: string;
  }[];
  candidateSummary: string;
  recommendedActions: string[];
  reasoning: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function fallbackLlm(): LlmShape {
  return {
    signals: [],
    candidateSummary:
      "LLM reasoning is currently unavailable, so this analysis relies on heuristic signals only. Review the listed indicators carefully and corroborate the posting through the company's official channels before sharing personal information.",
    recommendedActions: [
      "Verify the recruiter on the company's official website or LinkedIn page",
      "Avoid sharing personal identification or financial details until the role is confirmed",
      "Ask for an interview process outline before proceeding further",
    ],
    reasoning: "LLM unavailable.",
  };
}

async function llmAnalysis(input: AnalyzerInput): Promise<LlmShape> {
  if (!openaiAvailable || !openai) return fallbackLlm();

  const systemPrompt = `You are HireShield, an open-source analyst that audits job postings for signs of fraud, ghost listings, phishing recruitment, and abusive practices.

You write calmly and factually. You NEVER directly accuse a named company of fraud — instead you describe "signals", "indicators", "patterns commonly seen in fraudulent listings", and recommend verification steps.

You do NOT score the posting numerically — trust scores and ghost-job probabilities are computed deterministically from heuristics elsewhere. Your job is to provide qualitative reasoning and guidance only.

Return STRICT JSON matching this TypeScript type:
{
  "signals": [                       // 1-5 qualitative reasoning-level signals
    { "label": string, "severity": "info"|"low"|"medium"|"high", "detail": string }
  ],
  "candidateSummary": string,        // 2-4 sentences directly addressed to the candidate
  "recommendedActions": string[],    // 3-5 specific, concrete next steps
  "reasoning": string                // 1-3 sentences of internal reasoning
}

Do not include any commentary outside the JSON. Do not wrap it in markdown.`;

  const userPrompt = `Job title: ${input.jobTitle}
Company: ${input.company}
Recruiter email: ${input.recruiterEmail ?? "(not provided)"}
Job URL: ${input.jobUrl ?? "(not provided)"}
Posted at: ${input.postedAt ? input.postedAt.toISOString() : "(not provided)"}

Job description:
"""
${input.jobDescription.slice(0, 8000)}
"""`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallbackLlm();
    const parsed = JSON.parse(raw) as Partial<LlmShape>;
    return {
      signals: Array.isArray(parsed.signals)
        ? parsed.signals
            .filter(
              (s) =>
                s && typeof s.label === "string" && typeof s.detail === "string",
            )
            .slice(0, 5)
            .map((s) => ({
              label: String(s.label).slice(0, 120),
              severity:
                s.severity === "info" ||
                s.severity === "low" ||
                s.severity === "medium" ||
                s.severity === "high"
                  ? s.severity
                  : "low",
              detail: String(s.detail).slice(0, 600),
            }))
        : [],
      candidateSummary:
        typeof parsed.candidateSummary === "string" &&
        parsed.candidateSummary.length > 0
          ? parsed.candidateSummary.slice(0, 1200)
          : fallbackLlm().candidateSummary,
      recommendedActions:
        Array.isArray(parsed.recommendedActions) &&
        parsed.recommendedActions.length > 0
          ? parsed.recommendedActions
              .map((a) => String(a).slice(0, 200))
              .slice(0, 6)
          : fallbackLlm().recommendedActions,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning.slice(0, 800)
          : "",
    };
  } catch {
    return fallbackLlm();
  }
}

export async function analyzePosting(
  input: AnalyzerInput,
): Promise<AnalyzerResult> {
  const heuristic = runHeuristics({
    jobTitle: input.jobTitle,
    company: input.company,
    recruiterEmail: input.recruiterEmail,
    jobUrl: input.jobUrl,
    jobDescription: input.jobDescription,
    corpus: input.corpus,
    postedAt: input.postedAt,
    history: input.history,
  });

  const llm = await llmAnalysis(input);

  const signals: StoredSignal[] = [
    ...heuristic.signals.map((s) => ({
      label: s.label,
      severity: s.severity,
      category: s.category,
      detail: s.detail,
      score: s.score ?? null,
    })),
    ...llm.signals.map((s) => ({
      label: s.label,
      severity: s.severity,
      category: "llm" as const,
      detail: s.detail,
      score: null,
    })),
  ];

  // Scoring is heuristics-only. The LLM contributes signals, summary, and
  // recommendations — it deliberately does not adjust trust or ghost numbers.
  const trustScore = clamp(Math.round(heuristic.heuristicTrustScore), 1, 99);
  const ghostJobProbability = clamp(
    Math.round(heuristic.ghostJobProbability),
    1,
    99,
  );

  // confidence bumps when LLM contributed
  const confidenceLevel = clamp(
    heuristic.inputConfidence + (openaiAvailable ? 8 : -5),
    15,
    98,
  );

  const aiExplanation = llm.reasoning
    ? llm.reasoning
    : "Heuristic-only analysis based on language patterns, metadata, and template similarity.";

  return {
    trustScore,
    fraudRisk: fraudRiskFromScore(trustScore),
    ghostJobProbability,
    confidenceLevel,
    signals,
    aiExplanation,
    candidateSummary: llm.candidateSummary,
    recommendedActions: llm.recommendedActions,
  };
}
