/**
 * Connections API — friend requests, accepts, declines, blocks.
 *
 * All routes auth-guarded. Sender identity derived from session only.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, or, and, ne } from "drizzle-orm";
import { db, connectionsTable, usersTable, notificationsTable } from "@workspace/db";
import { emitToUser } from "./events";

const router: IRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

/** Returns the canonical connection row between two users (order-independent). */
async function getConnectionBetween(userA: string, userB: string) {
  return db.query.connectionsTable.findFirst({
    where: or(
      and(eq(connectionsTable.requesterUserId, userA), eq(connectionsTable.recipientUserId, userB)),
      and(eq(connectionsTable.requesterUserId, userB), eq(connectionsTable.recipientUserId, userA)),
    ),
  });
}

// ── GET /api/connections ───────────────────────────────────────────────────
// Returns all accepted connections for the current user

router.get("/connections", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  const rows = await db.query.connectionsTable.findMany({
    where: and(
      or(eq(connectionsTable.requesterUserId, userId), eq(connectionsTable.recipientUserId, userId)),
      eq(connectionsTable.status, "accepted"),
    ),
  });

  // Enrich with the other user's info
  const otherIds = rows.map((r) => (r.requesterUserId === userId ? r.recipientUserId : r.requesterUserId));
  const users = otherIds.length > 0
    ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username, displayName: usersTable.displayName, profileImageUrl: usersTable.profileImageUrl })
        .from(usersTable)
        .then((all) => all.filter((u) => otherIds.includes(u.id)))
    : [];

  const result = rows.map((r) => {
    const otherId = r.requesterUserId === userId ? r.recipientUserId : r.requesterUserId;
    return { ...r, otherUser: users.find((u) => u.id === otherId) ?? null };
  });

  res.json({ connections: result });
});

// ── GET /api/connections/pending ───────────────────────────────────────────
// Returns pending incoming requests for the current user

router.get("/connections/pending", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  const rows = await db.query.connectionsTable.findMany({
    where: and(eq(connectionsTable.recipientUserId, userId), eq(connectionsTable.status, "pending")),
  });

  const requesterIds = rows.map((r) => r.requesterUserId);
  const users = requesterIds.length > 0
    ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username, displayName: usersTable.displayName, profileImageUrl: usersTable.profileImageUrl })
        .from(usersTable)
        .then((all) => all.filter((u) => requesterIds.includes(u.id)))
    : [];

  const result = rows.map((r) => ({ ...r, requester: users.find((u) => u.id === r.requesterUserId) ?? null }));
  res.json({ pending: result });
});

// ── POST /api/connections ──────────────────────────────────────────────────
// Send a connection request to another user

router.post("/connections", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const senderId = req.user!.id;
  const { recipientUserId } = req.body as { recipientUserId: string };

  if (!recipientUserId) { res.status(400).json({ error: "recipientUserId required" }); return; }
  if (recipientUserId === senderId) { res.status(400).json({ error: "Cannot connect with yourself" }); return; }

  // Check recipient exists
  const recipient = await db.query.usersTable.findFirst({ where: eq(usersTable.id, recipientUserId) });
  if (!recipient) { res.status(404).json({ error: "User not found" }); return; }

  // Check no existing connection
  const existing = await getConnectionBetween(senderId, recipientUserId);
  if (existing) {
    if (existing.status === "blocked") { res.status(403).json({ error: "Cannot connect" }); return; }
    res.status(409).json({ error: "Connection already exists", connection: existing }); return;
  }

  const [conn] = await db.insert(connectionsTable).values({
    requesterUserId: senderId,
    recipientUserId,
    status: "pending",
  }).returning();

  // Notify recipient
  await db.insert(notificationsTable).values({
    userId: recipientUserId,
    type: "connection_request",
    title: "New connection request",
    message: `${req.user!.firstName ?? "Someone"} wants to connect on Daymark 💜`,
  });
  emitToUser(recipientUserId, "connection.requested", { id: conn.id });

  res.status(201).json({ connection: conn });
});

// ── PATCH /api/connections/:id/accept ─────────────────────────────────────

router.patch("/connections/:id/accept", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const connId = Number(req.params.id);

  const conn = await db.query.connectionsTable.findFirst({ where: eq(connectionsTable.id, connId) });
  if (!conn || conn.recipientUserId !== userId) { res.status(404).json({ error: "Not found" }); return; }
  if (conn.status !== "pending") { res.status(409).json({ error: "Not pending" }); return; }

  const [updated] = await db.update(connectionsTable)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(connectionsTable.id, connId))
    .returning();

  // Notify requester
  await db.insert(notificationsTable).values({
    userId: conn.requesterUserId,
    type: "connection_accepted",
    title: "Connection accepted",
    message: `${req.user!.firstName ?? "Someone"} accepted your Daymark connection 💜`,
  });
  emitToUser(conn.requesterUserId, "connection.accepted", { id: conn.id });

  res.json({ connection: updated });
});

// ── PATCH /api/connections/:id/decline ────────────────────────────────────

router.patch("/connections/:id/decline", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const connId = Number(req.params.id);

  const conn = await db.query.connectionsTable.findFirst({ where: eq(connectionsTable.id, connId) });
  if (!conn || conn.recipientUserId !== userId) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(connectionsTable)
    .set({ status: "declined" })
    .where(eq(connectionsTable.id, connId))
    .returning();

  res.json({ connection: updated });
});

// ── PATCH /api/connections/:id/block ──────────────────────────────────────

router.patch("/connections/:id/block", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const connId = Number(req.params.id);

  const conn = await db.query.connectionsTable.findFirst({ where: eq(connectionsTable.id, connId) });
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }

  // Only a party to the connection can block
  if (conn.requesterUserId !== userId && conn.recipientUserId !== userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [updated] = await db.update(connectionsTable)
    .set({ status: "blocked" })
    .where(eq(connectionsTable.id, connId))
    .returning();

  res.json({ connection: updated });
});

// ── DELETE /api/connections/:id ────────────────────────────────────────────

router.delete("/connections/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const connId = Number(req.params.id);

  const conn = await db.query.connectionsTable.findFirst({ where: eq(connectionsTable.id, connId) });
  if (!conn || (conn.requesterUserId !== userId && conn.recipientUserId !== userId)) {
    res.status(404).json({ error: "Not found" }); return;
  }

  await db.delete(connectionsTable).where(eq(connectionsTable.id, connId));
  res.status(204).send();
});

// ── GET /api/users/search?q=username ──────────────────────────────────────
// Find a Daymark user by @username (no full directory)

router.get("/users/search", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const q = String(req.query.q ?? "").toLowerCase().replace(/^@/, "").trim();

  if (!q || q.length < 2) { res.json({ users: [] }); return; }

  const found = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    profileImageUrl: usersTable.profileImageUrl,
    discoverableByUsername: usersTable.discoverableByUsername,
  })
    .from(usersTable)
    .then((all) =>
      all.filter(
        (u) =>
          u.id !== userId &&
          u.discoverableByUsername &&
          u.username?.toLowerCase().includes(q),
      ).slice(0, 10)
    );

  // Annotate with connection status
  const enriched = await Promise.all(
    found.map(async (u) => {
      const conn = await getConnectionBetween(userId, u.id);
      return { ...u, connectionStatus: conn?.status ?? null, connectionId: conn?.id ?? null };
    }),
  );

  res.json({ users: enriched });
});

export default router;
