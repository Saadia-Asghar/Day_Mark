/**
 * /sign-in — Daymark sign-in with Supabase Auth. Email + password only.
 */
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

const REMEMBER_EMAIL_KEY = "daymark_remembered_email";

function friendlyError(message: string): string {
  const m = message?.toLowerCase() ?? "";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("email rate"))
    return "Too many attempts — please wait a few minutes and try again.";
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password"))
    return "That password doesn't match. Try again or reset it.";
  if (m.includes("user not found") || m.includes("no user"))
    return "We couldn't find a Daymark with that email.";
  if (m.includes("too many") || m.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("email not confirmed"))
    return "Instant signup is not enabled yet. The Daymark administrator must disable Confirm email in Supabase.";
  return message || "Something went wrong. Please try again.";
}

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const passwordReset = new URLSearchParams(search).get("passwordReset") === "1";

  const savedEmail = typeof localStorage !== "undefined"
    ? (localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "") : "";

  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(savedEmail !== "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(friendlyError(signInError.message));
      } else {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        setLocation("/home");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <Link href="/">
        <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-6 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </Link>

      <div className="flex items-end gap-4 mb-6">
        <DaymarkCharacter character="marky" pose="wave" size="sm" animation="float" />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sign in to your Daymark</p>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {passwordReset && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 font-medium">
            Your password was changed. Sign in with your new password.
          </div>
        )}
        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">Email address</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-bold text-foreground">Password</label>
            <Link href="/forgot-password">
              <span className="text-xs font-bold text-primary">Forgot password?</span>
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setRememberMe(v => !v)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0
              ${rememberMe ? "bg-primary border-primary" : "bg-white border-border"}`}
          >
            {rememberMe && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-sm text-foreground font-medium">Remember me</span>
        </label>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium space-y-1.5">
            <p>{error}</p>
            {error.includes("couldn't find") && (
              <Link href="/sign-up"><span className="text-primary font-bold underline">Create an account</span></Link>
            )}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] bg-primary text-white rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 transition-all mt-1"
        >
          {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Sign In"}
        </button>
      </motion.form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        New to Daymark?{" "}
        <Link href="/sign-up"><span className="text-primary font-bold">Create your Daymark</span></Link>
      </p>

      <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed">
        By continuing, you agree to our{" "}
        <Link href="/terms"><span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Terms</span></Link>
        {" "}and{" "}
        <Link href="/privacy"><span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Privacy Policy</span></Link>.
      </p>
    </div>
  );
}
