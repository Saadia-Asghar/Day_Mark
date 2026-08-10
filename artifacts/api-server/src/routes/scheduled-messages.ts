/**
 * Messages for Later — scheduled future messages between connected Daymark users.
 *
 * Delivery is handled by the background scheduler (src/lib/scheduler.ts).
 * All routes auth-guarded; sender always derived from session.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, scheduledMessagesTable, usersTable, connectionsTable } from "@workspace/db";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

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

// ── GET /api/messages ──────────────────────────────────────────────────────

router.get("/messages", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [sent, received, scheduled] = await Promise.all([
    db.query.scheduledMessagesTable.findMany({
      where: and(eq(scheduledMessagesTable.senderUserId, userId), eq(scheduledMessagesTable.status, "sent")),
      orderBy: (t, { desc }) => [desc(t.sentAt)],
    }),
    db.query.scheduledMessagesTable.findMany({
      where: and(eq(scheduledMessagesTable.recipientUserId, userId), eq(scheduledMessagesTable.status, "sent")),
      orderBy: (t, { desc }) => [desc(t.sentAt)],
    }),
    db.query.scheduledMessagesTable.findMany({
      where: and(eq(scheduledMessagesTable.senderUserId, userId), eq(scheduledMessagesTable.status, "scheduled")),
      orderBy: (t, { asc }) => [asc(t.deliveryTimestamp)],
    }),
  ]);

  // Enrich with user info
  const userIds = [...new Set([...sent.map((m) => m.recipientUserId), ...received.map((m) => m.senderUserId), ...scheduled.map((m) => m.recipientUserId)])];
  const users = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username, displayName: usersTable.displayName, profileImageUrl: usersTable.profileImageUrl })
    .from(usersTable)
    .then((all) => all.filter((u) => userIds.includes(u.id)));

  const enrich = (msg: typeof scheduledMessagesTable.$inferSelect, otherId: string) => ({
    ...msg,
    otherUser: users.find((u) => u.id === otherId) ?? null,
  });

  res.json({
    received: received.map((m) => enrich(m, m.senderUserId)),
    scheduled: scheduled.map((m) => enrich(m, m.recipientUserId)),
    sent: sent.map((m) => enrich(m, m.recipientUserId)),
  });
});

// ── POST /api/messages ─────────────────────────────────────────────────────

router.post("/messages", async (req, res): Promise<void> => {
  const senderId = requireAuth(req, res);
  if (!senderId) return;

  const {
    recipientUserId,
    title,
    message,
    mediaUrls = [],
    deliveryTimestamp,
    deliveryTimezone = "UTC",
    occasionType = "custom",
    repeatType = "none",
  } = req.body as {
    recipientUserId: string;
    title?: string;
    message: string;
    mediaUrls?: string[];
    deliveryTimestamp: string;
    deliveryTimezone?: string;
    occasionType?: string;
    repeatType?: string;
  };

  if (!recipientUserId || !message || !deliveryTimestamp) {
    res.status(400).json({ error: "recipientUserId, message, and deliveryTimestamp are required" }); return;
  }

  // Only connected users can exchange messages
  const connected = await isConnected(senderId, recipientUserId);
  if (!connected) { res.status(403).json({ error: "You must be connected with this user to send a message" }); return; }

  const deliveryDate = new Date(deliveryTimestamp);
  if (isNaN(deliveryDate.getTime()) || deliveryDate <= new Date()) {
    res.status(400).json({ error: "deliveryTimestamp must be a valid future date" }); return;
  }

  const [msg] = await db.insert(scheduledMessagesTable).values({
    senderUserId: senderId,
    recipientUserId,
    title: title ?? null,
    message,
    mediaUrls,
    deliveryTimestamp: deliveryDate,
    deliveryTimezone,
    occasionType,
    repeatType,
    status: "scheduled",
  }).returning();

  res.status(201).json({ message: msg });
});

// ── PATCH /api/messages/:id ────────────────────────────────────────────────

router.patch("/messages/:id", async (req, res): Promise<void> => {
  const senderId = requireAuth(req, res);
  if (!senderId) return;
  const id = Number(req.params.id);

  const msg = await db.query.scheduledMessagesTable.findFirst({ where: eq(scheduledMessagesTable.id, id) });
  if (!msg || msg.senderUserId !== senderId) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.status !== "scheduled") { res.status(409).json({ error: "Cannot edit a message that has already been sent" }); return; }

  const { title, message, deliveryTimestamp, deliveryTimezone } = req.body as Record<string, string>;
  const updates: Partial<typeof scheduledMessagesTable.$inferInsert> = {};
  if (title !== undefined) updates.title = title;
  if (message !== undefined) updates.message = message;
  if (deliveryTimestamp) updates.deliveryTimestamp = new Date(deliveryTimestamp);
  if (deliveryTimezone) updates.deliveryTimezone = deliveryTimezone;

  const [updated] = await db.update(scheduledMessagesTable).set(updates).where(eq(scheduledMessagesTable.id, id)).returning();
  res.json({ message: updated });
});

// ── DELETE /api/messages/:id (cancel) ─────────────────────────────────────

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const senderId = requireAuth(req, res);
  if (!senderId) return;
  const id = Number(req.params.id);

  const msg = await db.query.scheduledMessagesTable.findFirst({ where: eq(scheduledMessagesTable.id, id) });
  if (!msg || msg.senderUserId !== senderId) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.status === "sent") { res.status(409).json({ error: "Cannot cancel a delivered message" }); return; }

  await db.update(scheduledMessagesTable).set({ status: "cancelled" }).where(eq(scheduledMessagesTable.id, id));
  res.status(204).send();
});

export default router;
