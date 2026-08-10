import { pgTable, serial, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { memoriesTable } from "./memories";

/**
 * Memory Drops — lightweight person-to-person moment shares.
 *
 * A user can drop a photo, short note, or existing memory to a connected user.
 * Not a chat system — no threads, typing indicators, or online status.
 *
 * status:   delivered | opened | reacted
 * reaction: 💜 | ✨ | 🥹 | 😂
 */
export const memoryDropsTable = pgTable(
  "memory_drops",
  {
    id: serial("id").primaryKey(),
    senderUserId: varchar("sender_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    note: text("note"),
    photoUrl: text("photo_url"),
    linkedMemoryId: integer("linked_memory_id").references(() => memoriesTable.id, { onDelete: "set null" }),
    status: text("status").notNull().default("delivered"), // delivered | opened | reacted
    reaction: text("reaction"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    reactedAt: timestamp("reacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_drops_recipient").on(t.recipientUserId),
    index("idx_drops_sender").on(t.senderUserId),
  ],
);

export type MemoryDrop = typeof memoryDropsTable.$inferSelect;
export type InsertMemoryDrop = typeof memoryDropsTable.$inferInsert;
