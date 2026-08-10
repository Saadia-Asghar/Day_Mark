/**
 * Memory Globe API
 *
 * Only memories explicitly marked visibility='public_globe' are returned.
 * Responses contain a strict public DTO — no private fields, no exact coordinates.
 * Blocking is enforced for authenticated requests.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, memoriesTable, usersTable, connectionsTable, notificationsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

// ── Public DTO builder ─────────────────────────────────────────────────────
function toPublicDTO(memory: typeof memoriesTable.$inferSelect, ownerUsername?: string | null, ownerDisplayName?: string | null) {
  return {
    publicId: memory.id,
    caption: memory.globeCaption ?? memory.title,
    photoUrl: memory.globeShowPhoto ? (memory.photoUrls?.[0] ?? null) : null,
    category: memory.category,
    locationLabel: memory.globeLocationLabel ?? null,
    // Approximate coordinates only — never exact GPS
    approximateLatitude: memory.globeLatitudeApprox ?? null,
    approximateLongitude: memory.globeLongitudeApprox ?? null,
    precision: memory.globePrecision ?? "city",
    displayName: memory.globeAnonymous
      ? "Anonymous"
      : (memory.globeShowUsername ? (ownerDisplayName ?? ownerUsername ?? "Someone") : "Anonymous"),
    username: (memory.globeAnonymous || !memory.globeShowUsername) ? null : ownerUsername,
    date: memory.globeShowDate ? memory.date : null,
    publishedAt: memory.globePublishedAt,
  };
}

// ── GET /api/globe/memories ────────────────────────────────────────────────

router.get("/globe/memories", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const since = req.query.since ? new Date(String(req.query.since)) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;

  let publicMemories = await db.query.memoriesTable.findMany({
    where: eq(memoriesTable.visibility, "public_globe"),
    orderBy: (t, { desc }) => [desc(t.globePublishedAt)],
    limit: limit + 50, // over-fetch for blocking filter
  });

  // Filter by category
  if (category) publicMemories = publicMemories.filter((m) => m.category === category);

  // Filter by since
  if (since) publicMemories = publicMemories.filter((m) => m.globePublishedAt && m.globePublishedAt > since);

  // If authenticated, filter out blocked users
  if (req.isAuthenticated()) {
    const myId = req.user!.id;
    const blocked = await db.query.connectionsTable.findMany({
      where: and(
        eq(connectionsTable.status, "blocked"),
        // any connection involving me
      ),
    });
    const blockedIds = blocked
      .filter((c) => c.requesterUserId === myId || c.recipientUserId === myId)
      .map((c) => (c.requesterUserId === myId ? c.recipientUserId : c.requesterUserId));

    publicMemories = publicMemories.filter((m) => m.userId && !blockedIds.includes(m.userId));
  }

  publicMemories = publicMemories.slice(0, limit);

  // Enrich with owner usernames
  const ownerIds = [...new Set(publicMemories.map((m) => m.userId).filter(Boolean))] as string[];
  const owners = await db.select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName })
    .from(usersTable)
    .then((all) => all.filter((u) => ownerIds.includes(u.id)));

  const dtos = publicMemories.map((m) => {
    const owner = owners.find((o) => o.id === m.userId);
    return toPublicDTO(m, owner?.username, owner?.displayName);
  });

  res.json({ memories: dtos, total: dtos.length });
});

// ── POST /api/memories/:id/publish-globe ──────────────────────────────────

router.post("/memories/:id/publish-globe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user!.id;
  const memoryId = Number(req.params.id);

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, memoryId) });
  if (!memory || memory.userId !== userId) { res.status(404).json({ error: "Memory not found" }); return; }

  const {
    caption,
    latitudeApprox,
    longitudeApprox,
    locationLabel,
    precision = "city",
    anonymous = false,
    showUsername = true,
    showDate = true,
    showPhoto = true,
  } = req.body as {
    caption?: string;
    latitudeApprox?: number;
    longitudeApprox?: number;
    locationLabel?: string;
    precision?: string;
    anonymous?: boolean;
    showUsername?: boolean;
    showDate?: boolean;
    showPhoto?: boolean;
  };

  const [updated] = await db.update(memoriesTable).set({
    visibility: "public_globe",
    globePublishedAt: new Date(),
    globeCaption: caption ?? memory.globeCaption,
    globeLatitudeApprox: latitudeApprox ?? memory.globeLatitudeApprox,
    globeLongitudeApprox: longitudeApprox ?? memory.globeLongitudeApprox,
    globeLocationLabel: locationLabel ?? memory.globeLocationLabel,
    globePrecision: precision,
    globeAnonymous: anonymous,
    globeShowUsername: showUsername,
    globeShowDate: showDate,
    globeShowPhoto: showPhoto,
  }).where(eq(memoriesTable.id, memoryId)).returning();

  res.json({ memory: updated });
});

// ── PATCH /api/memories/:id/globe-settings ────────────────────────────────

router.patch("/memories/:id/globe-settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user!.id;
  const memoryId = Number(req.params.id);

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, memoryId) });
  if (!memory || memory.userId !== userId) { res.status(404).json({ error: "Memory not found" }); return; }
  if (memory.visibility !== "public_globe") { res.status(400).json({ error: "Memory is not published to Globe" }); return; }

  const updates: Partial<typeof memoriesTable.$inferInsert> = {};
  const body = req.body as Record<string, unknown>;
  if (body.caption !== undefined) updates.globeCaption = body.caption as string;
  if (body.anonymous !== undefined) updates.globeAnonymous = body.anonymous as boolean;
  if (body.showUsername !== undefined) updates.globeShowUsername = body.showUsername as boolean;
  if (body.showDate !== undefined) updates.globeShowDate = body.showDate as boolean;
  if (body.showPhoto !== undefined) updates.globeShowPhoto = body.showPhoto as boolean;
  if (body.precision !== undefined) updates.globePrecision = body.precision as string;
  if (body.locationLabel !== undefined) updates.globeLocationLabel = body.locationLabel as string;

  const [updated] = await db.update(memoriesTable).set(updates).where(eq(memoriesTable.id, memoryId)).returning();
  res.json({ memory: updated });
});

// ── DELETE /api/memories/:id/globe ────────────────────────────────────────

router.delete("/memories/:id/globe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user!.id;
  const memoryId = Number(req.params.id);

  const memory = await db.query.memoriesTable.findFirst({ where: eq(memoriesTable.id, memoryId) });
  if (!memory || memory.userId !== userId) { res.status(404).json({ error: "Memory not found" }); return; }

  await db.update(memoriesTable).set({
    visibility: "private",
    globePublishedAt: null,
  }).where(eq(memoriesTable.id, memoryId));

  res.status(204).send();
});

// ── POST /api/globe/memories/:id/report ───────────────────────────────────

router.post("/globe/memories/:id/report", async (req, res): Promise<void> => {
  // Accept reports from anyone — no auth required to report
  const memoryId = Number(req.params.id);
  const { reason } = req.body as { reason: string };

  const memory = await db.query.memoriesTable.findFirst({
    where: and(eq(memoriesTable.id, memoryId), eq(memoriesTable.visibility, "public_globe")),
  });
  if (!memory) { res.status(404).json({ error: "Memory not found on Globe" }); return; }

  // Notify the memory owner that a report was received (logged internally)
  if (memory.userId) {
    await db.insert(notificationsTable).values({
      userId: memory.userId,
      type: "globe_report",
      title: "Memory reported",
      message: `Your Globe memory was reported for: ${reason ?? "unspecified"}`,
    });
  }

  res.status(204).send();
});

export default router;
