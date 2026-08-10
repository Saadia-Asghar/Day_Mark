/**
 * /auth — Auth chooser landing.
 */
import React from "react";
import { useSignIn } from "@clerk/react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
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

export default function AuthPage() {
  const { signIn } = useSignIn();
  const [googleError, setGoogleError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const handleGoogle = async () => {
    if (!signIn || googleLoading) return;
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${basePath}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}${basePath}/home`,
      });
    } catch (e: any) {
      console.error("Google auth error", e);
      const msg = e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Google sign-in failed.";
      setGoogleError(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-between px-6 pt-16 pb-10 overflow-x-hidden relative">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-[#EAE3FF]/50 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-white font-extrabold text-base">D</span>
        </div>
        <span className="font-extrabold text-xl text-foreground tracking-tight">Daymark</span>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center text-center"
      >
        <DaymarkCharacter character="marky" pose="wave" size="hero" animation="float" className="mb-6" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <h1 className="text-[32px] font-extrabold text-foreground leading-[1.15] tracking-tight mb-3">
            Your memories<br />have a home.
          </h1>
          <p className="text-base text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Keep the moments, people and little things that make life yours.
          </p>
        </motion.div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="w-full flex flex-col gap-3 max-w-sm"
      >
        <Link href="/sign-up">
          <button className="w-full h-[54px] bg-primary text-white rounded-full text-base font-bold shadow-[0_0_24px_rgba(104,71,245,0.35)] flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
            Create my Daymark <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <Link href="/sign-in">
          <button className="w-full h-[54px] bg-white border-2 border-border rounded-full text-base font-bold text-foreground flex items-center justify-center active:scale-[0.97] transition-all shadow-sm">
            I already have an account
          </button>
        </Link>
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full h-[54px] bg-white border border-border rounded-full text-sm font-bold text-foreground flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-sm disabled:opacity-60"
        >
          {googleLoading
            ? <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            : <GoogleIcon />
          }
          Continue with Google
        </button>
        {googleError && (
          <p className="text-center text-xs text-destructive font-medium -mt-1">{googleError}</p>
        )}
        <p className="text-center text-xs text-muted-foreground mt-1 leading-relaxed">
          By continuing, you agree to our{" "}
          <span className="text-primary font-semibold">Terms</span> and{" "}
          <span className="text-primary font-semibold">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
