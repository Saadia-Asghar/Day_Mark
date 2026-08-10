---
name: Shared memory permission system
description: Permission helpers and API routes for memory participants
---

## Permission helpers (artifacts/api-server/src/routes/memory-participants.ts)

```typescript
canViewMemory(userId, memoryOwnerId, participants)   // owner OR accepted participant
canEditMemory(userId, memoryOwnerId, participants)   // owner OR accepted contributor
canDeleteMemory(userId, memoryOwnerId)               // owner only
canInviteToMemory(userId, memoryOwnerId)             // owner only
```

## API routes (all auth-guarded)

- `GET    /api/memories/:id/participants`                   — list participants (requires view access)
- `POST   /api/memories/:id/participants`                   — invite user (owner only); body: `{ userId, role? }`
- `PATCH  /api/memories/:id/participants/:pid/accept`       — accept own invitation
- `PATCH  /api/memories/:id/participants/:pid/decline`      — decline own invitation
- `DELETE /api/memories/:id/participants/:pid`              — remove (owner removes anyone; participant removes self)
- `GET    /api/invitations`                                 — list pending invitations for current user

## Router registration
Registered in `artifacts/api-server/src/routes/index.ts` as `memoryParticipantsRouter`.

## Frontend
Gift detail page (`artifacts/daymark/src/pages/gift-detail.tsx`) fetches participants directly via `fetch(/api/memories/:id/participants)` when the gift is opened. No codegen hook yet — uses raw fetch as the endpoint isn't in openapi.yaml.

**Why:** Shared memory endpoints are internal-only (no mobile client yet) and the spec update + codegen cycle is costly. A raw fetch is acceptable until the spec is updated.
