import { pgTable, text, serial, timestamp, date, integer, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // nullable for legacy demo records
  title: text("title").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  type: text("type").notNull().default("memory"),
  memoryId: integer("memory_id"),
  personId: integer("person_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_calendar_events_user_id").on(t.userId),
]);

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({ id: true, createdAt: true });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
