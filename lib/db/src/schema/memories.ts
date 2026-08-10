import { pgTable, text, serial, timestamp, date, boolean, varchar, index, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoriesTable = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // nullable for legacy demo records; new records always have userId
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

  // ── Globe / visibility fields ────────────────────────────────────────────
  // private (default) | connections | public_globe
  visibility: text("visibility").notNull().default("private"),
  globePublishedAt: timestamp("globe_published_at", { withTimezone: true }),
  globeCaption: text("globe_caption"),
  // Approximate coordinates (city-level or coarser — never exact GPS)
  globeLatitudeApprox: doublePrecision("globe_latitude_approx"),
  globeLongitudeApprox: doublePrecision("globe_longitude_approx"),
  globeLocationLabel: text("globe_location_label"),
  globePrecision: text("globe_precision").default("city"), // city | region | country
  globeAnonymous: boolean("globe_anonymous").notNull().default(false),
  globeShowUsername: boolean("globe_show_username").notNull().default(true),
  globeShowDate: boolean("globe_show_date").notNull().default(true),
  globeShowPhoto: boolean("globe_show_photo").notNull().default(true),
}, (t) => [
  index("idx_memories_user_id").on(t.userId),
  index("idx_memories_visibility").on(t.visibility),
  index("idx_memories_globe_published").on(t.globePublishedAt),
]);

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ id: true, createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;
