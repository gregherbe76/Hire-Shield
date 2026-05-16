import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const waitlistTable = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    role: text("role"),
    github: text("github"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_email_unique").on(t.email)],
);

export type WaitlistRow = typeof waitlistTable.$inferSelect;
export type InsertWaitlist = typeof waitlistTable.$inferInsert;
