import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, AtSign, Check, X } from "lucide-react";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import heroImg from "@assets/generated_images/hero.png";
import markyCelebrating from "@assets/generated_images/marky_celebrating.png";

const WELCOME_STEPS = [
  {
    title: "Welcome to Daymark",
    desc: "Life leaves you little gifts every day. We help you keep them.",
    img: markyWaving,
  },
  {
    title: "Wrap Your Memories",
    desc: "Turn moments into beautiful memories you can open again.",
    img: heroImg,
  },
  {
    title: "Find Your People",
    desc: "Connect with friends and build DayLink streaks by sharing moments together.",
    img: markyCelebrating,
  },
];

// ── Username validation ────────────────────────────────────────────────────
function isValidUsername(u: string) {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

// ── Username step ─────────────────────────────────────────────────────────
function UsernameStep({ onDone }: { onDone: (username: string | null) => void }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [debounce, setDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    setValue(v);
    setAvailable(null);

    if (debounce) clearTimeout(debounce);
    if (!isValidUsername(v)) return;

    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(v)}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // Available if no one has this exact username
          const taken = (data.users ?? []).some((u: { username?: string }) => u.username?.toLowerCase() === v);
          setAvailable(!taken);
        }
      } catch { /* silent */ }
      setChecking(false);
    }, 500);
    setDebounce(t);
  };

  const canContinue = isValidUsername(value) && available !== false;

  const handleSubmit = async () => {
    if (!canContinue) return;
    if (value && available) {
      // Save username
      try {
        await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: value }),
        });
      } catch { /* best effort */ }
      onDone(value);
    } else {
      onDone(null);
    }
  };

  return (
    <div className="flex flex-col items-center text-center w-full px-4">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <AtSign className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-extrabold text-foreground mb-2">Choose your @username</h1>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-8 leading-relaxed">
        Friends can find you on Daymark with your @username. You can always change this later.
      </p>

      <div className="w-full max-w-[300px] relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">@</div>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="yourname"
          className="w-full pl-9 pr-10 py-3.5 bg-white border-2 border-border rounded-2xl text-sm font-bold outline-none focus:border-primary transition-colors"
          autoCapitalize="none"
          autoCorrect="off"
        />
        {value.length >= 3 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking ? (
              <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            ) : available === true ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : available === false ? (
              <X className="w-4 h-4 text-red-400" />
            ) : null}
          </div>
        )}
      </div>

      {/* Validation hint */}
      <div className="mt-2 h-5">
        {value.length > 0 && !isValidUsername(value) && (
          <p className="text-xs text-muted-foreground">3–24 chars, letters, numbers and _ only</p>
        )}
        {isValidUsername(value) && available === false && (
          <p className="text-xs text-red-500">That username is taken</p>
        )}
        {isValidUsername(value) && available === true && (
          <p className="text-xs text-green-600 font-semibold">@{value} is available!</p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[300px] mt-6">
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="w-full bg-primary text-white py-4 rounded-2xl text-base font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {value && available ? "Claim @" + value : "Continue"}
        </button>
        <button onClick={() => onDone(null)} className="text-sm text-muted-foreground font-medium">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [showUsernameStep, setShowUsernameStep] = useState(false);
  const completeOnboarding = useCompleteOnboarding();
  const qc = useQueryClient();

  // Total steps: welcome slides + username step
  const TOTAL_DOTS = WELCOME_STEPS.length + 1;

  const finish = () => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setLocation("/home");
      },
      onError: () => setLocation("/home"),
    });
  };

  const nextStep = () => {
    if (step < WELCOME_STEPS.length - 1) {
      setStep(step + 1);
    } else if (!showUsernameStep) {
      setShowUsernameStep(true);
    } else {
      finish();
    }
  };

  const handleUsernameDone = (_username: string | null) => {
    finish();
  };

  const currentDot = showUsernameStep ? WELCOME_STEPS.length : step;

  return (
    <div className="h-[100dvh] bg-background flex flex-col items-center justify-between p-5 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      {/* Progress dots */}
      <div className="w-full flex justify-between items-center pt-8 z-10">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_DOTS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentDot ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <button onClick={finish} className="text-sm font-bold text-muted-foreground">
          Skip
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {!showUsernameStep ? (
            <motion.div
              key={`slide-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center w-full"
            >
              <div className="w-64 h-64 md:w-80 md:h-80 relative mb-10">
                <img
                  src={WELCOME_STEPS[step].img}
                  alt={WELCOME_STEPS[step].title}
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {WELCOME_STEPS[step].title}
              </h1>
              <p className="text-lg text-muted-foreground font-medium px-4 max-w-xs leading-relaxed">
                {WELCOME_STEPS[step].desc}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="username-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <UsernameStep onDone={handleUsernameDone} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA button — only shown for welcome slides, not username step */}
      {!showUsernameStep && (
        <div className="w-full pb-10 z-10">
          <button
            onClick={nextStep}
            disabled={completeOnboarding.isPending}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
          >
            {step === WELCOME_STEPS.length - 1 ? "Let's go 🎁" : "Continue"}
            {step < WELCOME_STEPS.length - 1 && !completeOnboarding.isPending && (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
