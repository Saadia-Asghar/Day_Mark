# Daymark

A mobile-first memory app that turns everyday moments into beautifully wrapped digital gifts. Users save memories with photos, voice notes, stories, moods, and people — each memory becomes a colorful gift box to open again someday.

**Tagline:** Every day leaves you a little something.

## Run & Operate

- `pnpm --filter @workspace/daymark run dev` — run the frontend (served at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (served at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, framer-motion animations, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), drizzle-zod
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/daymark/src/` — React frontend (pages, components, hooks)
- `artifacts/api-server/src/routes/` — Express API routes (memories, people, calendar, future-gifts, home)
- `lib/db/src/schema/` — Drizzle schema (memories, people, memory_people, calendar_events, future_gifts)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas (do not edit)

## Architecture decisions

- Memory = Gift visual metaphor throughout the UI (gift boxes, ribbons, bows)
- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml`, codegen produces hooks + Zod validators
- `type: number` used instead of `type: integer` in the OpenAPI spec — Orval with Zod v3 generates `zod.int()` for `integer` which doesn't exist in v3; `number` generates `zod.number()` which is correct
- Category colors hardcoded: travel=#75C8FF, friends=#FF6F9F, family=#FFC857, achievements=#6D4AFF, everyday=#9CE2B1
- Future gifts: content hidden until unlockDate passes (server-side check on isLocked)

## Product

- **Landing page** (`/`): Full marketing page with Marky hero illustration
- **Onboarding** (`/onboarding`): 3-screen carousel
- **Home** (`/home`): Coming Up + Gift From Your Past + Your People
- **Wrap a Memory** (`/wrap`): 4-step gift-wrapping flow
- **My Gifts** (`/gifts`): Memory library (grid/timeline/calendar/map)
- **Open Memory** (`/gifts/:id`): Gift opening animation + full memory detail
- **Calendar** (`/calendar`): Playful calendar with memory markers + On This Day
- **My People** (`/people`): Emotional people list + shared memory timelines
- **Future Gifts** (`/future-gifts`): Sealed time-capsule gifts

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- Use `type: number` (not `type: integer`) in the OpenAPI spec — Zod v3 compat
- The DB push command handles array columns correctly with `.array()` on the column type
- API server must be rebuilt (`pnpm --filter @workspace/api-server run build`) before changes take effect in dev

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
