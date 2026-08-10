import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import heroImg from "@assets/generated_images/hero.png";
import markyCelebrating from "@assets/generated_images/marky_celebrating.png";

const STEPS = [
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
    title: "Open Anytime",
    desc: "Your memories, beautifully kept. Whenever you need them.",
    img: markyCelebrating,
  }
];

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const completeOnboarding = useCompleteOnboarding();
  const qc = useQueryClient();

  const finish = () => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/home");
      },
      onError: () => setLocation("/home"),
    });
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col items-center justify-between p-5 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
      
      <div className="w-full flex justify-between items-center pt-8 z-10">
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
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
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="w-64 h-64 md:w-80 md:h-80 relative mb-10">
              <img 
                src={STEPS[step].img} 
                alt={STEPS[step].title} 
                className="w-full h-full object-contain"
              />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {STEPS[step].title}
            </h1>
            <p className="text-lg text-muted-foreground font-medium px-4 max-w-xs leading-relaxed">
              {STEPS[step].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full pb-10 z-10">
        <button 
          onClick={nextStep}
          disabled={completeOnboarding.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
        >
          {completeOnboarding.isPending
            ? "Getting ready…"
            : step === STEPS.length - 1 ? "Start My Daymark" : "Continue"}
          {step < STEPS.length - 1 && !completeOnboarding.isPending && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
