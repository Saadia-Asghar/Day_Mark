/**
 * /auth — Daymark sign-in screen.
 * Shown to unauthenticated visitors who try to access a protected route.
 */
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import markyWaving from "@assets/generated_images/marky_waving.png";
import { Gift } from "lucide-react";

export default function AuthPage() {
  const { login, isLoading, isAuthenticated } = useAuth();

  // If somehow already authenticated, redirect to home
  if (isAuthenticated) {
    window.location.replace("/home");
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-between px-6 py-12 text-foreground font-sans">
      {/* Top logo */}
      <div className="flex items-center gap-2 self-start">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Gift className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-xl tracking-tight">Daymark</span>
      </div>

      {/* Hero content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center gap-6 max-w-[320px]"
      >
        {/* Marky mascot */}
        <motion.img
          src={markyWaving}
          alt="Marky"
          className="w-28 h-28 drop-shadow-lg"
          initial={{ scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        />

        {/* Headline */}
        <div>
          <h1 className="text-[32px] leading-[1.15] font-extrabold tracking-tight text-foreground">
            Keep the little gifts{" "}
            <span className="text-primary italic">life gives you.</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground font-medium leading-relaxed">
            Save your moments, people and places in one beautiful space that belongs to you.
          </p>
        </div>

        {/* Gift memory card illustration */}
        <div className="w-full bg-white rounded-[20px] shadow-md border border-border p-4 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #A78BFA 0%, #6D4AFF 100%)" }}
          />
          <div className="text-left">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">New memory</p>
            <p className="text-sm font-semibold text-foreground leading-tight">Coffee with Sarah</p>
          </div>
          <div className="ml-auto w-8 h-8 rounded-full bg-[#EAE3FF] flex items-center justify-center text-base">
            🎁
          </div>
        </div>
      </motion.div>

      {/* Bottom CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="w-full max-w-[340px] flex flex-col gap-3"
      >
        <button
          onClick={login}
          disabled={isLoading}
          className="w-full h-[54px] bg-primary text-white rounded-full text-base font-bold shadow-[0_0_24px_rgba(104,71,245,0.35)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.97] transition-all disabled:opacity-60"
        >
          {isLoading ? "Signing in…" : "Continue →"}
        </button>

        <p className="text-center text-xs text-muted-foreground leading-relaxed px-2">
          Your memories stay private unless you choose to share them.
        </p>
      </motion.div>
    </div>
  );
}
