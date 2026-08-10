import { pgTable, serial, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { memoriesTable } from "./memories";

/**
 * Secure time-limited share tokens for memories.
 *
 * A token is required to view a private memory via public link.
 * Tokens can be revoked at any time.
 * expiresAt = null means the link never expires.
 */
export const memoryShareLinksTable = pgTable(
  "memory_share_links",
  {
    id: serial("id").primaryKey(),
    memoryId: integer("memory_id")
      .notNull()
      .references(() => memoriesTable.id, { onDelete: "cascade" }),
    ownerUserId: varchar("owner_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_share_links_memory").on(t.memoryId),
    index("idx_share_links_token").on(t.token),
  ],
);

export type MemoryShareLink = typeof memoryShareLinksTable.$inferSelect;
export type InsertMemoryShareLink = typeof memoryShareLinksTable.$inferInsert;
