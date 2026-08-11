/**
 * Memory Drops — lightweight person-to-person moment sends.
 * Not a chat system. One moment at a time.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, memoryDropsTable, usersTable, connectionsTable, notificationsTable } from "@workspace/db";
import { emitToUser } from "./events";
import { recordDaylinkActivity } from "./daylinks";
import { requireAuth } from '../middlewares/requireAuth';

const router: IRouter = Router();

async function isConnected(userA: string, userB: string): Promise<boolean> {
  const conn = await db.query.connectionsTable.findFirst({
    where: and(
      or(
        and(eq(connectionsTable.requesterUserId, userA), eq(connectionsTable.recipientUserId, userB)),
        and(eq(connectionsTable.requesterUserId, userB), eq(connectionsTable.recipientUserId, userA)),
      ),
      eq(connectionsTable.status, "accepted"),
    ),
  });
  return !!conn;
}

// ── GET /api/drops ─────────────────────────────────────────────────────────

router.get("/drops", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const received = await db.query.memoryDropsTable.findMany({
    where: eq(memoryDropsTable.recipientUserId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const senderIds = [...new Set(received.map((d) => d.senderUserId))];
  const senders = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, displayName: usersTable.displayName, username: usersTable.username, profileImageUrl: usersTable.profileImageUrl })
    .from(usersTable)
    .then((all) => all.filter((u) => senderIds.includes(u.id)));

  const enriched = received.map((d) => ({ ...d, sender: senders.find((u) => u.id === d.senderUserId) ?? null }));
  res.json({ drops: enriched });
});

// ── POST /api/drops ────────────────────────────────────────────────────────

router.post("/drops", requireAuth, async (req, res): Promise<void> => {
  const senderId = req.dbUser.id;

  const { recipientUserId, note, photoUrl, linkedMemoryId } = req.body as {
    recipientUserId: string;
    note?: string;
    photoUrl?: string;
    linkedMemoryId?: number;
  };

  if (!recipientUserId) { res.status(400).json({ error: "recipientUserId required" }); return; }
  if (!note && !photoUrl && !linkedMemoryId) { res.status(400).json({ error: "Provide a note, photo, or memory" }); return; }

  const connected = await isConnected(senderId, recipientUserId);
  if (!connected) { res.status(403).json({ error: "Must be connected to drop a moment" }); return; }

  const [drop] = await db.insert(memoryDropsTable).values({
    senderUserId: senderId,
    recipientUserId,
    note: note ?? null,
    photoUrl: photoUrl ?? null,
    linkedMemoryId: linkedMemoryId ?? null,
    status: "delivered",
  }).returning();

  // Notify recipient
  await db.insert(notificationsTable).values({
    userId: recipientUserId,
    type: "memory_drop",
    title: "A little moment arrived 💌",
    message: `${"Someone"} dropped you a little moment 💜`,
  });
  emitToUser(recipientUserId, "memoryDrop.created", { id: drop.id });

  res.status(201).json({ drop });
});

// ── PATCH /api/drops/:id/react ─────────────────────────────────────────────

router.patch("/drops/:id/react", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;
  const dropId = Number(req.params.id);
  const { reaction } = req.body as { reaction: string };

  const VALID_REACTIONS = ["💜", "✨", "🥹", "😂"];
  if (!VALID_REACTIONS.includes(reaction)) { res.status(400).json({ error: "Invalid reaction" }); return; }

  const drop = await db.query.memoryDropsTable.findFirst({ where: eq(memoryDropsTable.id, dropId) });
  if (!drop || drop.recipientUserId !== userId) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(memoryDropsTable).set({
    reaction,
    status: "reacted",
    openedAt: drop.openedAt ?? new Date(),
    reactedAt: new Date(),
  }).where(eq(memoryDropsTable.id, dropId)).returning();

  // A reaction qualifies for DayLink (sender is original sender, other is reactor)
  await recordDaylinkActivity(userId, drop.senderUserId, "memory_drop", drop.id);

  // Notify sender
  await db.insert(notificationsTable).values({
    userId: drop.senderUserId,
    type: "memory_drop",
    title: "Someone reacted to your moment",
    message: `${"Someone"} reacted ${reaction} to your memory drop`,
  });
  emitToUser(drop.senderUserId, "memoryDrop.created", { id: drop.id });

  res.json({ drop: updated });
});

// ── PATCH /api/drops/:id/open ─────────────────────────────────────────────

router.patch("/drops/:id/open", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;
  const dropId = Number(req.params.id);

  const drop = await db.query.memoryDropsTable.findFirst({ where: eq(memoryDropsTable.id, dropId) });
  if (!drop || drop.recipientUserId !== userId) { res.status(404).json({ error: "Not found" }); return; }

  if (drop.openedAt) { res.json({ drop }); return; } // already opened

  const [updated] = await db.update(memoryDropsTable).set({
    status: "opened",
    openedAt: new Date(),
  }).where(eq(memoryDropsTable.id, dropId)).returning();

  res.json({ drop: updated });
});

export default router;
