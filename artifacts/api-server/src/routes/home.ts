import { Router, type IRouter } from "express";
import { desc, eq, gte, count, inArray, and } from "drizzle-orm";
import { db, memoriesTable, calendarEventsTable, peopleTable, memoryPeopleTable } from "@workspace/db";
import { GetHomeSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/home/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const futureStr = future.toISOString().slice(0, 10);

  // Upcoming events scoped to user
  const upcomingEvents = await db
    .select()
    .from(calendarEventsTable)
    .where(and(eq(calendarEventsTable.userId, userId), gte(calendarEventsTable.date, todayStr)))
    .orderBy(calendarEventsTable.date)
    .limit(5);

  const eventsWithDays = upcomingEvents.map((e) => {
    const d = Math.ceil((new Date(e.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      type: e.type,
      memoryId: e.memoryId ?? null,
      personId: e.personId ?? null,
      daysUntil: d,
    };
  });

  // Scoped to user's own memories
  const userMemories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.date));

  // "This Day" — prefer a memory whose month+day matches today in a prior year
  const todayMD = todayStr.slice(5); // "MM-DD"
  const thisYear = today.getFullYear();
  const onThisDay = userMemories.find((m) => {
    if (!m.date) return false;
    const yr = parseInt(m.date.slice(0, 4), 10);
    return yr < thisYear && m.date.slice(5) === todayMD;
  }) ?? userMemories[0] ?? null;
  const giftFromPast = onThisDay;

  // Recent people the user has memories with
  const recentMemoryIds = userMemories.slice(0, 10).map((m) => m.id);
  const recentPersonLinks = recentMemoryIds.length > 0
    ? await db
        .select({ personId: memoryPeopleTable.personId })
        .from(memoryPeopleTable)
        .where(inArray(memoryPeopleTable.memoryId, recentMemoryIds))
        .limit(5)
    : [];

  const recentPersonIds = [...new Set(recentPersonLinks.map((l) => l.personId))];
  const recentPeople = recentPersonIds.length > 0
    ? await db
        .select()
        .from(peopleTable)
        .where(inArray(peopleTable.id, recentPersonIds))
        .limit(5)
    : [];

  const [{ value: totalMemories }] = await db
    .select({ value: count() })
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId));

  res.json(
    GetHomeSummaryResponse.parse({
      upcomingEvents: eventsWithDays,
      giftFromPast: giftFromPast ? { ...giftFromPast, people: [] } : null,
      recentPeople: recentPeople.map((p) => ({
        id: p.id,
        name: p.name,
        relationship: p.relationship ?? null,
        avatarUrl: p.avatarUrl ?? null,
        birthday: p.birthday ?? null,
        memoriesCount: 0,
      })),
      totalMemories,
    })
  );
});

export default router;
