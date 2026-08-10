import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),
  inviterUserId: varchar("inviter_user_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  personId: integer("person_id"),          // set when inviting someone from My People
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxUses: integer("max_uses").notNull().default(10),
  useCount: integer("use_count").notNull().default(0),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
