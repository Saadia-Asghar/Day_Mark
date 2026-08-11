/**
 * Startup migrations — raw SQL applied via pg Pool.
 * Uses CREATE TABLE IF NOT EXISTS so it is safe to re-run on every start.
 */
import { pool } from "@workspace/db";
import pino from "pino";

const logger = pino({ name: "migrations" });

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── relationship_events ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS relationship_events (
        id SERIAL PRIMARY KEY,
        owner_user_id VARCHAR NOT NULL,
        person_id INTEGER,
        linked_user_id VARCHAR,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        event_month INTEGER NOT NULL,
        event_day INTEGER NOT NULL,
        event_year INTEGER,
        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        is_recurring BOOLEAN NOT NULL DEFAULT true,
        visibility TEXT NOT NULL DEFAULT 'private',
        reminder_days TEXT NOT NULL DEFAULT '7,3,1,0',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS re_owner ON relationship_events(owner_user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS re_month_day ON relationship_events(event_month, event_day)`);

    // ── birthday_wishes ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_wishes (
        id SERIAL PRIMARY KEY,
        event_id INTEGER,
        sender_user_id VARCHAR NOT NULL,
        recipient_user_id VARCHAR NOT NULL,
        message_id INTEGER,
        memory_drop_id INTEGER,
        future_gift_id INTEGER,
        type TEXT NOT NULL DEFAULT 'text',
        wish_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS bw_recipient ON birthday_wishes(recipient_user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS bw_sender ON birthday_wishes(sender_user_id)`);

    // ── invites ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        inviter_user_id VARCHAR NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        person_id INTEGER,
        expires_at TIMESTAMPTZ,
        max_uses INTEGER NOT NULL DEFAULT 10,
        use_count INTEGER NOT NULL DEFAULT 0,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS inv_inviter ON invites(inviter_user_id)`);

    // ── monthly_capsules ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_capsules (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        summary_data JSONB NOT NULL DEFAULT '{}',
        opened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, year, month)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS mc_user ON monthly_capsules(user_id)`);

    // ── memory_share_links (ensure table exists from share-links route) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_share_links (
        id SERIAL PRIMARY KEY,
        memory_id INTEGER NOT NULL,
        owner_user_id VARCHAR NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── notifications: add dedup_key column if missing ───────────────────
    await client.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS dedup_key VARCHAR
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup
      ON notifications(user_id, dedup_key)
      WHERE dedup_key IS NOT NULL
    `);

    // ── relationship_event_reminders ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS relationship_event_reminders (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        reminder_type TEXT NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        dedupe_key VARCHAR(200) NOT NULL,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS rer_dedupe ON relationship_event_reminders(dedupe_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS rer_scheduled ON relationship_event_reminders(scheduled_for, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS rer_user ON relationship_event_reminders(user_id)`);

    // ── users: supabase_id — external Supabase Auth UUID ────────────────
    // Separate from the stable internal id PK so FK constraints stay intact.
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR`,
    );
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_id_idx ON users(supabase_id) WHERE supabase_id IS NOT NULL`,
    );

    // ── users: privacy + notification preference columns ─────────────────
    for (const stmt of [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_connection_requests BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday_visibility VARCHAR(30) NOT NULL DEFAULT 'nobody'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_birthday_wishes_connections BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_birthday_wishes_globe BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS default_memory_visibility VARCHAR(20) NOT NULL DEFAULT 'private'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS default_globe_identity VARCHAR(20) NOT NULL DEFAULT 'anonymous'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS default_globe_location VARCHAR(20) NOT NULL DEFAULT 'city'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS show_public_profile BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'`,
    ]) {
      await client.query(stmt);
    }

    // ── indexes for frequently queried fields ────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS users_username_idx ON users(username)`);
    await client.query(`CREATE INDEX IF NOT EXISTS conn_pair ON connections(requester_user_id, recipient_user_id, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS sm_delivery ON scheduled_messages(delivery_timestamp, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS notif_user_read ON notifications(user_id, read_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS mc_user_ym ON monthly_capsules(user_id, year, month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS inv_token ON invites(token)`);

    await client.query("COMMIT");
    logger.info("Migrations applied successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
