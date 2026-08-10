---
name: Clerk v6 custom flow API
description: Correct hook signatures and method names for Clerk v6 (@clerk/react@^6) custom auth flows — differs significantly from v4/v5
---

# Clerk v6 Custom Flow API

**Why:** Clerk v6 completely rearchitected the custom flow hooks using a signals-based API. The old `{ isLoaded, signIn, setActive }` pattern no longer works.

## Hook return values

```ts
const { signIn, errors, fetchStatus } = useSignIn();
// signIn: SignInFutureResource
// errors: { fields: { identifier, password, code }, global, raw }
// fetchStatus: 'idle' | 'fetching'

const { signUp, errors, fetchStatus } = useSignUp();
// signUp: SignUpFutureResource

const { setActive } = useClerk();
// setActive({ session: createdSessionId }) — activates a session
```

**NOT available on hooks:** `isLoaded`, `setActive` (use `useClerk()` for setActive)

## Sign-in with password

```ts
const { error } = await signIn.password({ identifier: email, password });
// check signIn.status === 'complete', then setActive
```

## Sign-in OAuth/SSO

```ts
await signIn.sso({
  strategy: 'oauth_google',
  redirectUrl: `${origin}/sso-callback`,        // Clerk redirect after OAuth
  redirectCallbackUrl: `${origin}/auth`,         // fallback if not complete
});
```

## Sign-up with password

```ts
const { error } = await signUp.password({ emailAddress, password });
// sends email verification automatically if required
await signUp.verifications.sendEmailCode();       // explicitly send code
const { error } = await signUp.verifications.verifyEmailCode({ code });
// check signUp.status === 'complete', then setActive
```

## Sign-up OAuth/SSO

```ts
await signUp.sso({
  strategy: 'oauth_google',
  redirectUrl: `${origin}/sso-callback`,
  redirectCallbackUrl: `${origin}/auth`,
});
```

## Forgot password / reset

```ts
// Step 1: identify user first, then send reset code
const { error } = await signIn.create({ identifier: email });
const { error } = await signIn.resetPasswordEmailCode.sendCode(); // no args
// Step 2: verify code
const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
// signIn.status → 'needs_new_password'
// Step 3: submit new password
const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });
// signIn.status → 'complete'
await setActive({ session: signIn.createdSessionId });
```

## Error handling

```ts
// From method calls:
const { error } = await signIn.password({ ... });
if (error) {
  const msg = (error as any).longMessage ?? error.message;
  const code = (error as any).code ?? '';
}

// From errors object (reactive):
errors.global?.[0]?.message
errors.fields.identifier?.message
errors.fields.password?.message
errors.fields.code?.message
```

## Status values after operations

- `signIn.status`: `'complete'` | `'needs_first_factor'` | `'needs_new_password'` | `'needs_identifier'`
- `signUp.status`: `'complete'` | `'missing_requirements'`
- After complete: use `signIn.createdSessionId` / `signUp.createdSessionId`

## CAPTCHA (bot protection for custom sign-up flows)

Add `<div id="clerk-captcha" />` to the sign-up form page. Without it, Clerk logs CAPTCHA initialization warnings.

## SSO callback route

`/sso-callback` must render `<AuthenticateWithRedirectCallback>` from `@clerk/react`. Already wired in App.tsx with `signUpForceRedirectUrl="/onboarding"` and `signInForceRedirectUrl="/home"`.

## How to apply

- Replace all old `signIn.create({ identifier, password })` patterns with `signIn.password()`
- Replace `signIn.create({ strategy: 'reset_password_email_code', ... })` with `create({ identifier }) + resetPasswordEmailCode.sendCode()`
- Replace `signUp.prepareEmailAddressVerification()` with `signUp.verifications.sendEmailCode()`
- Replace `signUp.attemptEmailAddressVerification()` with `signUp.verifications.verifyEmailCode()`
- Always get `setActive` from `useClerk()`, never from `useSignIn()` or `useSignUp()`
