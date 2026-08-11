/**
 * /sign-in — Localised Daymark sign-in. Email + password only; no OAuth.
 */
import { useSignIn } from "@clerk/react";
import { useClerk } from "@clerk/react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const REMEMBER_EMAIL_KEY = "daymark_remembered_email";

function friendlyError(code: string | undefined, msg: string): string {
  if (!code) return msg || "Something went wrong.";
  if (
    code.includes("password_incorrect") ||
    code.includes("invalid_credentials") ||
    code.includes("form_password_incorrect")
  ) return "That password doesn't match. Try again or reset it.";
  if (
    code.includes("not_found") ||
    code.includes("no_user") ||
    code.includes("identifier_not_found")
  ) return "We couldn't find a Daymark with that email.";
  if (code.includes("too_many")) return "Too many attempts. Please wait a moment and try again.";
  if (code.includes("unverified")) return "Your email isn't verified yet. Check your inbox.";
  if (code.includes("strategy") || code.includes("verification_strategy"))
    return "Sign-in failed. If you just registered, please check your email for a verification link and try again.";
  return msg || "Something went wrong. Please try again.";
}

export default function SignInPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();

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
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      // Step 1: identify the user
      let result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      // Step 2: if Clerk still needs the password as a first factor, supply it.
      // Use result.attemptFirstFactor (on the returned resource), NOT signIn.attemptFirstFactor
      // (the hook's signIn is a reactive snapshot and may not have all methods).
      if (result.status === "needs_first_factor") {
        result = await result.attemptFirstFactor({
          strategy: "password",
          password,
        });
      }

      if (result.status === "complete") {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        await setActive({ session: result.createdSessionId });
        setLocation("/home");
      } else {
        setError("Sign-in incomplete — please try again.");
      }
    } catch (err: any) {
      const e0 = err?.errors?.[0] ?? err;
      setError(friendlyError(e0?.code, e0?.longMessage ?? e0?.message ?? "Sign in failed."));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col px-6 pt-14 pb-10 overflow-x-hidden">
      <Link href="/auth">
        <button className="w-9 h-9 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mb-6 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </Link>

      <div className="flex items-end gap-4 mb-6">
        <DaymarkCharacter character="marky" pose="wave" size="sm" animation="float" />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Welcome back 💜</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sign in to your Daymark</p>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
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
            className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
            {error}
            {error.includes("couldn't find") && (
              <> <Link href="/sign-up"><span className="text-primary font-bold underline">Create an account</span></Link></>
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
