import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Gift, ArrowRight, Heart, Star } from "lucide-react";
import heroImg from "@assets/generated_images/hero.png";
import { DaymarkCharacter } from "@/components/daymark-character";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans flex flex-col overflow-x-hidden">
      {/* Compact header — Daymark logo only, no nav links on mobile */}
      <header className="px-5 pt-8 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DaymarkCharacter character="marky" pose="idle" size="xs" animation="none" className="!w-8 !h-8" />
          <span className="font-bold text-lg text-foreground tracking-tight">Daymark</span>
        </div>
        {/* Memory = Gift pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAE3FF] text-primary font-bold text-xs">
          <Sparkles className="w-3 h-3" />
          <span>Memory = Gift</span>
        </div>
      </header>

      {/* Hero — mobile single column: headline → copy → buttons → image */}
      <main className="flex-1 flex flex-col px-5 pt-8">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="space-y-4"
        >
          <h1 className="text-[38px] leading-[1.1] font-extrabold tracking-tight text-foreground">
            Keep the little gifts{" "}
            <span className="text-primary italic">life gives you.</span>
          </h1>

          <p className="text-base text-muted-foreground font-semibold leading-relaxed">
            Save moments, people and places that make life yours. Daymark wraps them into beautiful memories you can open again someday.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/sign-up">
              <button className="w-full h-[52px] bg-primary text-white rounded-full text-base font-bold shadow-[0_0_24px_rgba(104,71,245,0.35)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.97] transition-all">
                Create your Daymark
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="w-full h-[52px] bg-white border-2 border-border rounded-full text-base font-bold text-foreground flex items-center justify-center hover:bg-muted active:scale-[0.97] transition-all">
                Sign in
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Hero illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mt-8 rounded-[28px] overflow-hidden border-4 border-white shadow-xl shadow-primary/10 bg-[#EAE3FF]/50 aspect-[4/3]"
        >
          <img
            src={heroImg}
            alt="Marky the gift box opening memories"
            className="w-full h-full object-cover object-center"
          />

          {/* Floating memory card */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-4 left-3 bg-white px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 border border-border"
          >
            <div className="w-7 h-7 rounded-full bg-[#FFE4EE] flex items-center justify-center text-pink-500">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">New Memory</p>
              <p className="text-xs font-bold leading-tight">Coffee with Sarah</p>
            </div>
          </motion.div>

          {/* Floating badge */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute bottom-4 right-3 bg-white px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 border border-border"
          >
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-xs font-bold">Achievement!</span>
          </motion.div>
        </motion.div>

        {/* Social proof micro-strip */}
        <div className="flex items-center justify-center gap-2 py-4 mt-2">
          <div className="flex -space-x-2">
            {["#6847F5", "#FF719D", "#FFC857", "#75C8FF"].map((c, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-white"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-semibold">
            Thousands of memories kept safe
          </p>
        </div>
      </main>

      {/* How it works */}
      <section id="how-it-works" className="px-5 py-10 border-t border-border/40 mt-4">
        <h2 className="text-2xl font-bold tracking-tight mb-6 text-center">Every moment is a gift.</h2>
        <div className="flex flex-col gap-4">
          {[
            { icon: Gift, color: "#6847F5", bg: "#EAE3FF", step: "1", title: "Wrap the moment", desc: "Add a photo, voice note, or just a few words. Pick a ribbon and seal it." },
            { icon: Sparkles, color: "#FF719D", bg: "#FFE4EE", step: "2", title: "Let time pass", desc: "Daymark keeps it safe, letting the memory age like fine wine." },
            { icon: Heart, color: "#FFC857", bg: "#FFF5D6", step: "3", title: "Open the gift", desc: "Rediscover your moments with a beautiful unwrapping experience." },
          ].map(({ icon: Icon, color, bg, step, title, desc }) => (
            <div key={step} className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color }}>Step {step}</p>
                <h3 className="font-bold text-sm mb-0.5">{title}</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-10 bg-primary">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to start keeping?</h2>
          <p className="text-sm text-white/80 font-semibold mb-6 leading-relaxed">
            Join thousands of people treating their memories like the gifts they really are.
          </p>
          <Link href="/sign-up">
            <button className="w-full h-[52px] bg-white text-primary rounded-full text-base font-bold shadow-lg hover:opacity-95 active:scale-[0.97] transition-all">
              Create your Daymark
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-border bg-[#FFF9F5] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">D</div>
          <span className="font-bold text-base">Daymark</span>
        </div>
        <p className="text-muted-foreground font-semibold text-xs">
          Keep the little gifts life gives you.
        </p>
      </footer>
    </div>
  );
}
