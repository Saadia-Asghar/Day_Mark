import { Router, type IRouter } from "express";
import { and, gte, lte, eq } from "drizzle-orm";
import { db, calendarEventsTable, memoriesTable } from "@workspace/db";
import {
  ListCalendarEventsQueryParams,
  ListCalendarEventsResponse,
  GetOnThisDayResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

router.get("/calendar/events", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListCalendarEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user.id;
  const today = new Date();
  const month = params.data.month ?? today.getMonth() + 1;
  const year = params.data.year ?? today.getFullYear();

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(
      and(
        eq(calendarEventsTable.userId, userId),
        gte(calendarEventsTable.date, start),
        lte(calendarEventsTable.date, end)
      )
    );

  const result = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    type: e.type,
    memoryId: e.memoryId ?? null,
    personId: e.personId ?? null,
    daysUntil: daysUntil(e.date),
  }));

  res.json(ListCalendarEventsResponse.parse(result));
});

router.get("/calendar/on-this-day", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Only fetch user's own memories for "On This Day"
  const memories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId));

  const onThisDay = memories.filter((m) => m.date.slice(5) === monthDay);

  const result = onThisDay.map((m) => ({
    ...m,
    people: [],
  }));

  res.json(GetOnThisDayResponse.parse(result));
});

export default router;
