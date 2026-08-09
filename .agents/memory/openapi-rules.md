---
name: OpenAPI rules for Daymark
description: Critical constraints for the openapi.yaml spec to avoid codegen conflicts
---

## Rules

1. **No `type: integer`** — use `type: number` for all integer fields (Orval/Zod v3 limitation).
2. **No `format: email` or `format: uri`** — not supported by codegen chain.
3. **Inline request body schemas create duplicate exports** — orval generates both a Zod schema in `api.ts` AND a TypeScript type in `generated/types/`, both with the same name (e.g. `PatchUserProfileBody`). When both are re-exported from `index.ts` (`export * from './generated/api'; export * from './generated/types'`), TypeScript error TS2308 fires.

**Fix:** Always reference request body schemas via `$ref` to a named schema in `components/schemas`. Never use inline `type: object` for request bodies.

**Why:** Orval generates type files in `generated/types/` only for inline anonymous schemas in request bodies. Named schemas via `$ref` avoid this duplication.

**How to apply:** For any new PATCH/POST/PUT endpoint with a request body, add a named schema to `components/schemas` first, then reference it.

## Codegen workflow
```
pnpm --filter @workspace/api-spec run codegen
```
This runs orval + typecheck. It must pass clean before committing.
