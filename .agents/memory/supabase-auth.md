---
name: Supabase Auth migration
description: Architecture decisions for the Clerk → Supabase Auth replacement; identity mapping, middleware pattern, cookie transport.
---

## Key architectural decisions

### Identity mapping: supabaseId column (not PK rewrite)
- `usersTable` has a stable `id` (varchar PK, defaulting to `gen_random_uuid()`)
- `supabaseId` (varchar, unique) holds the Supabase Auth UUID — the external identity
- This keeps all FK-referenced child tables intact (no `ON UPDATE CASCADE` needed)
- On first login: middleware looks up by `supabaseId`, then by email (sets `supabase_id` on matching row), then inserts fresh
- **Why:** A PK rewrite fails in the presence of child tables without `ON UPDATE CASCADE`; email-only bridge without atomically claiming the row is a broken-access-control risk

### requireAuth middleware (artifacts/api-server/src/middlewares/requireAuth.ts)
- `requireAuth` — standard guard, sets `req.dbUser`, 401 if unauthenticated
- `optionalAuth` — same provisioning/bridge but never 401s; leaves `req.dbUser` unset for anonymous callers
- Both call `resolveUser(supabaseUuid, email)` which does: supabaseId lookup → email bridge → insert
- Column migration (`ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR UNIQUE`) runs on startup

### All routes use full middleware (not JWT sub directly)
- Every authenticated route uses `requireAuth` as Express middleware and accesses `req.dbUser.id`
- No route reads the JWT sub directly for downstream authorization
- `/auth/user` uses `optionalAuth` so it returns `{ user: null }` for anonymous while still running the bridge for authenticated users
- `/globe/memories`, `/invites/redeem/:token` GET, `/globe/memories/:id/report` are intentionally public (no auth)
- `/invites/redeem/:token` POST uses `optionalAuth` (optional redeemer identity for notification)

### Cookie + JWT transport
- Frontend: Supabase session token synced to `sb-token` cookie via `syncAuthCookie()` with `Secure` + `SameSite=Strict`
- Backend: reads `Authorization: Bearer` or `sb-token` cookie

### Frontend auth context
- `useAppAuth()` exported from `App.tsx` — provides `{ user, session, isLoading, isAuthenticated, signOut }`
- api-client-react token getter set via `setAuthTokenGetter(() => session.access_token)`
