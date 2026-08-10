/**
 * Shared-memory participant routes.
 *
 * Roles:   owner | contributor | viewer
 * Status:  pending | accepted | declined
 *
 * Permission rules:
 *  owner        → can view, edit, delete, invite, remove
 *  contributor  → can view and add content (once accepted)
 *  viewer       → can view only (once accepted)
 *  pending/declined → no access
 *
 * All routes are auth-guarded and user-scoped.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, memoriesTable, memoryParticipantsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

// ── Permission helpers ────────────────────────────────────────────────────

export type MemoryRole = "owner" | "contributor" | "viewer";
export type ParticipantStatus = "pending" | "accepted" | "declined";

interface ParticipantRow {
  userId: string;
  role: string;
  status: string;
}

export function canViewMemory(userId: string, memoryOwnerId: string | null, participants: ParticipantRow[]) {
  if (userId === memoryOwnerId) return true;
  const p = participants.find((r) => r.userId === userId);
  return !!p && p.status === "accepted";
}

export function canEditMemory(userId: string, memoryOwnerId: string | null, participants: ParticipantRow[]) {
  if (userId === memoryOwnerId) return true;
  const p = participants.find((r) => r.userId === userId);
  return !!p && p.status === "accepted" && p.role === "contributor";
}

export function canDeleteMemory(userId: string, memoryOwnerId: string | null) {
  return userId === memoryOwnerId;
}

export function canInviteToMemory(userId: string, memoryOwnerId: string | null) {
  return userId === memoryOwnerId;
}

// ── Helper: load participants for a memory ────────────────────────────────

async function getParticipants(memoryId: number) {
  return db
    .select()
    .from(memoryParticipantsTable)
    .where(eq(memoryParticipantsTable.memoryId, memoryId));
}

// ── Helper: require memory ownership or accepted participation ────────────

async function requireAccess(
  req: Request,
  res: Response,
  memoryId: number,
  requireOwner = false,
): Promise<{ memory: typeof memoriesTable.$inferSelect; participants: Awaited<ReturnType<typeof getParticipants>> } | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const memory = await db.query.memoriesTable.findFirst({
    where: eq(memoriesTable.id, memoryId),
  });

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return null;
  }

  const participants = await getParticipants(memoryId);
  const userId = req.user.id;

  if (requireOwner) {
    if (!canDeleteMemory(userId, memory.userId)) {
      res.status(403).json({ error: "Only the memory owner can perform this action" });
      return null;
    }
  } else {
    if (!canViewMemory(userId, memory.userId, participants)) {
      res.status(404).json({ error: "Memory not found" });
      return null;
    }
  }

  return { memory, participants };
}

// ── GET /memories/:id/participants ────────────────────────────────────────

router.get("/memories/:id/participants", async (req, res): Promise<void> => {
  const memoryId = Number(req.params.id);
  if (isNaN(memoryId)) { res.status(400).json({ error: "Invalid memory ID" }); return; }

  const ctx = await requireAccess(req, res, memoryId);
  if (!ctx) return;

  const { participants } = ctx;

  // Fetch user details for each participant
  const userIds = participants.map((p) => p.userId);
  const userRows = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const result = participants.map((p) => {
    const u = userRows.find((u) => u.id === p.userId);
    return {
      id: p.id,
      userId: p.userId,
      role: p.role,
      status: p.status,
      invitedBy: p.invitedBy,
      createdAt: p.createdAt,
      user: u ? {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
      } : null,
    };
  });

  res.json({ participants: result });
});

// ── POST /memories/:id/participants — invite ──────────────────────────────

router.post("/memories/:id/participants", async (req, res): Promise<void> => {
  const memoryId = Number(req.params.id);
  if (isNaN(memoryId)) { res.status(400).json({ error: "Invalid memory ID" }); return; }

  const ctx = await requireAccess(req, res, memoryId, /* requireOwner */ true);
  if (!ctx) return;

  const { userId: inviteeId, role = "viewer" } = req.body as { userId: string; role?: string };
  if (!inviteeId) { res.status(400).json({ error: "userId is required" }); return; }
  if (!["contributor", "viewer"].includes(role)) {
    res.status(400).json({ error: "role must be contributor or viewer" });
    return;
  }

  const actorId = req.user!.id;

  // Don't invite yourself
  if (inviteeId === actorId) {
    res.status(400).json({ error: "Cannot invite yourself" });
    return;
  }

  // Check invitee exists
  const invitee = await db.query.usersTable.findFirst({ where: eq(usersTable.id, inviteeId) });
  if (!invitee) { res.status(404).json({ error: "User not found" }); return; }

  // Check not already a participant
  const existing = ctx.participants.find((p) => p.userId === inviteeId);
  if (existing) {
    res.status(409).json({ error: "User is already a participant" });
    return;
  }

  const [row] = await db
    .insert(memoryParticipantsTable)
    .values({
      memoryId,
      userId: inviteeId,
      role,
      invitedBy: actorId,
      status: "pending",
    })
    .returning();

  res.status(201).json({ participant: row });
});

