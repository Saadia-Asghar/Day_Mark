---
name: Clerk v6 signal-based useSignIn
description: In Clerk React v6 signal API, the hook's signIn is a reactive snapshot — subsequent methods must be chained off the resource returned by create().
---

# Clerk v6 Signal API — Critical Pattern

## The Rule
`useSignIn()` in `@clerk/react` v6.13.1 returns `{ signIn, errors, fetchStatus }` where `signIn` is a **reactive signal snapshot**, not a live `SignInResource`. It has `create()` but subsequent methods (`attemptFirstFactor`, `resetPassword`) may not be available on the hook's `signIn` after state transitions.

## How to Apply
Always store the value **returned** from `signIn.create()` in a `useRef`, and call all subsequent methods off that ref:

```typescript
const resourceRef = useRef<any>(null);

// Step 1
const resource = await signIn.create({ strategy: 'reset_password_email_code', identifier });
resourceRef.current = resource;

// Step 2 — use resourceRef.current, NOT signIn
const result = await resourceRef.current.attemptFirstFactor({ strategy: 'reset_password_email_code', code });
resourceRef.current = result;

// Step 3
const final = await resourceRef.current.resetPassword({ password });
```

Same applies in sign-in two-step flow:
```typescript
let result = await signIn.create({ identifier, password });
if (result.status === 'needs_first_factor') {
  result = await result.attemptFirstFactor({ strategy: 'password', password }); // result, not signIn
}
```

**Why:** The hook's `signIn` is a Clerk internal signal value (`clerk.__internal_state.signInSignal()`). It updates reactively for UI but may not carry all method bindings after `create()` transitions state. The returned `SignInResource` from `create()` is always the live object.
