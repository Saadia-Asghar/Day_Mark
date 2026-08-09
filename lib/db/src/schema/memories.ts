import { pgTable, text, serial, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoriesTable = pgTable("memories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  story: text("story"),
  date: date("date", { mode: "string" }).notNull(),
  location: text("location"),
  category: text("category").notNull().default("everyday"),
  mood: text("mood"),
  giftColor: text("gift_color").notNull().default("#75C8FF"),
  ribbon: text("ribbon").notNull().default("gold"),
  sticker: text("sticker"),
  photoUrls: text("photo_urls").array().notNull().default([]),
  isKeptClose: boolean("is_kept_close").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ id: true, createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;
