/**
 * /auth — Auth chooser. No external OAuth — fully localised email/password flow.
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { DaymarkCharacter } from "@/components/daymark-character";

export default function AuthPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-between px-6 pt-16 pb-10 overflow-x-hidden relative">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-[#EAE3FF]/50 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
        <DaymarkCharacter character="marky" pose="idle" size="xs" animation="none" className="!w-9 !h-9" />
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

        <p className="text-center text-xs text-muted-foreground mt-2 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link href="/terms">
            <span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Terms</span>
          </Link>
          {" "}and{" "}
          <Link href="/privacy">
            <span className="text-primary font-semibold underline-offset-2 hover:underline cursor-pointer">Privacy Policy</span>
          </Link>.
        </p>
      </motion.div>
    </div>
  );
}
