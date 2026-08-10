/**
 * Invite Friends API
 *
 * POST /api/invites              — create an invite link
 * GET  /api/invites              — list my active invites
 * DELETE /api/invites/:id        — revoke an invite
 * GET  /api/invites/redeem/:token — get invite info (public, for new user landing)
 * POST /api/invites/redeem/:token — record a redemption (increments use_count)
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, invitesTable, usersTable, notificationsTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function getAuthUserId(req: Request): string | null {
  const auth = getAuth(req);
  return (auth?.sessionClaims?.userId as string | undefined) || auth?.userId || null;
}

// ── POST /api/invites ────────────────────────────────────────────────────
router.post("/invites", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { personId, expiryDays = 30 } = req.body as { personId?: number; expiryDays?: number };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000);

  const [invite] = await db.insert(invitesTable).values({
    inviterUserId: userId,
    token,
    personId: personId ?? null,
    expiresAt,
    maxUses: 10,
    useCount: 0,
  }).returning();

  const inviter = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const slug = inviter?.username ? `@${inviter.username}` : "";
  const base = process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "";
  const url = `${base}/join/${slug}?invite=${token}`;

  res.status(201).json({ invite, url });
});

// ── GET /api/invites ─────────────────────────────────────────────────────
router.get("/invites", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const invites = await db.query.invitesTable.findMany({
    where: and(
      eq(invitesTable.inviterUserId, userId),
      isNull(invitesTable.revokedAt),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const base = process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "";
  const inviter = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  const slug = inviter?.username ? `@${inviter.username}` : "";

  const withUrls = invites.map((inv) => ({
    ...inv,
    url: `${base}/join/${slug}?invite=${inv.token}`,
    isExpired: inv.expiresAt ? new Date() > inv.expiresAt : false,
    isExhausted: inv.useCount >= inv.maxUses,
  }));

  res.json({ invites: withUrls });
});

// ── DELETE /api/invites/:id ───────────────────────────────────────────────
router.delete("/invites/:id", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const inviteId = Number(req.params.id);
  const invite = await db.query.invitesTable.findFirst({
    where: and(eq(invitesTable.id, inviteId), eq(invitesTable.inviterUserId, userId)),
  });
  if (!invite) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(invitesTable).set({ revokedAt: new Date() }).where(eq(invitesTable.id, inviteId));
  res.status(204).send();
});

// ── GET /api/invites/redeem/:token — public, for new-user landing ─────
router.get("/invites/redeem/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  const invite = await db.query.invitesTable.findFirst({ where: eq(invitesTable.token, token) });

  if (!invite || invite.revokedAt) { res.status(404).json({ error: "Invite not found or revoked" }); return; }
  if (invite.expiresAt && new Date() > invite.expiresAt) { res.status(410).json({ error: "Invite expired" }); return; }
  if (invite.useCount >= invite.maxUses) { res.status(410).json({ error: "Invite exhausted" }); return; }

  // Only return safe public fields about the inviter
  const inviter = await db.query.usersTable.findFirst({ where: eq(usersTable.id, invite.inviterUserId) });

  res.json({
    valid: true,
    inviterName: inviter?.displayName ?? inviter?.firstName ?? "Someone",
    inviterUsername: inviter?.username ?? null,
    inviterAvatar: inviter?.profileImageUrl ?? null,
    personId: invite.personId,
  });
});

// ── POST /api/invites/redeem/:token — record redemption ──────────────────
router.post("/invites/redeem/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  const invite = await db.query.invitesTable.findFirst({ where: eq(invitesTable.token, token) });

  if (!invite || invite.revokedAt) { res.status(404).json({ error: "Invalid invite" }); return; }
  if (invite.expiresAt && new Date() > invite.expiresAt) { res.status(410).json({ error: "Expired" }); return; }
  if (invite.useCount >= invite.maxUses) { res.status(410).json({ error: "Exhausted" }); return; }

  await db.update(invitesTable)
    .set({ useCount: invite.useCount + 1 })
    .where(eq(invitesTable.id, invite.id));

  // Notify the inviter
  const userId = getAuthUserId(req);
  const redeemer = userId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }) : null;

  if (invite.inviterUserId) {
    await db.insert(notificationsTable).values({
      userId: invite.inviterUserId,
      type: "invite_redeemed",
      title: "Your invite was used 💜",
      message: redeemer
        ? `${redeemer.displayName ?? redeemer.firstName ?? "Someone"} joined Daymark with your invite!`
        : "Someone joined Daymark with your invite!",
    }).onConflictDoNothing();
  }

  res.json({ success: true, inviterUserId: invite.inviterUserId, personId: invite.personId });
});

export default router;
