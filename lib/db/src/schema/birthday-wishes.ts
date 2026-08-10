import { pgTable, serial, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";

export const birthdayWishesTable = pgTable("birthday_wishes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),           // FK → relationship_events.id
  senderUserId: varchar("sender_user_id").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  messageId: integer("message_id"),       // FK → scheduled_messages.id (optional)
  memoryDropId: integer("memory_drop_id"),
  futureGiftId: integer("future_gift_id"),
  type: text("type").notNull().default("text"), // text | memory | drop | future_gift
  wishText: text("wish_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
