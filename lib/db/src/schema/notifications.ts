import { pgTable, serial, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const notificationsTable = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message'),
    relatedMemoryId: integer('related_memory_id'),
    relatedFutureGiftId: integer('related_future_gift_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId)],
);
