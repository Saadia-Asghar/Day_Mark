import { Router, type IRouter } from "express";
import { eq, count, and, inArray } from "drizzle-orm";
import { db, peopleTable, memoryPeopleTable, memoriesTable } from "@workspace/db";
import {
  ListPeopleResponse,
  CreatePersonBody,
  CreatePersonResponse,
  GetPersonParams,
  GetPersonResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getPersonMemoryCount(personId: number): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(memoryPeopleTable)
    .where(eq(memoryPeopleTable.personId, personId));
  return row?.count ?? 0;
}

router.get("/people", requireAuth, async (req, res): Promise<void> => {
  const people = await db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.userId, req.dbUser.id));

  const withCounts = await Promise.all(
    people.map(async (p) => ({
      id: p.id,
      name: p.name,
      relationship: p.relationship ?? null,
      avatarUrl: p.avatarUrl ?? null,
      birthday: p.birthday ?? null,
      memoriesCount: await getPersonMemoryCount(p.id),
    }))
  );

  res.json(ListPeopleResponse.parse(withCounts));
});

router.post("/people", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetPersonResponse.parse({
    id: person.id,
    name: person.name,
    relationship: person.relationship ?? null,
    avatarUrl: person.avatarUrl ?? null,
    birthday: person.birthday ?? null,
    memoriesCount,
    nextImportantDate,
    memories: memories.map((m) => ({ ...m, people: [] })),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Zod coerces `format: date` fields to Date objects; Drizzle date columns expect strings
  const birthday = parsed.data.birthday
    ? parsed.data.birthday instanceof Date
      ? parsed.data.birthday.toISOString().slice(0, 10)
      : (parsed.data.birthday as string)
    : undefined;

  const [person] = await db
    .insert(peopleTable)
    .values({ ...parsed.data, birthday, userId: req.dbUser.id })
    .returning();

  res.status(201).json(
    CreatePersonResponse.parse({
      ...person,
      relationship: person.relationship ?? null,
      avatarUrl: person.avatarUrl ?? null,
      birthday: person.birthday ?? null,
      memoriesCount: 0,
    })
  );
});

router.get("/people/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const person = await db.query.peopleTable.findFirst({
    where: and(eq(peopleTable.id, params.data.id), eq(peopleTable.userId, req.dbUser.id)),
  });

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  const memoriesCount = await getPersonMemoryCount(params.data.id);

  const links = await db
    .select({ memoryId: memoryPeopleTable.memoryId })
    .from(memoryPeopleTable)
    .where(eq(memoryPeopleTable.personId, params.data.id));

  const memoryIds = links.map((l) => l.memoryId);
  const memories =
    memoryIds.length > 0
      ? await db
          .select()
          .from(memoriesTable)
          .where(
            and(
              inArray(memoriesTable.id, memoryIds),
              eq(memoriesTable.userId, req.dbUser.id),
            ),
          )
      : [];

  let nextImportantDate: string | null = null;
  if (person.birthday) {
    const today = new Date();
    const thisYear = today.getFullYear();
    const birthdayThisYear = new Date(person.birthday.replace(/^(\d{4})/, String(thisYear)));
    if (birthdayThisYear >= today) {
      nextImportantDate = birthdayThisYear.toISOString().slice(0, 10);
    } else {
      const birthdayNextYear = new Date(person.birthday.replace(/^(\d{4})/, String(thisYear + 1)));
      nextImportantDate = birthdayNextYear.toISOString().slice(0, 10);
    }
  }

  const parsed = GetPersonResponse.parse({
    id: person.id,
    name: person.name,
    relationship: person.relationship ?? null,
    avatarUrl: person.avatarUrl ?? null,
    birthday: person.birthday ?? null,
    memoriesCount,
    nextImportantDate,
    memories: memories.map((m) => ({ ...m, people: [] })),
  });
  res.json({ ...parsed, linkedUserId: (person as any).linkedUserId ?? null });
});

export default router;
