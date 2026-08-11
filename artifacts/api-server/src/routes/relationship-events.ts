/**
 * Relationship Events API — birthdays, anniversaries, and other important dates.
 *
 * GET  /api/relationship-events         — list owner's events
 * POST /api/relationship-events         — create event
 * PATCH /api/relationship-events/:id    — update event
 * DELETE /api/relationship-events/:id   — delete event
 * GET  /api/relationship-events/upcoming — events in next N days
 * GET  /api/birthday-wishes/:userId     — wishes for a user (today's birthday)
 * POST /api/birthday-wishes             — send a wish
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, relationshipEventsTable, birthdayWishesTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth } from '../middlewares/requireAuth';
import { emitToUser } from "./events";

const router: IRouter = Router();

// ── GET /api/relationship-events ─────────────────────────────────────────
router.get("/relationship-events", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const events = await db.query.relationshipEventsTable.findMany({
    where: eq(relationshipEventsTable.ownerUserId, userId),
    orderBy: (t, { asc }) => [asc(t.eventMonth), asc(t.eventDay)],
  });
  res.json({ events });
});

// ── GET /api/relationship-events/upcoming ────────────────────────────────
router.get("/relationship-events/upcoming", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const days = Math.min(Number(req.query.days ?? 30), 90);
  const now = new Date();

  const events = await db.query.relationshipEventsTable.findMany({
    where: eq(relationshipEventsTable.ownerUserId, userId),
  });

  // Compute next occurrence for each event
  const withDays = events.map((ev) => {
    const thisYear = now.getFullYear();
    let next = new Date(thisYear, ev.eventMonth - 1, ev.eventDay);
    if (next < now) next = new Date(thisYear + 1, ev.eventMonth - 1, ev.eventDay);
    const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
    return { ...ev, nextDate: next.toISOString().split("T")[0], daysUntil };
  });

  const upcoming = withDays
    .filter((e) => e.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  res.json({ events: upcoming });
});

// ── POST /api/relationship-events ────────────────────────────────────────
router.post("/relationship-events", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const { personId, linkedUserId, type, title, eventMonth, eventDay, eventYear, timezone, isRecurring, visibility, reminderDays } = req.body as {
    personId?: number;
    linkedUserId?: string;
    type: string;
    title: string;
    eventMonth: number;
    eventDay: number;
    eventYear?: number;
    timezone?: string;
    isRecurring?: boolean;
    visibility?: string;
    reminderDays?: string;
  };

  if (!type || !title || !eventMonth || !eventDay) {
    res.status(400).json({ error: "Missing required fields: type, title, eventMonth, eventDay" });
    return;
  }

  const [event] = await db.insert(relationshipEventsTable).values({
    ownerUserId: userId,
    personId: personId ?? null,
    linkedUserId: linkedUserId ?? null,
    type,
    title,
    eventMonth,
    eventDay,
    eventYear: eventYear ?? null,
    timezone: timezone ?? "UTC",
    isRecurring: isRecurring ?? true,
    visibility: visibility ?? "private",
    reminderDays: reminderDays ?? "7,3,1,0",
  }).returning();

  res.status(201).json({ event });
});

// ── PATCH /api/relationship-events/:id ──────────────────────────────────
router.patch("/relationship-events/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const eventId = Number(req.params.id);
  const existing = await db.query.relationshipEventsTable.findFirst({
    where: and(eq(relationshipEventsTable.id, eventId), eq(relationshipEventsTable.ownerUserId, userId)),
  });
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof relationshipEventsTable.$inferInsert> = {};
  if (body.title !== undefined) updates.title = body.title as string;
  if (body.eventMonth !== undefined) updates.eventMonth = body.eventMonth as number;
  if (body.eventDay !== undefined) updates.eventDay = body.eventDay as number;
  if (body.eventYear !== undefined) updates.eventYear = body.eventYear as number | null;
  if (body.timezone !== undefined) updates.timezone = body.timezone as string;
  if (body.isRecurring !== undefined) updates.isRecurring = body.isRecurring as boolean;
  if (body.visibility !== undefined) updates.visibility = body.visibility as string;
  if (body.reminderDays !== undefined) updates.reminderDays = body.reminderDays as string;

  const [updated] = await db.update(relationshipEventsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(relationshipEventsTable.id, eventId))
    .returning();

  res.json({ event: updated });
});

// ── DELETE /api/relationship-events/:id ─────────────────────────────────
router.delete("/relationship-events/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const eventId = Number(req.params.id);
  const existing = await db.query.relationshipEventsTable.findFirst({
    where: and(eq(relationshipEventsTable.id, eventId), eq(relationshipEventsTable.ownerUserId, userId)),
  });
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(relationshipEventsTable).where(eq(relationshipEventsTable.id, eventId));
  res.status(204).send();
});

// ── GET /api/birthday-wishes/:userId ────────────────────────────────────
// Returns wishes sent to a user today (for the birthday wall)
router.get("/birthday-wishes/:userId", requireAuth, async (req, res): Promise<void> => {
  const callerId = req.dbUser.id;
  const targetUserId = String(req.params.userId);

  const wishes = await db.query.birthdayWishesTable.findMany({
    where: eq(birthdayWishesTable.recipientUserId, targetUserId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 50,
  });

  // Enrich with sender names (non-sensitive fields only)
  const senderIds = [...new Set(wishes.map((w) => w.senderUserId))];
  const senders = senderIds.length > 0
    ? await db.select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        displayName: usersTable.displayName,
        username: usersTable.username,
        profileImageUrl: usersTable.profileImageUrl,
      }).from(usersTable).then((all) => all.filter((u) => senderIds.includes(u.id)))
    : [];

  const enriched = wishes.map((w) => ({
    id: w.id,
    type: w.type,
    createdAt: w.createdAt,
    // Only expose wish text if the caller is the recipient
    wishText: w.recipientUserId === callerId ? w.wishText : undefined,
    sender: senders.find((s) => s.id === w.senderUserId) ?? null,
  }));

  res.json({ wishes: enriched, total: enriched.length });
});

// ── POST /api/birthday-wishes ────────────────────────────────────────────
router.post("/birthday-wishes", requireAuth, async (req, res): Promise<void> => {
  const senderId = req.dbUser.id;

  const { recipientUserId, eventId, wishText, type = "text" } = req.body as {
    recipientUserId: string;
    eventId?: number;
    wishText?: string;
    type?: string;
  };

  if (!recipientUserId) { res.status(400).json({ error: "recipientUserId required" }); return; }

  // Prevent self-wishing
  if (recipientUserId === senderId) { res.status(400).json({ error: "Cannot wish yourself" }); return; }

  const recipient = await db.query.usersTable.findFirst({ where: eq(usersTable.id, recipientUserId) });
  if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }

  const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, senderId) });

  const [wish] = await db.insert(birthdayWishesTable).values({
    eventId: eventId ?? null,
    senderUserId: senderId,
    recipientUserId,
    type,
    wishText: wishText ?? null,
  }).returning();

  // Notify recipient
  await db.insert(notificationsTable).values({
    userId: recipientUserId,
    type: "birthday_wish",
    title: "Birthday wish 🎂",
    message: `${sender?.displayName ?? sender?.firstName ?? "Someone"} wished you a happy birthday 💜`,
  }).onConflictDoNothing();

  // Real-time SSE
  emitToUser(recipientUserId, "birthdayWish.created", { wishId: wish.id, senderUserId: senderId });

  res.status(201).json({ wish });
});

export default router;
