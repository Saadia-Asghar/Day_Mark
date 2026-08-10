import { Router, type IRouter } from "express";
import { desc, eq, gte, count, inArray, and } from "drizzle-orm";
import { db, memoriesTable, calendarEventsTable, peopleTable, memoryPeopleTable } from "@workspace/db";
import { GetHomeSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/home/summary", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
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

  // Gift from past — a random past memory owned by user
  const pastMemories = await db
    .select()
    .from(memoriesTable)
    .where(and(eq(memoriesTable.userId, userId), gte(memoriesTable.date, "2000-01-01")))
    .orderBy(desc(memoriesTable.date))
    .limit(20);

  const oldMemories = pastMemories.filter((m) => m.date < todayStr);
  const giftMemoryRaw = oldMemories.length > 0
    ? oldMemories[Math.floor(Math.random() * Math.min(oldMemories.length, 5))]
    : pastMemories[0];

  let giftFromPast = null;
  if (giftMemoryRaw) {
    const links = await db
      .select({ personId: memoryPeopleTable.personId })
      .from(memoryPeopleTable)
      .where(eq(memoryPeopleTable.memoryId, giftMemoryRaw.id));

    let people: { id: number; name: string; relationship: string | null; avatarUrl: string | null; birthday: string | null; memoriesCount: number }[] = [];
    if (links.length > 0) {
      const personRows = await db
        .select()
        .from(peopleTable)
        .where(and(inArray(peopleTable.id, links.map((l) => l.personId)), eq(peopleTable.userId, userId)));
      people = personRows.map((p) => ({
        id: p.id,
        name: p.name,
        relationship: p.relationship ?? null,
        avatarUrl: p.avatarUrl ?? null,
        birthday: p.birthday ?? null,
        memoriesCount: 0,
      }));
    }

    giftFromPast = { ...giftMemoryRaw, people };
  }

  // Recent people scoped to user
  const recentPeople = await db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.userId, userId))
    .limit(6);

  const [totalRow] = await db
    .select({ count: count() })
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId));

  const result = {
    upcomingEvents: eventsWithDays,
    giftFromPast,
    recentPeople: recentPeople.map((p) => ({
      id: p.id,
      name: p.name,
      relationship: p.relationship ?? null,
      avatarUrl: p.avatarUrl ?? null,
      birthday: p.birthday ?? null,
      memoriesCount: 0,
    })),
    totalMemories: totalRow?.count ?? 0,
  };

  res.json(GetHomeSummaryResponse.parse(result));
});

export default router;
