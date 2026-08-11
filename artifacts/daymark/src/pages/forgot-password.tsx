/**
 * /forgot-password — Password reset via Supabase Auth.
 *
 * Step 1 — Enter email: supabase.auth.resetPasswordForEmail(email, { redirectTo })
 *   → Supabase sends a reset link to the user's inbox
 * Step 2 — "Check your email" screen (nothing to do in-app)
 *   → User clicks the link → redirected to /reset-password
 */
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "email" | "sent";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.+)$/, (_, a, _b, c) => a + "•••" + c)
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Route through /auth/callback so the already-mounted listener catches the
      // PASSWORD_RECOVERY event before redirecting to /reset-password.
      const redirectTo = `${window.location.origin}${basePath}/auth/callback?mode=recovery`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (resetError) {
        // For security, Supabase doesn't reveal whether an email exists.
        // Always show the "check email" screen regardless.
        console.warn("[forgot-password]", resetError.message);
      }
      setStep("sent");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <AnimatePresence mode="wait">

        {/* ── Step 1: Enter email ── */}
        {step === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <button
              onClick={() => window.history.back()}
              className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-5 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="thinking" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Reset your password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter your email and we'll send a link</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5">Email address</label>
                <input
                  type="email" autoComplete="email" value={email} autoFocus
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com" required
                  className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Send reset link"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember it?{" "}
              <Link href="/sign-in"><span className="text-primary font-bold">Sign in</span></Link>
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Check email ── */}
        {step === "sent" && (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center pt-16 px-2">
            <DaymarkCharacter character="marky" pose="envelope" size="lg" animation="float" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">Check your inbox 💌</h1>
            <p className="text-sm text-muted-foreground mb-2">
              If <span className="font-bold text-foreground">{maskedEmail}</span> has a Daymark, we've sent a reset link.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mt-2">
              Click the link in the email to set a new password. It expires in 1 hour.
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                onClick={() => { setStep("email"); setEmail(""); }}
                className="w-full h-12 border-2 border-border rounded-full font-bold text-sm text-foreground bg-white active:scale-[0.97] transition-all"
              >
                Try a different email
              </button>
              <Link href="/sign-in">
                <button className="w-full h-12 text-primary font-bold text-sm active:scale-[0.97] transition-all">
                  Back to sign in
                </button>
              </Link>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
