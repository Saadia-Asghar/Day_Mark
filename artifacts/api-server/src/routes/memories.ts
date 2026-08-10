import { Router, type IRouter } from "express";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db, memoriesTable, peopleTable, memoryPeopleTable } from "@workspace/db";
import {
  ListMemoriesQueryParams,
  ListMemoriesResponse,
  CreateMemoryBody,
  CreateMemoryResponse,
  GetMemoryParams,
  GetMemoryResponse,
  UpdateMemoryParams,
  UpdateMemoryBody,
  UpdateMemoryResponse,
  DeleteMemoryParams,
  KeepMemoryCloseParams,
  KeepMemoryCloseResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { emitToUser } from "./events";

const router: IRouter = Router();

async function getMemoryWithPeople(id: number) {
  const memory = await db.query.memoriesTable.findFirst({
    where: eq(memoriesTable.id, id),
  });
  if (!memory) return null;

  const links = await db
    .select({ personId: memoryPeopleTable.personId })
    .from(memoryPeopleTable)
    .where(eq(memoryPeopleTable.memoryId, id));

  let people: typeof peopleTable.$inferSelect[] = [];
  if (links.length > 0) {
    people = await db
      .select()
      .from(peopleTable)
      .where(inArray(peopleTable.id, links.map((l) => l.personId)));
  }

  return {
    ...memory,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      relationship: p.relationship ?? null,
      avatarUrl: p.avatarUrl ?? null,
      birthday: p.birthday ?? null,
      memoriesCount: 0,
    })),
  };
}

router.get("/memories", requireAuth, async (req, res): Promise<void> => {
  const params = ListMemoriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.dbUser.id;
  const rows = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.date));

  const filtered = params.data.category
    ? rows.filter((m) => m.category === params.data.category)
    : rows;

  const withPeople = await Promise.all(filtered.map((m) => getMemoryWithPeople(m.id)));
  res.json(ListMemoriesResponse.parse(withPeople.filter(Boolean)));
});

router.post("/memories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { personIds, ...rest } = parsed.data as typeof parsed.data & { personIds?: number[] };

  const categoryColors: Record<string, string> = {
    travel: "#75C8FF",
    friends: "#FF6F9F",
    family: "#FFC857",
    achievements: "#6D4AFF",
    everyday: "#9CE2B1",
  };

  const giftColor = rest.giftColor || categoryColors[rest.category || "everyday"] || "#9CE2B1";

  // Zod coerces `format: date` fields to Date objects; Drizzle date columns expect strings
  const dateStr =
    rest.date instanceof Date
      ? rest.date.toISOString().slice(0, 10)
      : (rest.date as string);

  const [memory] = await db
    .insert(memoriesTable)
    .values({
      ...rest,
      date: dateStr,
      userId: req.dbUser.id,
      giftColor,
      ribbon: rest.ribbon || "gold",
      photoUrls: rest.photoUrls || [],
    })
    .returning();

  if (personIds && personIds.length > 0) {
    const ownedPeople = await db
      .select({ id: peopleTable.id })
      .from(peopleTable)
      .where(and(eq(peopleTable.userId, req.dbUser.id), inArray(peopleTable.id, personIds)));
    if (ownedPeople.length !== personIds.length) {
      res.status(400).json({ error: "One or more person IDs are invalid or do not belong to you" });
      return;
    }
    await db.insert(memoryPeopleTable).values(
      personIds.map((pid) => ({ memoryId: memory.id, personId: pid }))
    );
  }

  const result = await getMemoryWithPeople(memory.id);
  emitToUser(req.dbUser.id, "memory.created", { id: memory.id });
  res.status(201).json(CreateMemoryResponse.parse(result));
});

router.get("/memories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getMemoryWithPeople(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  if (result.userId && result.userId !== req.dbUser.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(GetMemoryResponse.parse(result));
});

router.patch("/memories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.query.memoriesTable.findFirst({
    where: and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.dbUser.id)),
  });
  if (!existing) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  const { personIds, ...rest } = parsed.data as typeof parsed.data & { personIds?: number[] };

  const [updated] = await db
    .update(memoriesTable)
    .set(rest as Partial<typeof memoriesTable.$inferInsert>)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.dbUser.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  if (personIds !== undefined) {
    await db.delete(memoryPeopleTable).where(eq(memoryPeopleTable.memoryId, params.data.id));
    if (personIds.length > 0) {
      await db.insert(memoryPeopleTable).values(
        personIds.map((pid) => ({ memoryId: params.data.id, personId: pid }))
      );
    }
  }

  const result = await getMemoryWithPeople(params.data.id);
  emitToUser(req.dbUser.id, "memory.updated", { id: params.data.id });
  res.json(UpdateMemoryResponse.parse(result));
});

router.delete("/memories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.dbUser.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  emitToUser(req.dbUser.id, "memory.deleted", { id: params.data.id });
  res.sendStatus(204);
});

router.post("/memories/:id/keep-close", requireAuth, async (req, res): Promise<void> => {
  const params = KeepMemoryCloseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db.query.memoriesTable.findFirst({
    where: and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.dbUser.id)),
  });
  if (!existing) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  await db
    .update(memoriesTable)
    .set({ isKeptClose: !existing.isKeptClose })
    .where(eq(memoriesTable.id, params.data.id));

  const result = await getMemoryWithPeople(params.data.id);
  res.json(KeepMemoryCloseResponse.parse(result));
});

export default router;
