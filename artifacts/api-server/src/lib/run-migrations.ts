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
