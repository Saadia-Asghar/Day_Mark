---
name: Spec 3 implementation status
description: Tracks what has been implemented from the 50-part Spec 3 production-readiness pass
---

## Done (this session)

### DB Tables (via run-migrations.ts, applied at startup)
- `relationship_events` — birthday/anniversary/etc with owner_user_id, person_id, linked_user_id, event_month/day/year, reminder_days
- `birthday_wishes` — sender, recipient, event_id, type, wish_text
- `invites` — token, inviter, person_id, expires_at, max_uses, use_count
- `monthly_capsules` — user_id, year, month, summary_data, opened_at
- `notifications.dedup_key` — VARCHAR column + UNIQUE partial index (key: `re_{event_id}_{date}_{days}d`)

### API Routes
- `GET/POST/PATCH/DELETE /api/relationship-events` — CRUD for events
- `GET /api/relationship-events/upcoming?days=N` — enriched with daysUntil + nextDate
- `GET/POST /api/birthday-wishes/:userId` — wish wall + send
- `POST/GET/DELETE /api/invites` — invite creation + listing + revoke
- `GET /api/invites/redeem/:token` — public info for join page
- `POST /api/invites/redeem/:token` — record redemption + notify inviter
- `GET /api/capsule/latest` — get or generate last month's capsule
- `GET /api/capsule/:year/:month` — specific capsule
- `POST /api/capsule/:year/:month/open` — mark opened

### Scheduler
- `processBirthdayReminders()` — queries all relationship_events, fires at 7/3/1/0 days before; deduped via `re_{id}_{date}_{days}d`
- `processMonthlyCapsulesIfNeeded()` — runs on 1st–3rd of month; generates summary_data; emits SSE + notification

### Frontend Pages
- `connections.tsx` — rewritten with Polaroid portrait grid (accepted) + invitation cards (pending) + invite share button
- `messages.tsx` — rewritten with envelope/seal (received) + postcard/stamp (scheduled) + stamped letter (sent)
- `globe.tsx` — replaced 2.5D SVG sphere with real Leaflet map (CartoDB Voyager tiles); filter pills (All/Today/Week/Category); map/feed toggle; clustering; privacy note; report sheet
- `capsule.tsx` — NEW: monthly capsule page with gift-unwrap animation, stats grid, category breakdown, forgotten memory, memory grid, share CTA
- `invite.tsx` — NEW: invite creation + JoinPage for new users landing via invite link; WhatsApp/native/copy share
- `profile.tsx` — "Coming Up" timeline section (relationship events, next 30 days); Invite Friends + Monthly Capsule menu items
- `settings-privacy.tsx` — birthday wish privacy control added

### App.tsx
- `/capsule` and `/capsule/:year/:month` — CapsulePage
- `/invite` — InvitePage (protected)
- `/join/:slug` — InvitePage (public, shows JoinPage)
- `ImportantTodaySection` component — fetches upcoming events and capsule; shown between "This Day" and "Daylinks"
- `person-detail.tsx` — "Important Dates" section with CRUD for relationship_events per person (inline form to add birthday/anniversary)

## Still Outstanding from Spec 3

- **Parts 1–3**: Supabase migration — needs user to approve the connector setup; skipped this session
- **Parts 31-35**: Supabase Realtime channels — depends on Supabase connector
- **Globe birthday wishes** (Part 16) — API exists but no globe birthday section built
- **Block enforcement** in scheduler (Part 39) — scheduler doesn't yet check block list before sending reminders
- **City/country exploration** deep pages (Parts 34–35) — clicking a city on the map doesn't go to a city page yet
- **Public profile wishing page** (Part 17) — visiting @username shows public birthday wall; not yet built

**Why:**
All outstanding items either depend on Supabase (which needs user action) or were lower priority than the birthday/invite/capsule/redesign work done here.
