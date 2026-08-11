/**
 * DayLink streak routes.
 *
 * Streaks are maintained server-side. The unique constraint on
 * (streak_id, activity_date) in streakActivitiesTable prevents double-increment.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, or, and, sql } from "drizzle-orm";
import {
  db, relationshipStreaksTable, streakActivitiesTable,
  connectionsTable, usersTable, notificationsTable,
} from "@workspace/db";
import { emitToUser } from "./events";
import { requireAuth } from '../middlewares/requireAuth';

const router: IRouter = Router();

/** Canonical pair: alphabetically lower userId → userAId */
function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Get or create a streak record for an accepted connection pair. */
async function getOrCreateStreak(userAId: string, userBId: string) {
  const existing = await db.query.relationshipStreaksTable.findFirst({
    where: and(
      eq(relationshipStreaksTable.userAId, userAId),
      eq(relationshipStreaksTable.userBId, userBId),
    ),
  });
  if (existing) return existing;

  const [created] = await db.insert(relationshipStreaksTable).values({
    userAId,
    userBId,
    currentStreak: 0,
    longestStreak: 0,
    status: "active",
  }).returning();
  return created;
}

/**
 * Record a qualifying DayLink activity.
 * Atomically inserts a streak activity for today's date.
 * If an activity already exists for today, it's a no-op (streak already counted).
 * Returns the updated streak.
 */
export async function recordDaylinkActivity(
  actorUserId: string,
  otherUserId: string,
  activityType: string,
  sourceId?: number,
): Promise<void> {
  // Verify accepted connection
  const conn = await db.query.connectionsTable.findFirst({
    where: and(
      or(
        and(eq(connectionsTable.requesterUserId, actorUserId), eq(connectionsTable.recipientUserId, otherUserId)),
        and(eq(connectionsTable.requesterUserId, otherUserId), eq(connectionsTable.recipientUserId, actorUserId)),
      ),
      eq(connectionsTable.status, "accepted"),
    ),
  });
  if (!conn) return;

  const [userAId, userBId] = canonicalPair(actorUserId, otherUserId);
  const streak = await getOrCreateStreak(userAId, userBId);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Try inserting today's activity — unique constraint prevents duplicates
  try {
    await db.insert(streakActivitiesTable).values({
      streakId: streak.id,
      actorUserId,
      activityType,
      sourceId: sourceId ?? null,
      activityDate: today,
    });
  } catch {
    // Already have an activity for today — streak already counted, nothing to do
    return;
  }

  // Calculate new streak
  const lastDate = streak.lastQualifiedDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = streak.currentStreak;
  if (!lastDate || lastDate === yesterdayStr) {
    // Consecutive day or first activity
    newStreak = streak.currentStreak + 1;
  } else if (lastDate === today) {
    // Already counted today somehow (race condition guard)
    return;
  } else {
    // Missed at least one day — check grace
    const graceDate = streak.graceUsedAt;
    const canUseGrace = !graceDate && streak.currentStreak >= 14;
    if (canUseGrace) {
      newStreak = streak.currentStreak; // preserve streak, use grace
      await db.update(relationshipStreaksTable).set({
        graceUsedAt: today,
        lastQualifiedDate: today,
        status: "active",
      }).where(eq(relationshipStreaksTable.id, streak.id));
    } else {
      // Streak ends, start fresh
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);
  await db.update(relationshipStreaksTable).set({
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastQualifiedDate: today,
    startedAt: streak.startedAt ?? new Date(),
    status: "active",
  }).where(eq(relationshipStreaksTable.id, streak.id));

  // Emit real-time update to both users
  emitToUser(actorUserId, "daylink.updated", { streakId: streak.id });
  emitToUser(otherUserId, "daylink.updated", { streakId: streak.id });

  // Milestone notifications
  if (newStreak === 7 || newStreak === 30 || newStreak === 100 || newStreak === 365) {
    const msg = `Your Daylink reached ${newStreak} days ✨`;
    await db.insert(notificationsTable).values([
      { userId: actorUserId, type: "daylink_milestone", title: "Daylink milestone!", message: msg },
      { userId: otherUserId, type: "daylink_milestone", title: "Daylink milestone!", message: msg },
    ]);
  }
}

// ── GET /api/daylinks ──────────────────────────────────────────────────────
// Top streaks for the current user (for Home section)

router.get("/daylinks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;

  const streaks = await db.query.relationshipStreaksTable.findMany({
    where: or(
      eq(relationshipStreaksTable.userAId, userId),
      eq(relationshipStreaksTable.userBId, userId),
    ),
    orderBy: (t, { desc }) => [desc(t.currentStreak)],
  });

  // Enrich with other user info
  const otherIds = streaks.map((s) => (s.userAId === userId ? s.userBId : s.userAId));
  const users = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    displayName: usersTable.displayName,
    username: usersTable.username,
    profileImageUrl: usersTable.profileImageUrl,
  }).from(usersTable).then((all) => all.filter((u) => otherIds.includes(u.id)));

  const enriched = streaks.map((s) => {
    const otherId = s.userAId === userId ? s.userBId : s.userAId;
    return { ...s, otherUser: users.find((u) => u.id === otherId) ?? null };
  });

  res.json({ daylinks: enriched });
});

// ── GET /api/daylinks/:userId ──────────────────────────────────────────────
// Streak between current user and a specific other user

router.get("/daylinks/:userId", requireAuth, async (req, res): Promise<void> => {
  const myId = req.dbUser.id;
  const otherId = String(req.params.userId);

  const [userAId, userBId] = canonicalPair(myId, otherId);
  const streak = await db.query.relationshipStreaksTable.findFirst({
    where: and(
      eq(relationshipStreaksTable.userAId, userAId),
      eq(relationshipStreaksTable.userBId, userBId),
    ),
  });

  if (!streak) { res.json({ streak: null }); return; }

  // Last 7 days of activities
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const activities = await db.query.streakActivitiesTable.findMany({
    where: eq(streakActivitiesTable.streakId, streak.id),
    orderBy: (t, { asc }) => [asc(t.activityDate)],
  });

  const activityDates = new Set(activities.map((a) => a.activityDate));
  const history = last7.map((d) => ({ date: d, qualified: activityDates.has(d) }));

  const todayStr = today.toISOString().split("T")[0];
  const todayQualified = activityDates.has(todayStr);

  res.json({ streak: { ...streak, history, todayQualified } });
});

export default router;
