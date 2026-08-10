/**
 * Secure memory share links.
 *
 * POST /api/memories/:id/share-link  — create a time-limited token
 * GET  /api/memories/:id/share-links — list active links for a memory
 * DELETE /api/memories/:id/share-link/:linkId — revoke a link
 * GET  /m/:token                     — public: view approved fields only
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { db, memoryShareLinksTable, memoriesTable, pool } from "@workspace/db";
import pino from "pino";

const logger = pino({ name: "share-links" });
const router: IRouter = Router();

// ── Apply migration on startup ─────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_share_links (
        id SERIAL PRIMARY KEY,
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        owner_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_share_links_memory ON memory_share_links(memory_id);
      CREATE INDEX IF NOT EXISTS idx_share_links_token  ON memory_share_links(token);
    `);
  } catch (e: any) {
    logger.warn({ err: e?.message }, "share_links migration skipped (already applied?)");
  }
})();

function requireAuth(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

// ── POST /api/memories/:id/share-link ──────────────────────────────────────
router.post("/memories/:id/share-link", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const memoryId = Number(req.params.id);
  const { expiryHours }: { expiryHours?: number | null } = req.body ?? {};

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, memoryId) });
  if (!memory || memory.userId !== userId) { res.status(404).json({ error: "Not found" }); return; }

  const token = randomBytes(32).toString("hex");
  const expiresAt = expiryHours ? new Date(Date.now() + expiryHours * 3_600_000) : null;

  const [link] = await db.insert(memoryShareLinksTable).values({
    memoryId,
    ownerUserId: userId,
    token,
    expiresAt,
  }).returning();

  const base = (process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "");
  res.json({ link, url: `${base}/m/${token}` });
});

// ── GET /api/memories/:id/share-links ──────────────────────────────────────
router.get("/memories/:id/share-links", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const memoryId = Number(req.params.id);

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, memoryId) });
  if (!memory || memory.userId !== userId) { res.status(404).json({ error: "Not found" }); return; }

  const links = await db.select().from(memoryShareLinksTable)
    .where(and(
      eq(memoryShareLinksTable.memoryId, memoryId),
      isNull(memoryShareLinksTable.revokedAt),
    ));

  res.json({ links });
});

// ── DELETE /api/memories/:id/share-link/:linkId ────────────────────────────
router.delete("/memories/:id/share-link/:linkId", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const linkId = Number(req.params.linkId);

  await db.update(memoryShareLinksTable)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(memoryShareLinksTable.id, linkId),
      eq(memoryShareLinksTable.ownerUserId, userId),
    ));

  res.json({ ok: true });
});

// ── GET /m/:token  (PUBLIC — no auth required) ─────────────────────────────
router.get("/m/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  const link = await db.query.memoryShareLinksTable.findFirst({
    where: eq(memoryShareLinksTable.token, token),
  });

  if (!link) { res.status(404).json({ error: "Link not found" }); return; }
  if (link.revokedAt) { res.status(410).json({ error: "revoked" }); return; }
  if (link.expiresAt && link.expiresAt < new Date()) { res.status(410).json({ error: "expired" }); return; }

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, link.memoryId) });
  if (!memory) { res.status(404).json({ error: "Memory not found" }); return; }

  // Respond with only the owner-approved public fields — never expose userId, emails, or private content
  res.json({
    memory: {
      title: memory.title,
      date: memory.date,
      story: memory.story,
      category: memory.category,
      giftColor: memory.giftColor,
      photoUrls: memory.photoUrls ?? [],
      mood: (memory as any).mood ?? null,
      location: (memory as any).locationLabel ?? null,
    },
    expiresAt: link.expiresAt,
  });
});

export default router;
