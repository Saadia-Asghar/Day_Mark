import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const futureGiftsTable = pgTable("future_gifts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  recipientName: text("recipient_name").notNull(),
  unlockDate: date("unlock_date", { mode: "string" }).notNull(),
  message: text("message"),
  photoUrls: text("photo_urls").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFutureGiftSchema = createInsertSchema(futureGiftsTable).omit({ id: true, createdAt: true });
export type InsertFutureGift = z.infer<typeof insertFutureGiftSchema>;
export type FutureGift = typeof futureGiftsTable.$inferSelect;
