/**
 * Monthly Memory Capsule API
 *
 * GET  /api/capsule/latest       — get or generate this user's latest capsule
 * GET  /api/capsule/:year/:month — get specific capsule
 * POST /api/capsule/:year/:month/open — mark opened
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, monthlyCapsulesTable, memoriesTable, usersTable,
  relationshipStreaksTable, scheduledMessagesTable, futureGiftsTable,
} from "@workspace/db";
import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function getAuthUserId(req: Request): string | null {
  const auth = getAuth(req);
  return (auth?.sessionClaims?.userId as string | undefined) || auth?.userId || null;
}

async function generateCapsule(userId: string, year: number, month: number): Promise<Record<string, unknown>> {
  // Memories for the month
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const memories = await db.query.memoriesTable.findMany({
    where: (t, { eq, and, sql }) => and(
      eq(t.userId, userId),
      sql`to_char(${t.date}::date, 'YYYY-MM') = ${monthStr}`,
    ),
    orderBy: (t, { asc }) => [asc(t.date)],
  });

  // Photos count
  const photoMemories = memories.filter((m) => m.photoUrls && m.photoUrls.length > 0);

  // Most kept-close
  const keptClose = memories.filter((m) => m.isKeptClose);

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const m of memories) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  // Future gifts created that month (raw SQL for simplicity)
  let futureGiftsCreated = 0;
  try {
    const res = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM future_gifts WHERE user_id = $1 AND to_char(created_at, 'YYYY-MM') = $2`,
      [userId, monthStr],
    );
    futureGiftsCreated = Number(res.rows[0]?.count ?? 0);
  } catch { /* non-critical */ }

  // Messages scheduled that month
  let messagesSent = 0;
  try {
    const res = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM scheduled_messages WHERE sender_user_id = $1 AND to_char(created_at, 'YYYY-MM') = $2`,
      [userId, monthStr],
    );
    messagesSent = Number(res.rows[0]?.count ?? 0);
  } catch { /* non-critical */ }

  // Streak highlights
  const streaks = await db.query.relationshipStreaksTable.findMany({
    where: (t, { or, eq }) => or(
      eq(t.userAId, userId),
      eq(t.userBId, userId),
    ),
    orderBy: (t, { desc }) => [desc(t.currentStreak)],
    limit: 3,
  });

  // "One moment you may have forgotten" — oldest memory not kept close
  const forgotten = memories
    .filter((m) => !m.isKeptClose)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    [0] ?? null;

  // Best photo (first memory with a photo)
  const bestPhotoMemory = photoMemories[0] ?? null;

  return {
    year,
    month,
    memoriesCount: memories.length,
    photoCount: photoMemories.length,
    categories: categoryCounts,
    topCategory: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    keptCloseCount: keptClose.length,
    futureGiftsCreated,
    messagesSent,
    longestStreak: streaks[0]?.currentStreak ?? 0,
    bestPhotoUrl: bestPhotoMemory?.photoUrls?.[0] ?? null,
    bestPhotoTitle: bestPhotoMemory?.title ?? null,
    forgottenMemory: forgotten ? { id: forgotten.id, title: forgotten.title, date: forgotten.date, category: forgotten.category } : null,
    memories: memories.map((m) => ({ id: m.id, title: m.title, date: m.date, category: m.category, photoUrl: m.photoUrls?.[0] ?? null })),
  };
}

// ── GET /api/capsule/latest ──────────────────────────────────────────────
router.get("/capsule/latest", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const now = new Date();
  // Show previous month's capsule if it's the first 7 days of current month
  const targetDate = now.getDate() <= 7 && now.getMonth() > 0
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  // Check if capsule already generated
  let capsule = await db.query.monthlyCapsulesTable.findFirst({
    where: and(
      eq(monthlyCapsulesTable.userId, userId),
      eq(monthlyCapsulesTable.year, year),
      eq(monthlyCapsulesTable.month, month),
    ),
  });

  if (!capsule) {
    // Generate on demand
    const summaryData = await generateCapsule(userId, year, month);
    const [created] = await db.insert(monthlyCapsulesTable).values({
      userId,
      year,
      month,
      summaryData,
    }).onConflictDoNothing().returning();
    capsule = created;
  }

  if (!capsule) {
    res.status(404).json({ error: "No capsule available" });
    return;
  }

  res.json({ capsule });
});

// ── GET /api/capsule/:year/:month ────────────────────────────────────────
router.get("/capsule/:year/:month", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const year = Number(req.params.year);
  const month = Number(req.params.month);

  let capsule = await db.query.monthlyCapsulesTable.findFirst({
    where: and(
      eq(monthlyCapsulesTable.userId, userId),
      eq(monthlyCapsulesTable.year, year),
      eq(monthlyCapsulesTable.month, month),
    ),
  });

  if (!capsule) {
    const summaryData = await generateCapsule(userId, year, month);
    const [created] = await db.insert(monthlyCapsulesTable).values({
      userId, year, month, summaryData,
    }).onConflictDoNothing().returning();
    capsule = created;
  }

  if (!capsule) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ capsule });
});

// ── POST /api/capsule/:year/:month/open ──────────────────────────────────
router.post("/capsule/:year/:month/open", async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const year = Number(req.params.year);
  const month = Number(req.params.month);

  await db.update(monthlyCapsulesTable)
    .set({ openedAt: new Date() })
    .where(and(
      eq(monthlyCapsulesTable.userId, userId),
      eq(monthlyCapsulesTable.year, year),
      eq(monthlyCapsulesTable.month, month),
    ));

  res.json({ opened: true });
});

export default router;
