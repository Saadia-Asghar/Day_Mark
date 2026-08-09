import { pgTable, text, serial, timestamp, date, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const peopleTable = pgTable("people", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // nullable for legacy demo records
  name: text("name").notNull(),
  relationship: text("relationship"),
  avatarUrl: text("avatar_url"),
  birthday: date("birthday", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_people_user_id").on(t.userId),
]);

export const insertPersonSchema = createInsertSchema(peopleTable).omit({ id: true, createdAt: true });
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof peopleTable.$inferSelect;
