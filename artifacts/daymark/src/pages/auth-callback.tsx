/**
 * /auth/callback — Handles ALL Supabase email-link redirects.
 *
 * Supabase routes three distinct link types here:
 *   • signup confirmation → continue into onboarding
 *   • password recovery   → go to /reset-password so the user can set a new password
 *   • magic-link login    → go to /home
 *
 * Supabase fires onAuthStateChange synchronously when it processes the URL
 * fragment tokens. Because this page is already mounted and subscribed, it
 * reliably catches the event — unlike /reset-password, which mounts AFTER
 * Supabase has already processed the hash.
 *
 * Open-redirect protection: only known Daymark paths are allowed as
 * redirect destinations — the `mode` query param controls intent,
 * never an arbitrary `next=` URL.
 */
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Session-storage key used to authorise the reset-password page. */
export const RECOVERY_FLAG = "daymark_recovery_mode";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    // Username passed through the sign-up redirect URL so we can persist it.
    const username = params.get("username");
    // `mode=recovery` is set by forgot-password.tsx to flag recovery intent.
    const isRecoveryIntent = params.get("mode") === "recovery";

    let cancelled = false;

    // Hard timeout — if Supabase never fires an event the token is invalid/expired.
    const timer = setTimeout(() => {
      if (!cancelled) setError("We couldn't verify that link. Request a new one.");
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY") {
        // User clicked a password-reset link.
        // Set a short-lived flag so /reset-password knows the session is genuine.
        sessionStorage.setItem(RECOVERY_FLAG, "1");
        clearTimeout(timer);
        setLocation("/reset-password");
        return;
      }

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        clearTimeout(timer);

        // Safety check: if the link came from a recovery email but Supabase fired
        // SIGNED_IN instead of PASSWORD_RECOVERY, treat it as recovery.
        if (isRecoveryIntent) {
          sessionStorage.setItem(RECOVERY_FLAG, "1");
          setLocation("/reset-password");
          return;
        }

        // Persist the username chosen during sign-up (best effort).
        if (username) {
          try {
            await fetch(`${basePath}/api/auth/profile`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ username }),
            });
          } catch { /* best effort — onboarding will prompt if still missing */ }
        }

        setLocation("/onboarding");
        return;
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [setLocation, search]);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-2xl">😕</p>
        <h1 className="text-lg font-extrabold text-foreground">Link expired or invalid</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => setLocation("/sign-in")}
          className="mt-4 h-12 px-8 bg-primary text-white rounded-full font-bold text-sm shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-[0.97] transition-all"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground font-semibold">Confirming your email…</p>
    </div>
  );
}
