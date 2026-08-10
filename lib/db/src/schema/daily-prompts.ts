import { pgTable, serial, varchar, text, timestamp, date, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { memoriesTable } from "./memories";

/**
 * Today's Little Question — daily memory prompts.
 *
 * One prompt is active per day. Users can answer privately (becomes a memory)
 * or share with a connection (can count toward DayLink).
 */
export const dailyPromptsTable = pgTable("daily_prompts", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category").notNull().default("general"),
  activeDate: date("active_date", { mode: "string" }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptResponsesTable = pgTable(
  "prompt_responses",
  {
    id: serial("id").primaryKey(),
    promptId: integer("prompt_id")
      .notNull()
      .references(() => dailyPromptsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // If shared with a connection, this is their userId
    sharedWithUserId: varchar("shared_with_user_id").references(() => usersTable.id),
    // If this became a memory
    memoryId: integer("memory_id").references(() => memoriesTable.id),
    responseText: text("response_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_pr_user_id").on(t.userId),
    index("idx_pr_prompt_id").on(t.promptId),
  ],
);

export type DailyPrompt = typeof dailyPromptsTable.$inferSelect;
export type InsertDailyPrompt = typeof dailyPromptsTable.$inferInsert;
export type PromptResponse = typeof promptResponsesTable.$inferSelect;
export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
