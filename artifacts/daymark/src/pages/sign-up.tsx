/**
 * /sign-up — Daymark sign-up with Supabase Auth. Email + password only.
 * After form submission Supabase sends a magic verification link.
 * The user clicks the link → redirected to /auth/callback → /onboarding.
 */
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react";
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

type Step = "form" | "check-email";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("form");
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidUsername(username)) { setUsernameAvail(null); return; }
    setUsernameChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${basePath}/api/users/search?q=${encodeURIComponent(username)}`);
        if (res.ok) {
          const d = await res.json();
          const taken = (d.users ?? []).some((u: { username?: string }) => u.username?.toLowerCase() === username.toLowerCase());
          setUsernameAvail(!taken);
        }
      } catch { /* silent */ }
      setUsernameChecking(false);
    }, 500);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (isValidUsername(username) && usernameAvail === false) { setError("That username is already taken. Try another."); return; }
    setLoading(true);

    try {
      // Build the redirect URL so Supabase knows where to send the user after email confirmation
      const redirectTo = `${window.location.origin}${basePath}/auth/callback?username=${encodeURIComponent(username)}`;

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            // Store username in user_metadata so auth-callback can save it
            username: isValidUsername(username) ? username : undefined,
          },
        },
      });

      if (signUpError) {
        setError(friendlyError(signUpError.message));
      } else {
        setStep("check-email");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <Link href="/auth">
              <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-5 active:scale-95 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>

            <div className="flex items-end gap-3 mb-6">
              <DaymarkCharacter character="marky" pose="holdingGift" size="sm" animation="float" />
              <div>
                <h1 className="text-2xl font-extrabold">Create your Daymark ✨</h1>
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
                    placeholder="yourname" autoCapitalize="none" autoCorrect="off"
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
        )}

        {step === "check-email" && (
          <motion.div key="check-email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center text-center pt-16 px-2">
            <DaymarkCharacter character="marky" pose="envelope" size="lg" animation="float" className="mb-6" />
            <h1 className="text-2xl font-extrabold mb-2">Check your inbox 💌</h1>
            <p className="text-sm text-muted-foreground mb-2">
              We sent a verification link to
            </p>
            <p className="font-bold text-foreground mb-6">{email}</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
              Click the link in the email to confirm your account and start your Daymark.
              The link expires in 24 hours.
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                onClick={() => setStep("form")}
                className="w-full h-12 border-2 border-border rounded-full font-bold text-sm text-foreground bg-white active:scale-[0.97] transition-all"
              >
                Use a different email
              </button>
              <Link href="/sign-in">
                <button className="w-full h-12 text-primary font-bold text-sm active:scale-[0.97] transition-all">
                  Already verified? Sign in
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
