import { pgTable, serial, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const monthlyCapsulesTable = pgTable("monthly_capsules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1–12
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  summaryData: jsonb("summary_data").notNull().default({}),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
