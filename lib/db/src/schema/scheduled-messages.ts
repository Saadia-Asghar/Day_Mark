import { pgTable, serial, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * Messages for Later — scheduled future messages between connected Daymark users.
 *
 * occasionType: birthday | anniversary | graduation | good_luck | custom | just_because
 * repeatType:   none | yearly
 * status:       scheduled | sent | cancelled | failed
 *
 * deliveryTimestamp is stored in UTC. deliveryTimezone records the sender's
 * chosen timezone for display purposes.
 */
export const scheduledMessagesTable = pgTable(
  "scheduled_messages",
  {
    id: serial("id").primaryKey(),
    senderUserId: varchar("sender_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientUserId: varchar("recipient_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title"),
    message: text("message").notNull(),
    mediaUrls: text("media_urls").array().notNull().default([]),
    deliveryTimestamp: timestamp("delivery_timestamp", { withTimezone: true }).notNull(),
    deliveryTimezone: varchar("delivery_timezone").notNull().default("UTC"),
    occasionType: text("occasion_type").notNull().default("custom"),
    repeatType: text("repeat_type").notNull().default("none"),
    status: text("status").notNull().default("scheduled"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_sm_sender").on(t.senderUserId),
    index("idx_sm_recipient").on(t.recipientUserId),
    index("idx_sm_delivery").on(t.deliveryTimestamp, t.status),
  ],
);

export type ScheduledMessage = typeof scheduledMessagesTable.$inferSelect;
export type InsertScheduledMessage = typeof scheduledMessagesTable.$inferInsert;
