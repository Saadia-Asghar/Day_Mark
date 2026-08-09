import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListFutureGifts } from "@workspace/api-client-react";
import { Plus, Gift, Lock, Unlock, ArrowRight } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import markyEmpty from "@assets/generated_images/marky_empty.png";

function CSSGiftPreview() {
  return (
    <div className="w-12 h-12 relative scale-75">
      <div className="absolute bottom-0 left-0 right-0 h-8 rounded-lg bg-primary" />
      <div className="absolute top-2 left-[-2px] right-[-2px] h-3 rounded-lg bg-primary brightness-90" />
      <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-2 bg-white/50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5">
        <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
      </div>
    </div>
  );
}

export default function FutureGiftsPage() {
  const { data: gifts, isLoading, isError, refetch } = useListFutureGifts();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans p-5 pb-32">
      <header className="pt-8 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">A Gift for Later</h1>
          <p className="text-muted-foreground font-medium mt-1">Sealed with love.</p>
        </div>
        <Link href="/future-gifts/new">
          <button className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(104,71,245,0.3)]">
            <Plus className="w-5 h-5" />
          </button>
        </Link>
      </header>

      {isError ? (
         <DmErrorState message="Couldn't load your future gifts." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4 mt-6">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-muted rounded-3xl animate-pulse"></div>
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
                  <div className="absolute inset-0 bg-[#EAE3FF]/30 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-3xl pointer-events-none"></div>
                )}
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {unlocked ? <CSSGiftPreview /> : <Lock className="w-5 h-5 opacity-50" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{gift.title}</h3>
                      <p className="text-sm font-medium text-muted-foreground">For: {gift.recipientName}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  </div>
                </div>
                
                <div className="bg-background rounded-2xl p-4 mt-2 flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      {unlocked ? "Ready to open!" : `Opens in ${differenceInDays(new Date(gift.unlockDate), new Date())} days`}
                    </span>
                    <span className="font-bold text-foreground">{format(new Date(gift.unlockDate), "MMMM d, yyyy")}</span>
                  </div>
                  {unlocked && (
                    <Link href={`/gifts/${gift.id}`}>
                      <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary border border-border">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <img src={markyEmpty} alt="Empty box" className="w-48 h-48 object-contain mb-6 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">No sealed gifts yet.</h2>
          <p className="text-muted-foreground font-medium mb-8 max-w-xs">Create one for someone special.</p>
          <Link href="/future-gifts/new">
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Create Future Gift
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