// ── PATCH /memories/:id/participants/:participantId/accept ────────────────

router.patch("/memories/:id/participants/:participantId/accept", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const memoryId = Number(req.params.id);
  const participantId = Number(req.params.participantId);
  if (isNaN(memoryId) || isNaN(participantId)) {
    res.status(400).json({ error: "Invalid IDs" }); return;
  }

  const row = await db.query.memoryParticipantsTable.findFirst({
    where: and(
      eq(memoryParticipantsTable.id, participantId),
      eq(memoryParticipantsTable.memoryId, memoryId),
      eq(memoryParticipantsTable.userId, req.user.id),
    ),
  });

  if (!row) { res.status(404).json({ error: "Invitation not found" }); return; }
  if (row.status !== "pending") { res.status(409).json({ error: "Invitation is not pending" }); return; }

  const [updated] = await db
    .update(memoryParticipantsTable)
    .set({ status: "accepted" })
    .where(eq(memoryParticipantsTable.id, participantId))
    .returning();

  res.json({ participant: updated });
});

// ── PATCH /memories/:id/participants/:participantId/decline ───────────────

router.patch("/memories/:id/participants/:participantId/decline", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const memoryId = Number(req.params.id);
  const participantId = Number(req.params.participantId);
  if (isNaN(memoryId) || isNaN(participantId)) {
    res.status(400).json({ error: "Invalid IDs" }); return;
  }

  const row = await db.query.memoryParticipantsTable.findFirst({
    where: and(
      eq(memoryParticipantsTable.id, participantId),
      eq(memoryParticipantsTable.memoryId, memoryId),
      eq(memoryParticipantsTable.userId, req.user.id),
    ),
  });

  if (!row) { res.status(404).json({ error: "Invitation not found" }); return; }

  const [updated] = await db
    .update(memoryParticipantsTable)
    .set({ status: "declined" })
    .where(eq(memoryParticipantsTable.id, participantId))
    .returning();

  res.json({ participant: updated });
});

// ── DELETE /memories/:id/participants/:participantId ──────────────────────

router.delete("/memories/:id/participants/:participantId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const memoryId = Number(req.params.id);
  const participantId = Number(req.params.participantId);
  if (isNaN(memoryId) || isNaN(participantId)) {
    res.status(400).json({ error: "Invalid IDs" }); return;
  }

  const row = await db.query.memoryParticipantsTable.findFirst({
    where: and(
      eq(memoryParticipantsTable.id, participantId),
      eq(memoryParticipantsTable.memoryId, memoryId),
    ),
  });

  if (!row) { res.status(404).json({ error: "Participant not found" }); return; }

  // Only the memory owner can remove others; participants can remove themselves
  const memory = await db.query.memoriesTable.findFirst({
    where: eq(memoriesTable.id, memoryId),
  });

  const isOwner = memory?.userId === req.user.id;
  const isSelf = row.userId === req.user.id;

  if (!isOwner && !isSelf) {
    res.status(403).json({ error: "Not authorized to remove this participant" });
    return;
  }

  await db.delete(memoryParticipantsTable).where(eq(memoryParticipantsTable.id, participantId));
  res.status(204).send();
});

// ── GET /invitations — list pending invitations for the current user ──────

router.get("/invitations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const pending = await db
    .select()
    .from(memoryParticipantsTable)
    .where(
      and(
        eq(memoryParticipantsTable.userId, req.user.id),
        eq(memoryParticipantsTable.status, "pending"),
      ),
    );

  // Enrich with memory titles
  const memoryIds = pending.map((p) => p.memoryId);
  const memories = memoryIds.length > 0
    ? await db.select({ id: memoriesTable.id, title: memoriesTable.title })
        .from(memoriesTable)
        .where(inArray(memoriesTable.id, memoryIds))
    : [];

  const result = pending.map((p) => ({
    ...p,
    memory: memories.find((m) => m.id === p.memoryId) ?? null,
  }));

  res.json({ invitations: result });
});

export default router;
