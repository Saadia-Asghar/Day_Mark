/**
 * /reset-password — Lets the user set a new password after a recovery flow.
 *
 * SECURITY: This page only allows password changes when there is a verified
 * recovery context. It never allows an ordinary signed-in session to trigger
 * a password change — that would be a privilege-escalation vector if a user
 * navigated here directly while already authenticated.
 *
 * Recovery context is established in one of two ways:
 *   1. auth-callback caught a PASSWORD_RECOVERY event and set the
 *      `daymark_recovery_mode` sessionStorage flag before redirecting here.
 *   2. The user clicked a recovery link that goes directly to this page
 *      (less common, but supported): we listen for PASSWORD_RECOVERY from
 *      onAuthStateChange. Supabase processes the URL hash on client init,
 *      so the event may fire before this component mounts — we handle that
 *      case via the flag OR by rechecking after mount.
 *
 * The SIGNED_IN event is intentionally NOT treated as recovery authorisation.
 */
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";
import { RECOVERY_FLAG } from "./auth-callback";

type Step = "loading" | "set-password" | "success" | "error";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Path 1: auth-callback set the recovery flag before redirecting here.
    // The flag means Supabase already processed the recovery token and we have
    // a valid recovery session. Consume the flag immediately.
    const hasFlag = sessionStorage.getItem(RECOVERY_FLAG) === "1";
    if (hasFlag) {
      sessionStorage.removeItem(RECOVERY_FLAG);
      setStep("set-password");
      return;
    }

    // Path 2: user arrived directly at /reset-password via the recovery link.
    // Supabase processes the URL hash on client init (before mount), so
    // PASSWORD_RECOVERY may fire before we subscribe. We listen for it anyway
    // in case timing allows, and fall back to the timeout → error.
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        // Clear any stale flag from a previous recovery session
        sessionStorage.removeItem(RECOVERY_FLAG);
        setStep("set-password");
      }
      // Intentionally NOT handling SIGNED_IN here — an ordinary session does
      // not constitute recovery authorisation.
    });

    // If we haven't heard a recovery event after 3 s the link is invalid/expired.
    const timer = setTimeout(() => {
      if (!cancelled && step === "loading") {
        setStep("error");
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        const m = updateError.message.toLowerCase();
        if (m.includes("same password")) {
          setError("Please choose a different password from your current one.");
        } else if (m.includes("expired") || m.includes("invalid")) {
          setError("This reset link has expired. Request a new one.");
          setStep("error");
        } else {
          setError("Failed to update password. Please try again.");
        }
      } else {
        setStep("success");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <AnimatePresence mode="wait">

        {/* Loading */}
        {step === "loading" && (
          <motion.div key="loading" className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-semibold">Verifying your link…</p>
          </motion.div>
        )}

        {/* Error — expired or invalid link */}
        {step === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center pt-16 px-2">
            <DaymarkCharacter character="marky" pose="thinking" size="lg" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">This reset link has expired.</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Password reset links expire after 1 hour. Request a new one below.
            </p>
            <button
              onClick={() => setLocation("/forgot-password")}
              className="w-full max-w-sm h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] transition-all"
            >
              Request a new link
            </button>
          </motion.div>
        )}

        {/* Set new password — only shown after verified recovery context */}
        {step === "set-password" && (
          <motion.div key="set-password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="wave" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Set a new password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Make it something strong</p>
              </div>
            </div>

            <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} autoComplete="new-password"
                    value={newPassword} autoFocus
                    onChange={e => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"} autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
              )}

              <button type="submit" disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all mt-1">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Set New Password"}
              </button>
            </form>
          </motion.div>
        )}

        {/* Success */}
        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center pt-16">
            <DaymarkCharacter character="marky" pose="celebrate" size="lg" animation="celebrate" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">Your password has been changed ✨</h1>
            <p className="text-sm text-muted-foreground mb-8">You're all set. Sign in with your new password.</p>
            <button onClick={() => setLocation("/home")}
              className="w-full max-w-sm h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] transition-all">
              Go to my Daymark
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
