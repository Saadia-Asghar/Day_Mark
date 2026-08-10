/**
 * /sign-in — Custom Daymark sign-in using Clerk v6 useSignIn hook.
 */
import { useSignIn } from "@clerk/react";
import { useClerk } from "@clerk/react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DaymarkCharacter } from "@/components/daymark-character";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function friendlyError(code: string | undefined, msg: string): string {
  if (!code) return msg || "Something went wrong.";
  if (code.includes("password_incorrect") || code.includes("invalid_credentials") || code.includes("form_password_incorrect")) {
    return "That password doesn't match. Try again or reset it.";
  }
  if (code.includes("not_found") || code.includes("no_user") || code.includes("identifier_not_found")) {
    return "We couldn't find a Daymark with that email.";
  }
  if (code.includes("too_many")) return "Too many attempts. Please wait a moment and try again.";
  if (code.includes("unverified")) return "Your email isn't verified yet. Check your inbox.";
  return msg || "Something went wrong. Please try again.";
}

export default function SignInPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signIn.password({
        identifier: email.trim(),
        password,
      });
      if (signInError) {
        setError(friendlyError(signInError.code, (signInError as any).longMessage ?? signInError.message ?? "Sign in failed."));
      } else if (signIn.status === "complete" && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        setLocation("/home");
      } else {
        setError("Additional verification required. Please try again.");
      }
    } catch (err: any) {
      const e0 = err?.errors?.[0] ?? err;
      setError(friendlyError(e0?.code, e0?.longMessage ?? e0?.message ?? "Sign in failed."));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      await signIn?.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${basePath}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}${basePath}/auth`,
      });
    } catch (e) { console.error(e); }
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

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full h-[52px] bg-white border border-border rounded-full text-sm font-bold text-foreground flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-sm"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <p className="text-center text-sm text-muted-foreground mt-6">
        New to Daymark?{" "}
        <Link href="/sign-up"><span className="text-primary font-bold">Create your Daymark</span></Link>
      </p>
    </div>
  );
}
