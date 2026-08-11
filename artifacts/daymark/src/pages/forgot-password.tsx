/**
 * /forgot-password — Password reset.
 *
 * IMPORTANT: In Clerk v6 signal API, the `signIn` from useSignIn() is a
 * reactive snapshot. Only the RETURNED value from signIn.create() is a live
 * SignInResource with all methods (attemptFirstFactor, resetPassword, etc.).
 * We store it in a ref and chain every subsequent call off that ref.
 *
 * Step 1 — email:  signIn.create({ strategy:'reset_password_email_code', identifier })
 *                  → returns live resource, store in ref, status = needs_first_factor
 * Step 2 — code:   resourceRef.current.attemptFirstFactor({ strategy:'reset_password_email_code', code })
 *                  → status = needs_new_password
 * Step 3 — set pw: resourceRef.current.resetPassword({ password })
 *                  → status = complete → activate session
 */
import { useSignIn } from "@clerk/react";
import { useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

type ResetStep = "email" | "verify" | "password" | "success";

function friendlyError(err: any): string {
  const e0 = err?.errors?.[0] ?? err;
  const code: string = e0?.code ?? "";
  const msg: string = e0?.longMessage ?? e0?.message ?? "";
  if (code.includes("not_found") || code.includes("identifier_not_found") || code.includes("no_user"))
    return "We couldn't find a Daymark with that email.";
  if (code.includes("incorrect_code") || code.includes("form_code_incorrect"))
    return "That code didn't work. Check it and try again.";
  if (code.includes("expired") || code.includes("verification_expired"))
    return "That code has expired. Request a new one.";
  if (code.includes("too_many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (code.includes("password_too_short"))
    return "Password must be at least 8 characters.";
  if (code.includes("pwned") || code.includes("password_common"))
    return "That password is too common. Please choose a stronger one.";
  return msg || "Something went wrong. Please try again.";
}

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();

  // Store the live SignInResource returned from create() — the hook's `signIn`
  // is a reactive snapshot and may not have all methods after state transitions.
  const resourceRef = useRef<any>(null);

  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.+)$/, (_, a, _b, c) => a + "•••" + c)
    : "";

  const startCooldown = (secs = 60) => {
    setResendCooldown(secs);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(v => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  // ── Step 1: send reset code ──────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      // create() returns the live resource — store it for subsequent steps
      const resource = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      resourceRef.current = resource;
      setStep("verify");
      startCooldown();
    } catch (err: any) {
      setError(friendlyError(err));
    }
    setLoading(false);
  };

  // ── Resend ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || !signIn) return;
    setError(null);
    try {
      const resource = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      resourceRef.current = resource;
      startCooldown();
    } catch (err: any) {
      setError(friendlyError(err));
    }
  };

  // ── Step 2: verify code ──────────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resource = resourceRef.current;
      if (!resource?.attemptFirstFactor) {
        setError("Session expired — please go back and request a new code.");
        setLoading(false);
        return;
      }
      const result = await resource.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      });
      resourceRef.current = result;

      if (result.status === "needs_new_password") {
        setStep("password");
      } else if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setStep("success");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(friendlyError(err));
    }
    setLoading(false);
  };

  // ── Step 3: set new password ─────────────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const resource = resourceRef.current;
      if (!resource?.resetPassword) {
        setError("Session expired — please start again.");
        setLoading(false);
        return;
      }
      const result = await resource.resetPassword({ password: newPassword });
      resourceRef.current = result;

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setStep("success");
      } else {
        setError("Password reset incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(friendlyError(err));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      {step !== "success" && (
        <button
          onClick={() => {
            if (step === "email") window.history.back();
            else if (step === "verify") setStep("email");
            else if (step === "password") setStep("verify");
          }}
          className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-5 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence mode="wait">

        {/* ── Step 1: Enter email ── */}
        {step === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="thinking" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Reset your password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter your email and we'll send a code</p>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
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
                  {error.includes("couldn't find") && (
                    <> <Link href="/sign-up"><span className="text-primary font-bold underline">Create an account</span></Link></>
                  )}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Send reset code"}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Step 2: Enter code ── */}
        {step === "verify" && (
          <motion.div key="verify" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="envelope" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Check your email 💌</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  We sent a reset code to <span className="font-bold text-foreground">{maskedEmail}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5">Verification code</label>
                <input
                  type="text" inputMode="numeric" maxLength={6} value={code} autoFocus
                  onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                  placeholder="123456"
                  className="w-full px-4 py-4 bg-white border-2 border-border rounded-2xl text-xl font-bold tracking-[0.25em] text-center outline-none focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
              )}

              <button type="submit" disabled={loading || code.length < 6}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Verify Code"}
              </button>

              <div className="flex items-center justify-center gap-4 text-sm">
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                  className={`font-bold ${resendCooldown > 0 ? "text-muted-foreground" : "text-primary"}`}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <span className="text-border">·</span>
                <button type="button" onClick={() => setStep("email")} className="text-muted-foreground font-medium">
                  Change email
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── Step 3: Set new password ── */}
        {step === "password" && (
          <motion.div key="password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="wave" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Set a new password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Make it something memorable but strong</p>
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
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center pt-16">
            <DaymarkCharacter character="marky" pose="celebrate" size="lg" animation="celebrate" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">Password changed ✨</h1>
            <p className="text-sm text-muted-foreground mb-8">You're all set. You're now signed in.</p>
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
