import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { memoriesTable } from "./memories";
import { peopleTable } from "./people";

export const memoryPeopleTable = pgTable("memory_people", {
  memoryId: integer("memory_id").notNull().references(() => memoriesTable.id, { onDelete: "cascade" }),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.memoryId, t.personId] })]);

export type MemoryPerson = typeof memoryPeopleTable.$inferSelect;
