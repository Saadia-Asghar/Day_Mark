import { pgTable, text, serial, timestamp, integer, varchar, index } from "drizzle-orm/pg-core";
import { memoriesTable } from "./memories";
import { usersTable } from "./auth";

export const memoryParticipantsTable = pgTable(
  "memory_participants",
  {
    id: serial("id").primaryKey(),
    memoryId: integer("memory_id")
      .notNull()
      .references(() => memoriesTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"), // owner | contributor | viewer
    invitedBy: varchar("invited_by").references(() => usersTable.id),
    status: text("status").notNull().default("pending"), // pending | accepted | declined
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_mp_memory_id").on(t.memoryId),
    index("idx_mp_user_id").on(t.userId),
  ],
);

export type MemoryParticipant = typeof memoryParticipantsTable.$inferSelect;
export type InsertMemoryParticipant = typeof memoryParticipantsTable.$inferInsert;
