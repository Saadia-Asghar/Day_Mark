import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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
  // Supabase Auth UUID — the external identity from Supabase Auth.
  // Separate from `id` so existing rows keep their stable internal PK.
  supabaseId: varchar('supabase_id').unique(),
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
  allowConnectionRequests: boolean('allow_connection_requests').notNull().default(true),
  /** nobody | connections | public_badge */
  birthdayVisibility: varchar('birthday_visibility', { length: 30 }).notNull().default('nobody'),
  allowBirthdayWishesFromConnections: boolean('allow_birthday_wishes_connections').notNull().default(true),
  allowBirthdayWishesFromGlobe: boolean('allow_birthday_wishes_globe').notNull().default(false),
  /** private | connections | public */
  defaultMemoryVisibility: varchar('default_memory_visibility', { length: 20 }).notNull().default('private'),
  /** anonymous | username */
  defaultGlobeIdentity: varchar('default_globe_identity', { length: 20 }).notNull().default('anonymous'),
  /** city | region | country | hidden */
  defaultGlobeLocation: varchar('default_globe_location', { length: 20 }).notNull().default('city'),
  showPublicProfile: boolean('show_public_profile').notNull().default(false),

  // ── Notification preferences (JSON map of toggle keys → boolean) ─────
  notificationSettings: jsonb('notification_settings').$type<Record<string, boolean>>().default({}),

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
