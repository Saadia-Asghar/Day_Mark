import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Heart, Gift, Star, Calendar, ArrowRight } from "lucide-react";
import heroImg from "@assets/generated_images/hero.png";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans overflow-x-hidden w-full relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-5 md:px-12 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
              D
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">Daymark</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="text-sm font-bold text-muted-foreground hover:text-foreground hidden md:block">How it works</a>
            <a href="#features" className="text-sm font-bold text-muted-foreground hover:text-foreground hidden md:block">Features</a>
            <Link href="/onboarding" className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] hover:scale-105 transition-transform active:scale-95">
              Start
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 md:pt-48 md:pb-32 px-5 md:px-12 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-24 min-h-[90vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 space-y-8 flex flex-col"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-destructive font-bold text-sm w-max">
            <Sparkles className="w-4 h-4" />
            <span>Memory = Gift</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] text-foreground tracking-tight">
            Keep the little gifts <br />
            <span className="text-primary italic">life gives you.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground font-semibold leading-relaxed max-w-lg">
            Save the moments, people and places that make life yours. Daymark wraps them into beautiful memories you can open again someday.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link href="/onboarding" className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center justify-center gap-2 hover:scale-105 transition-transform active:scale-95 group">
              Start Your Daymark
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-full text-lg font-bold text-foreground bg-white border-2 border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
              See how it works
            </a>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[600px] rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border-8 border-white bg-[#EAE3FF]/50 mt-8 md:mt-0"
        >
          <img src={heroImg} alt="Marky the gift box opening memories" className="w-full h-full object-cover object-center" />
          
          {/* Floating decorative elements */}
          <motion.div 
            animate={{ y: [0, -15, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 -left-6 bg-white p-3 rounded-[20px] shadow-xl flex gap-3 items-center border border-border"
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-destructive">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">NEW MEMORY</p>
              <p className="text-sm font-bold">Coffee with Sarah</p>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 20, 0] }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 -right-4 bg-white p-3 rounded-[20px] shadow-xl border border-border"
          >
            <div className="flex gap-2 items-center mb-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Achievement</span>
            </div>
            <div className="w-32 h-20 rounded-xl bg-[#EAE3FF] overflow-hidden relative">
              <div className="absolute inset-0 bg-primary/10"></div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Sections */}
      <section id="how-it-works" className="py-24 bg-white relative border-y border-border">
        <div className="max-w-4xl mx-auto px-5 text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Every moment is a gift waiting to be opened.</h2>
          <p className="text-lg text-muted-foreground font-semibold max-w-2xl mx-auto">
            Most apps treat your memories like data in a database. We treat them like treasures. Here's how it works.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Gift,
              color: "bg-blue-100 text-blue-600",
              title: "1. Wrap the moment",
              desc: "Add a photo, voice note, or just a few words. Pick a ribbon and wrap it up."
            },
            {
              icon: Calendar,
              color: "bg-accent/20 text-destructive",
              title: "2. Let time pass",
              desc: "Store it away. Daymark keeps it safe, letting the memory age like fine wine."
            },
            {
              icon: Sparkles,
              color: "bg-primary/20 text-primary",
              title: "3. Open the gift",
              desc: "Rediscover your moments with a beautiful unpacking experience that brings the joy back."
            }
          ].map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.2 }}
              className="bg-background p-8 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mb-6 ${step.color}`}>
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-semibold">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Future Gifts Feature */}
      <section className="py-32 px-5 bg-[#EAE3FF]/30 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 w-full max-w-md mx-auto">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl relative rotate-[-2deg] border border-border">
              <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold rotate-[10deg] shadow-lg tracking-wide uppercase">
                Opens Dec 25, 2026
              </div>
              <div className="aspect-square bg-muted rounded-[20px] mb-6 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-primary/20">
                <Gift className="w-16 h-16 text-primary mb-4" />
                <h4 className="font-bold text-2xl tracking-tight">A Gift for Later</h4>
                <p className="text-sm text-muted-foreground font-semibold mt-2">Locked until the right time.</p>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded-full w-3/4"></div>
                <div className="h-3 bg-muted rounded-full w-1/2"></div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Send a gift to the future.</h2>
            <p className="text-xl text-muted-foreground font-semibold leading-relaxed">
              Write a letter to your future self, or seal a memory to open on your next anniversary. Daymark's <strong className="text-foreground">Future Gifts</strong> let you lock moments away until the perfect time.
            </p>
            <ul className="space-y-4 pt-4">
              {["Time-locked surprises", "Messages to friends", "Capsules for yourself"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-lg text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-5 bg-primary text-primary-foreground text-center relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto relative z-10"
        >
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">Ready to start keeping?</h2>
          <p className="text-xl text-white/90 mb-10 font-semibold leading-relaxed">
            Join thousands of people who are treating their memories like the gifts they really are.
          </p>
          <Link href="/onboarding" className="inline-block bg-white text-primary px-10 py-5 rounded-full text-xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-transform">
            Open Daymark Now
          </Link>
        </motion.div>
        
        {/* Background shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-5 border-t border-border bg-white text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">
            D
          </div>
          <span className="font-bold text-lg">Daymark</span>
        </div>
        <p className="text-muted-foreground font-semibold text-sm">
          Keep the little gifts life gives you. <br/> Built for the Designathon.
        </p>
      </footer>
    </div>
  );
}
