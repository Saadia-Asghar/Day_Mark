---
name: Production pass phase 2 — non-Supabase completion
description: Tracks what was implemented in the second production pass session (all non-Supabase phases from the 50-phase spec).
---

## What was completed

### Schema additions (applied via run-migrations.ts raw SQL)
- `relationship_event_reminders` table — dedup key, status tracking, indexes
- `users` table: added 9 new columns — `allow_connection_requests`, `birthday_visibility`, `allow_birthday_wishes_connections`, `allow_birthday_wishes_globe`, `default_memory_visibility`, `default_globe_identity`, `default_globe_location`, `show_public_profile`, `notification_settings` (jsonb)
- `notifications` table: added `dedupe_key` varchar with unique partial index

### API additions (artifacts/api-server/src/routes/auth.ts)
- PATCH /auth/profile — extended with all new privacy fields
- PATCH /auth/notification-settings — persists notificationSettings jsonb to DB
- DELETE /auth/account — cascade deletes all user data, then deletes Clerk user; requires X-Confirm-Delete: yes header
- GET /auth/export — returns JSON file attachment with safe-fields-only user data

### Rate limiting (artifacts/api-server/src/app.ts)
- express-rate-limit installed and applied: 300 req/min general, 20 req/min for /connections, /invites, /drops, /auth/account, 40/min for user search, 30/min for globe reactions

### Frontend pages and components
- /privacy — full privacy policy page (public route)
- /terms — full terms of service page (public route)
- ErrorBoundary — class component at components/error-boundary.tsx; reportError() hook for future Sentry; already wired in main.tsx and App.tsx
- settings-notifications.tsx — now loads from /api/auth/user notificationSettings and saves via PATCH /auth/notification-settings (was localStorage)
- settings-privacy.tsx — now loads/saves ALL privacy fields from DB (was only discoverableBy*)
- profile.tsx — added Export My Data button (downloads JSON), Delete My Daymark button with confirmation modal (type phrase "delete my daymark")

### Birthday wish wall (person-detail.tsx)
- Appears when person.linkedUserId exists and there's a birthday event with daysUntil === 0
- Fetches existing wishes from GET /api/birthday-wishes/:userId
- Allows composing + sending via POST /api/birthday-wishes
- Shows last 5 wishes with sender name + text

### Scheduler (artifacts/api-server/src/lib/scheduler.ts)
- Now uses relationship_event_reminders table as primary dedup store for birthday/anniversary reminders
- Only emits notification if reminder INSERT succeeded (not a duplicate)
- Also emits SSE event reminder.birthday to user

## What remains blocked on Supabase credentials
- Phases 1-3: Migration from current Postgres → Supabase hosted Postgres
- Phase 3: Supabase Realtime replacing in-memory SSE map
- Supabase connector_catalog provides PostgREST REST API only — NOT a postgres:// connection string
- User needs to: create Supabase project → Project Settings → Database → Connection string → URI → set as DATABASE_URL secret in Replit

**Why:** The Replit ProposeIntegration for Supabase gives a REST API connector, not a raw PostgreSQL connection string for Drizzle. The migration requires the direct pg:// URI.
