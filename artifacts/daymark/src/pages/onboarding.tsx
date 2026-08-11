/**
 * Onboarding — shown to new users after email verification.
 * Screens: 4 intro slides → personal setup → /home
 *
 * Username is collected during sign-up. If somehow missing (e.g. the sign-up
 * redirect was skipped), the username step is shown before completing setup.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, AtSign, Check, X, Camera } from "lucide-react";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { DaymarkCharacter } from "@/components/daymark-character";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Spec slides (Section 6) ────────────────────────────────────────────────
const WELCOME_STEPS = [
  {
    emoji: "🎁",
    title: "Keep your moments",
    desc: "Save photos, stories and little things that matter.",
    character: "marky" as const,
    pose: "idle" as const,
    animation: "float" as const,
  },
  {
    emoji: "💜",
    title: "Remember with your people",
    desc: "Build Daylinks, shared memories and Future Gifts.",
    character: "hearty" as const,
    pose: "idle" as const,
    animation: "float" as const,
  },
  {
    emoji: "💌",
    title: "Send something into the future",
    desc: "Save messages for birthdays, anniversaries and meaningful days.",
    character: "marky" as const,
    pose: "idle" as const,
    animation: "float" as const,
  },
  {
    emoji: "🌍",
    title: "See little moments from everywhere",
    desc: "Explore memories people explicitly choose to share.",
    character: "marky" as const,
    pose: "celebrate" as const,
    animation: "float" as const,
  },
];

// ── Username validation ────────────────────────────────────────────────────
function isValidUsername(u: string) {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

function UsernameStep({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [debounce, setDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    setValue(v);
    setAvailable(null);
    if (debounce) clearTimeout(debounce);
    if (!isValidUsername(v)) return;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${basePath}/api/users/search?q=${encodeURIComponent(v)}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const taken = (data.users ?? []).some((u: { username?: string }) => u.username?.toLowerCase() === v);
          setAvailable(!taken);
        }
      } catch { /* silent */ }
      setChecking(false);
    }, 500);
    setDebounce(t);
  };

  const canContinue = !value || (isValidUsername(value) && available !== false);

  const handleSubmit = async () => {
    if (!canContinue) return;
    setSaving(true);
    if (value && available) {
      try {
        await fetch(`${basePath}/api/auth/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: value }),
        });
      } catch { /* best effort */ }
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="flex flex-col items-center text-center w-full px-4">
      <DaymarkCharacter character="marky" pose="wave" size="lg" animation="wave" className="mb-6" />
      <h1 className="text-2xl font-extrabold text-foreground mb-2">Choose your @username</h1>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-8 leading-relaxed">
        Friends can find you on Daymark with your @username.
      </p>

      <div className="w-full max-w-[300px] relative mb-1">
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

      <div className="h-5 mb-4">
        {value && !isValidUsername(value) && (
          <p className="text-xs text-muted-foreground">3–24 chars, letters, numbers and _ only</p>
        )}
        {isValidUsername(value) && available === false && (
          <p className="text-xs text-red-500">That username is already part of someone's story.</p>
        )}
        {isValidUsername(value) && available === true && (
          <p className="text-xs text-green-600 font-semibold">✓ @{value} is available</p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[300px]">
        <button
          onClick={handleSubmit}
          disabled={!canContinue || saving}
          className="w-full bg-primary text-white py-4 rounded-2xl text-base font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : value && available ? `Claim @${value}` : "Continue"}
        </button>
        <button onClick={onDone} className="text-sm text-muted-foreground font-medium">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Personal setup step (Section 7) ───────────────────────────────────────
function PersonalSetupStep({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    if (displayName.trim()) body.displayName = displayName.trim();
    if (birthday) body.birthday = birthday;
    if (city.trim()) body.city = city.trim();
    if (Object.keys(body).length > 0) {
      try {
        await fetch(`${basePath}/api/auth/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } catch { /* best effort */ }
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="flex flex-col items-center w-full px-4">
      <DaymarkCharacter character="marky" pose="celebrate" size="md" animation="float" className="mb-5" />
      <h1 className="text-2xl font-extrabold text-center mb-1">Almost there ✨</h1>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-[240px] leading-relaxed">
        A few optional details to personalise your Daymark.
      </p>

      <div className="w-full max-w-[320px] flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold block mb-1.5">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5">Birthday <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5">City <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Where are you based?"
            className="w-full px-4 py-3.5 bg-white border-2 border-border rounded-2xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[320px] mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-white py-4 rounded-2xl text-base font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : "Start my Daymark 🎁"}
        </button>
        <button onClick={onDone} className="text-sm text-muted-foreground font-medium">
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
  const [showSetupStep, setShowSetupStep] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [checked, setChecked] = useState(false);
  const completeOnboarding = useCompleteOnboarding();
  const qc = useQueryClient();

  // Detect if user already has a username; show the username step if not
  useEffect(() => {
    fetch(`${basePath}/api/auth/user`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const hasUsername = !!(d?.user?.username);
        setNeedsUsername(!hasUsername);
        setChecked(true);
      })
      .catch(() => { setNeedsUsername(false); setChecked(true); });
  }, []);

  const totalDots = WELCOME_STEPS.length + (needsUsername ? 1 : 0) + 1; // +1 for setup
  const currentDot = showSetupStep
    ? totalDots - 1
    : showUsernameStep
      ? WELCOME_STEPS.length
      : step;

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
    } else if (needsUsername && !showUsernameStep) {
      setShowUsernameStep(true);
    } else {
      setShowSetupStep(true);
    }
  };

  if (!checked) return null;

  const current = WELCOME_STEPS[step];

  return (
    <div className="h-[100dvh] bg-background flex flex-col items-center justify-between p-5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      {/* Progress dots */}
      <div className="w-full flex justify-between items-center pt-8 z-10">
        <div className="flex gap-2">
          {Array.from({ length: totalDots }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === currentDot ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
        <button onClick={finish} className="text-sm font-bold text-muted-foreground">
          Skip
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {showSetupStep ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <PersonalSetupStep onDone={finish} />
            </motion.div>
          ) : showUsernameStep ? (
            <motion.div
              key="username"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <UsernameStep onDone={() => setShowSetupStep(true)} />
            </motion.div>
          ) : (
            <motion.div
              key={`slide-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center w-full"
            >
              <DaymarkCharacter
                character={current.character}
                pose={current.pose}
                size="hero"
                animation={current.animation}
                className="mb-8"
              />
              <div className="text-5xl mb-4">{current.emoji}</div>
              <h1 className="text-3xl font-bold text-foreground mb-4">{current.title}</h1>
              <p className="text-lg text-muted-foreground font-medium px-4 max-w-xs leading-relaxed">{current.desc}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA — only on slide steps */}
      {!showUsernameStep && !showSetupStep && (
        <div className="w-full pb-10 z-10">
          <button
            onClick={nextStep}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {step === WELCOME_STEPS.length - 1 ? "Let's go 🎁" : "Continue"}
            {step < WELCOME_STEPS.length - 1 && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
