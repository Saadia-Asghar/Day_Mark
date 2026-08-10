import { pgTable, serial, varchar, integer, text, timestamp, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * DayLink relationship streaks.
 *
 * Tracks consecutive days that two connected Daymark users have shared a
 * meaningful moment together. userAId is always the lexicographically smaller
 * userId to enforce pair uniqueness regardless of direction.
 *
 * Status:
 *  active   — streak is currently running
 *  at_risk  — missed yesterday, grace not yet used
 *  paused   — grace used, one more miss allowed before ending
 *  ended    — streak broken with no grace remaining
 */
export const relationshipStreaksTable = pgTable(
  "relationship_streaks",
  {
    id: serial("id").primaryKey(),
    // Store alphabetically lower userId as userAId for canonical uniqueness
    userAId: varchar("user_a_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userBId: varchar("user_b_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastQualifiedDate: date("last_qualified_date", { mode: "string" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    graceUsedAt: date("grace_used_at", { mode: "string" }),
    status: text("status").notNull().default("active"), // active | at_risk | paused | ended
  },
  (t) => [
    uniqueIndex("idx_streaks_user_pair").on(t.userAId, t.userBId),
    index("idx_streaks_user_a").on(t.userAId),
    index("idx_streaks_user_b").on(t.userBId),
  ],
);

/**
 * Individual qualifying Daylink activities.
 * Enforces at most one increment per relationship per calendar date.
 */
export const streakActivitiesTable = pgTable(
  "streak_activities",
  {
    id: serial("id").primaryKey(),
    streakId: integer("streak_id")
      .notNull()
      .references(() => relationshipStreaksTable.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    activityType: text("activity_type").notNull(),
    // shared_memory | memory_drop | prompt_response | memory_contribution
    sourceId: integer("source_id"), // memoryId, dropId, etc.
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One qualifying activity per streak per day (additional activities that day are ignored)
    uniqueIndex("idx_streak_activity_date").on(t.streakId, t.activityDate),
    index("idx_streak_activities_streak_id").on(t.streakId),
  ],
);

export type RelationshipStreak = typeof relationshipStreaksTable.$inferSelect;
export type InsertRelationshipStreak = typeof relationshipStreaksTable.$inferInsert;
export type StreakActivity = typeof streakActivitiesTable.$inferSelect;
export type InsertStreakActivity = typeof streakActivitiesTable.$inferInsert;
