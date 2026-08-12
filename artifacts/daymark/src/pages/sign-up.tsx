import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Check, X, ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function isValidUsername(u: string) {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

function friendlyError(message: string): string {
  const m = message?.toLowerCase() ?? "";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return "That email already has a Daymark.";
  if (m.includes("password") && m.includes("short"))
    return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("valid email"))
    return "Please enter a valid email address.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("email rate"))
    return "Too many sign-up attempts — please wait a few minutes and try again.";
  return message || "Something went wrong. Please try again.";
}

function PasswordStrength({ pw }: { pw: string }) {
  const reqs = [
    { label: "At least 8 characters",  met: pw.length >= 8 },
    { label: "One uppercase letter",    met: /[A-Z]/.test(pw) },
    { label: "One lowercase letter",    met: /[a-z]/.test(pw) },
    { label: "One number",             met: /\d/.test(pw) },
  ];
  if (!pw) return null;
  return (
    <div className="mt-2 space-y-1">
      {reqs.map(r => (
        <div key={r.label} className="flex items-center gap-1.5">
          {r.met ? <Check className="w-3 h-3 text-green-500 flex-shrink-0" /> : <X className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
          <span className={`text-xs ${r.met ? "text-green-600 font-medium" : "text-muted-foreground"}`}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameAvail, setUsernameAvail] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidUsername(username)) { setUsernameAvail(null); return; }
    setUsernameChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${basePath}/api/users/check-username?q=${encodeURIComponent(username)}`);
        if (res.ok) {
          const d = await res.json();
          setUsernameAvail(d.available === true);
        }
      } catch { /* silent */ }
      setUsernameChecking(false);
    }, 500);
  }, [username]);

  // Cooldown countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    await supabase.auth.resend({ type: "signup", email: email.trim() }).catch(() => undefined);
    setResendLoading(false);
    setResendCooldown(60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (isValidUsername(username) && usernameAvail === false) { setError("That username is already taken. Try another."); return; }
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            // Keep a copy in auth metadata as a fallback for onboarding.
            username: isValidUsername(username) ? username : undefined,
          },
        },
      });

      if (signUpError) {
        setError(friendlyError(signUpError.message));
      } else if (!data.session) {
        // Email confirmation required — account created, awaiting verification
        setAwaitingConfirmation(true);
      } else {
        if (isValidUsername(username)) {
          await fetch(`${basePath}/api/auth/profile`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ username }),
          }).catch(() => undefined);
        }
        setLocation("/onboarding");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  // ── Awaiting email confirmation screen ──────────────────────────────────
  if (awaitingConfirmation) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center px-6 pb-10">
        <AnimatePresence>
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-sm text-center"
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-9 h-9 text-primary" />
            </div>

            <h1 className="text-2xl font-extrabold mb-2">Check your inbox</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1">
              We sent a confirmation link to
            </p>
            <p className="text-sm font-bold text-foreground mb-6 break-all">{email}</p>

            <div className="bg-white border border-border rounded-2xl px-5 py-4 text-left mb-6 shadow-sm">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the link in the email to activate your account, then come back here to sign in.
                If you don't see it, check your spam folder.
              </p>
            </div>

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="w-full h-[52px] border-2 border-primary text-primary rounded-full font-bold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 transition-all mb-4"
            >
              {resendLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend confirmation email"}
            </button>

            <Link href="/sign-in">
              <button className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
                Go to sign in
              </button>
            </Link>

            <button
              onClick={() => { setAwaitingConfirmation(false); setError(null); }}
              className="mt-4 text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              Use a different email
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
            <Link href="/auth">
              <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-5 active:scale-95 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>

            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="holdingGift" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Create your Daymark</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Your memories start here</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5">Email address</label>
                <input type="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com" required
                  className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">Username</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">@</div>
                  <input type="text" value={username}
                    onChange={e => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24); setUsername(v); setError(null); }}
                    placeholder="yourname" autoCapitalize="none" autoCorrect="off" autoComplete="username"
                    className="w-full pl-9 pr-10 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameChecking ? <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      : isValidUsername(username) && usernameAvail === true ? <Check className="w-4 h-4 text-green-500" />
                      : isValidUsername(username) && usernameAvail === false ? <X className="w-4 h-4 text-red-400" /> : null}
                  </div>
                </div>
                <div className="mt-1 h-5">
                  {username && !isValidUsername(username) && <p className="text-xs text-muted-foreground">3–24 chars, letters, numbers and _ only</p>}
                  {isValidUsername(username) && usernameAvail === false && <p className="text-xs text-red-500">That username is already part of someone's story.</p>}
                  {isValidUsername(username) && usernameAvail === true && <p className="text-xs text-green-600 font-semibold">✓ @{username} is available</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} autoComplete="new-password" value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }} placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength pw={password} />
              </div>

              <div>
                <label className="text-sm font-bold block mb-1.5">Confirm password</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(null); }} placeholder="••••••••" required
                    className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>}
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                  {error.includes("already has a Daymark") && (
                    <> <Link href="/sign-in"><span className="text-primary font-bold underline">Sign In Instead</span></Link></>
                  )}
                </motion.div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 transition-all mt-1">
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Continue"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have a Daymark?{" "}
              <Link href="/sign-in"><span className="text-primary font-bold">Sign in</span></Link>
            </p>
            <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed">
              By continuing, you agree to our{" "}
              <Link href="/terms"><span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Terms</span></Link>
              {" "}and{" "}
              <Link href="/privacy"><span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Privacy Policy</span></Link>.
            </p>
      </motion.div>
    </div>
  );
}
