import { pgTable, serial, integer, varchar, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const relationshipEventRemindersTable = pgTable(
  "relationship_event_reminders",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: varchar("user_id").notNull(),
    /** 7_days | 3_days | 1_day | morning_of */
    reminderType: text("reminder_type").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    /** pending | processing | sent | cancelled | failed */
    status: text("status").notNull().default("pending"),
    /**
     * Unique key to prevent duplicate reminders.
     * Format: user:<userId>:event:<eventId>:<year>:<reminderType>
     * e.g. user:abc:event:42:2027:1_day
     */
    dedupeKey: varchar("dedupe_key", { length: 200 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rel_event_reminders_dedupe_idx").on(table.dedupeKey),
    index("rel_event_reminders_scheduled_idx").on(table.scheduledFor, table.status),
    index("rel_event_reminders_user_idx").on(table.userId),
  ],
);
