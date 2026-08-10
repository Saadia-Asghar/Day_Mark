---
name: Onboarding routing rules
description: How the onboarding flow is enforced in the Daymark frontend
---

## Rules

1. **ProtectedRoute** in `artifacts/daymark/src/App.tsx` accepts `requireOnboarding?: boolean` (default `true`).
   - Unauthenticated → `/auth`
   - Authenticated + `user.onboardingCompleted === false` + `requireOnboarding=true` → `/onboarding`
   - Authenticated + onboardingCompleted → render component

2. **Onboarding route** uses `requireOnboarding={false}` to avoid redirect loops.

3. **Onboarding page** (`artifacts/daymark/src/pages/onboarding.tsx`) calls `useCompleteOnboarding()` mutation on both "Start My Daymark" (last step) and "Skip". Invalidates `/api/auth/user` query on success.

4. **AuthUser interface** in `lib/replit-auth-web/src/use-auth.ts` must include `onboardingCompleted: boolean`. After editing this file, run `pnpm --filter @workspace/replit-auth-web run build` — Vite uses the compiled output, not the source.

**Why:** The field is stored in the DB (`usersTable.onboardingCompleted`). Session data now includes it via both OIDC callback paths in `artifacts/api-server/src/routes/auth.ts`. `/api/auth/user` returns fresh DB data (not stale session data) so profile edits and onboarding completion are reflected immediately.
