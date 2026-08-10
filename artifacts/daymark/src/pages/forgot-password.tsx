/**
 * /forgot-password — Clerk v6 password reset flow.
 * Steps: enter email → enter code + new password → success (signed in)
 */
import { useSignIn } from "@clerk/react";
import { useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

type ResetStep = "email" | "reset" | "success";

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();
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

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(v => { if (v <= 1) { clearInterval(cooldownRef.current!); return 0; } return v - 1; });
    }, 1000);
  };

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.+)$/, (_, a, _b, c) => a + "•••" + c)
    : "";

  const sendCode = async (emailAddr: string) => {
    if (!signIn) return false;
    try {
      // First identify the user, then send the reset code
      const { error: createError } = await signIn.create({ identifier: emailAddr });
      if (createError) {
        const ce = createError as any;
        const c = ce.code ?? "";
        if (c.includes("not_found") || c.includes("no_user") || c.includes("identifier_not_found")) {
          setError("We couldn't find a Daymark with that email.");
        } else {
          setError(ce.longMessage ?? ce.message ?? "Couldn't find your account.");
        }
        return false;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        const e = sendError as any;
        const code2 = e.code ?? "";
        if (code2.includes("not_found") || code2.includes("no_user")) {
          setError("We couldn't find a Daymark with that email.");
        } else {
          setError(e.longMessage ?? e.message ?? "Couldn't send reset code. Try again.");
        }
        return false;
      }
      return true;
    } catch (err: any) {
      const e0 = err?.errors?.[0] ?? err;
      setError(e0?.longMessage ?? e0?.message ?? "Couldn't send reset code. Try again.");
      return false;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    const ok = await sendCode(email.trim());
    if (ok) { setStep("reset"); startCooldown(); }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !signIn) return;
    setError(null);
    const ok = await sendCode(email.trim());
    if (ok) startCooldown();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      // Step 1: verify the code
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) {
        const e = verifyError as any;
        const c = e.code ?? "";
        if (c.includes("incorrect") || c.includes("wrong")) setError("That code didn't work. Check it and try again.");
        else if (c.includes("expired")) setError("That code expired. Request a new one.");
        else setError(e.longMessage ?? e.message ?? "Verification failed.");
        setLoading(false);
        return;
      }

      // Step 2: submit new password (status is now needs_new_password)
      const { error: pwError } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (pwError) {
        const e = pwError as any;
        setError(e.longMessage ?? e.message ?? "Couldn't set new password. Try again.");
        setLoading(false);
        return;
      }

      // Complete — activate session
      if (signIn.status === "complete" && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        setStep("success");
      } else {
        setError("Something went wrong. Please start again.");
      }
    } catch (err: any) {
      const e0 = err?.errors?.[0] ?? err;
      setError(e0?.longMessage ?? e0?.message ?? "Reset failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      {step !== "success" && (
        <Link href="/sign-in">
          <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-5 active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
      )}

      <AnimatePresence mode="wait">
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
                <input type="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com" required autoFocus
                  className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
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

        {step === "reset" && (
          <motion.div key="reset" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="envelope" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Check your email 💌</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  We sent a reset code to <span className="font-bold text-foreground">{maskedEmail}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5">Verification code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                  placeholder="123456" autoFocus
                  className="w-full px-4 py-4 bg-white border-2 border-border rounded-2xl text-xl font-bold tracking-[0.25em] text-center outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">New password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} autoComplete="new-password" value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(null); }} placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">Confirm new password</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(null); }} placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
              )}

              <button type="submit" disabled={loading || code.length < 6 || !newPassword}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center active:scale-[0.97] disabled:opacity-60 transition-all">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Reset Password"}
              </button>

              <div className="flex items-center justify-center gap-4 text-sm">
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                  className={`font-bold ${resendCooldown > 0 ? "text-muted-foreground" : "text-primary"}`}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <span className="text-border">·</span>
                <button type="button" onClick={() => setStep("email")} className="text-muted-foreground font-medium">Back to Sign In</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center pt-16">
            <DaymarkCharacter character="marky" pose="celebrate" size="lg" animation="celebrate" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">Your password has been changed ✨</h1>
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
