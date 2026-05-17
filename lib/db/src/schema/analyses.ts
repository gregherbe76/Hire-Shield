import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
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
    | "llm"
    | "temporal";
  detail: string;
  score?: number | null;
};

export const analysesTable = pgTable(
  "analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobTitle: text("job_title").notNull(),
    company: text("company").notNull(),
    recruiterEmail: text("recruiter_email"),
    jobUrl: text("job_url"),
    jobDescription: text("job_description").notNull(),
    /** Self-declared / extracted original posting date (nullable). */
    postedAt: timestamp("posted_at", { withTimezone: true }),
    /** Content fingerprint used to detect republication patterns. */
    fingerprint: text("fingerprint"),
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
  },
  (t) => ({
    fingerprintIdx: index("analyses_fingerprint_idx").on(t.fingerprint),
  }),
);

export type AnalysisRow = typeof analysesTable.$inferSelect;
export type InsertAnalysis = typeof analysesTable.$inferInsert;

/**
 * Tracks how many times we've seen each unique posting content. Used by the
 * temporal heuristics to flag republished / evergreen ghost listings.
 */
export const postingFingerprintsTable = pgTable("posting_fingerprints", {
  fingerprint: text("fingerprint").primaryKey(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  seenCount: integer("seen_count").notNull().default(1),
  lastAnalysisId: uuid("last_analysis_id"),
});

export type PostingFingerprintRow =
  typeof postingFingerprintsTable.$inferSelect;
