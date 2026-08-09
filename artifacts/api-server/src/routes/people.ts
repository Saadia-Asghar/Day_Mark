import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, peopleTable, memoryPeopleTable, memoriesTable } from "@workspace/db";
import {
  ListPeopleResponse,
  CreatePersonBody,
  CreatePersonResponse,
  GetPersonParams,
  GetPersonResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getPersonMemoryCount(personId: number): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(memoryPeopleTable)
    .where(eq(memoryPeopleTable.personId, personId));
  return row?.count ?? 0;
}

router.get("/people", async (req, res): Promise<void> => {
  const people = await db.select().from(peopleTable);

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

router.post("/people", async (req, res): Promise<void> => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [person] = await db.insert(peopleTable).values(parsed.data).returning();
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

router.get("/people/:id", async (req, res): Promise<void> => {
  const params = GetPersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const person = await db.query.peopleTable.findFirst({
    where: eq(peopleTable.id, params.data.id),
  });

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  const memoriesCount = await getPersonMemoryCount(params.data.id);

  // Get memories shared with this person
  const links = await db
    .select({ memoryId: memoryPeopleTable.memoryId })
    .from(memoryPeopleTable)
    .where(eq(memoryPeopleTable.personId, params.data.id));

  const memories = links.length > 0
    ? await db.select().from(memoriesTable).where(
        eq(memoriesTable.id, links[0].memoryId)
      )
    : [];

  // Calculate next important date
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

  res.json(
    GetPersonResponse.parse({
      id: person.id,
      name: person.name,
      relationship: person.relationship ?? null,
      avatarUrl: person.avatarUrl ?? null,
      birthday: person.birthday ?? null,
      memoriesCount,
      nextImportantDate,
      memories: memories.map((m) => ({
        ...m,
        people: [],
      })),
    })
  );
});

export default router;
