import { pgTable, serial, varchar, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * Daymark connections (friend requests / accepted friendships).
 *
 * Statuses:
 *  pending  — request sent, not yet acted on
 *  accepted — both users are connected; Daylinks, scheduled messages, shared memories allowed
 *  declined — recipient said no
 *  blocked  — requester or recipient blocked the other
 */
export const connectionsTable = pgTable(
  "connections",
  {
    id: serial("id").primaryKey(),
    requesterUserId: varchar("requester_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | accepted | declined | blocked
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Only one connection record per ordered pair
    uniqueIndex("idx_connections_pair").on(t.requesterUserId, t.recipientUserId),
    index("idx_connections_requester").on(t.requesterUserId),
    index("idx_connections_recipient").on(t.recipientUserId),
  ],
);

export type Connection = typeof connectionsTable.$inferSelect;
export type InsertConnection = typeof connectionsTable.$inferInsert;
