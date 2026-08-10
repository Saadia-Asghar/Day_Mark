import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const relationshipEventsTable = pgTable("relationship_events", {
  id: serial("id").primaryKey(),
  ownerUserId: varchar("owner_user_id").notNull(),
  personId: integer("person_id"),
  linkedUserId: varchar("linked_user_id"),
  type: text("type").notNull(), // birthday | anniversary | friendship_anniversary | graduation | custom
  title: text("title").notNull(),
  eventMonth: integer("event_month").notNull(), // 1–12
  eventDay: integer("event_day").notNull(),     // 1–31
  eventYear: integer("event_year"),             // optional: known birth year
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  isRecurring: boolean("is_recurring").notNull().default(true),
  visibility: text("visibility").notNull().default("private"), // private | connections | public
  reminderDays: text("reminder_days").notNull().default("7,3,1,0"), // comma-separated
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
