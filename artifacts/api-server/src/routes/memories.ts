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

router.get("/memories", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListMemoriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user.id;
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

router.post("/memories", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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

  const [memory] = await db
    .insert(memoriesTable)
    .values({
      ...rest,
      userId: req.user.id,
      giftColor,
      ribbon: rest.ribbon || "gold",
      photoUrls: rest.photoUrls || [],
    })
    .returning();

  if (personIds && personIds.length > 0) {
    await db.insert(memoryPeopleTable).values(
      personIds.map((pid) => ({ memoryId: memory.id, personId: pid }))
    );
  }

  const result = await getMemoryWithPeople(memory.id);
  emitToUser(req.user.id, "memory.created", { id: memory.id });
  res.status(201).json(CreateMemoryResponse.parse(result));
});

router.get("/memories/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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

  // Ownership check
  if (result.userId && result.userId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(GetMemoryResponse.parse(result));
});

router.patch("/memories/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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

  // Verify ownership before update
  const existing = await db.query.memoriesTable.findFirst({
    where: and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.user.id)),
  });
  if (!existing) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  const { personIds, ...rest } = parsed.data as typeof parsed.data & { personIds?: number[] };

  const [updated] = await db
    .update(memoriesTable)
    .set(rest as Partial<typeof memoriesTable.$inferInsert>)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.user.id)))
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
  emitToUser(req.user.id, "memory.updated", { id: params.data.id });
  res.json(UpdateMemoryResponse.parse(result));
});

router.delete("/memories/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  emitToUser(req.user.id, "memory.deleted", { id: params.data.id });
  res.sendStatus(204);
});

router.post("/memories/:id/keep-close", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = KeepMemoryCloseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db.query.memoriesTable.findFirst({
    where: and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.user.id)),
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
