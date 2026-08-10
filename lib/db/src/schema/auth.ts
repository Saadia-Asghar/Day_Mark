import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable('users', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar('email').unique(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),

  // ── Social identity ──────────────────────────────────────────────────────
  // Unique @handle chosen during onboarding, e.g. "saadia"
  username: varchar('username', { length: 24 }).unique(),
  displayName: varchar('display_name', { length: 60 }),
  bio: varchar('bio', { length: 200 }),
  birthday: varchar('birthday'), // YYYY-MM-DD string, kept as varchar for flexibility
  timezone: varchar('timezone', { length: 64 }).default('UTC'),
  city: varchar('city', { length: 100 }),

  // ── Privacy ─────────────────────────────────────────────────────────────
  discoverableByUsername: boolean('discoverable_by_username').notNull().default(true),
  discoverableByEmail: boolean('discoverable_by_email').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
