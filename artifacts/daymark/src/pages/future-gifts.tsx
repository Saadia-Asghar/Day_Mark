import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListFutureGifts } from "@workspace/api-client-react";
import { Plus, Gift, Lock, Unlock, ArrowRight } from "lucide-react";
import { format, isPast } from "date-fns";

export default function FutureGiftsPage() {
  const { data: gifts, isLoading } = useListFutureGifts();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 pb-32">
      <header className="pt-8 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">A Gift for Later</h1>
          <p className="text-muted-foreground font-medium mt-1">Moments locked in time.</p>
        </div>
        <Link href="/future-gifts/new">
          <button className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md shadow-primary/30">
            <Plus className="w-5 h-5" />
          </button>
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-4 mt-6">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : gifts && gifts.length > 0 ? (
        <div className="space-y-6 mt-6">
          {gifts.map((gift, i) => {
            const unlocked = isPast(new Date(gift.unlockDate)) || !gift.isLocked;
            
            return (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden ${unlocked ? 'border-primary shadow-md cursor-pointer hover:scale-[1.01] transition-transform' : 'opacity-90'}`}
              >
                {!unlocked && (
                  <div className="absolute inset-0 bg-lavender/30 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-3xl pointer-events-none"></div>
                )}
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{gift.title}</h3>
                      <p className="text-sm font-medium text-muted-foreground">For: {gift.recipientName}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${unlocked ? 'bg-accent/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                    {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {unlocked ? "Open" : "Locked"}
                  </div>
                </div>
                
                <div className="bg-background rounded-2xl p-4 mt-2 flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Unlocks on</span>
                    <span className="font-bold text-foreground">{format(new Date(gift.unlockDate), "MMMM d, yyyy")}</span>
                  </div>
                  {unlocked && (
                    <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary border border-border">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="w-32 h-32 bg-lavender rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-border rotate-[-5deg]">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">No future gifts</h2>
          <p className="text-muted-foreground font-medium mb-8 max-w-xs">Write a letter to your future self, or seal a memory to open on your anniversary.</p>
          <Link href="/future-gifts/new">
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Create a Future Gift
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
