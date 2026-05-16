import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type StoredSignal = {
  label: string;
  severity: "info" | "low" | "medium" | "high";
  category:
    | "nlp"
    | "metadata"
    | "urgency"
    | "stylometry"
    | "duplicate"
    | "domain"
    | "llm";
  detail: string;
  score?: number | null;
};

export const analysesTable = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  recruiterEmail: text("recruiter_email"),
  jobUrl: text("job_url"),
  jobDescription: text("job_description").notNull(),
  trustScore: integer("trust_score").notNull(),
  fraudRisk: text("fraud_risk").notNull(),
  ghostJobProbability: integer("ghost_job_probability").notNull(),
  confidenceLevel: integer("confidence_level").notNull(),
  signals: jsonb("signals").$type<StoredSignal[]>().notNull(),
  aiExplanation: text("ai_explanation").notNull(),
  candidateSummary: text("candidate_summary").notNull(),
  recommendedActions: jsonb("recommended_actions")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AnalysisRow = typeof analysesTable.$inferSelect;
export type InsertAnalysis = typeof analysesTable.$inferInsert;
