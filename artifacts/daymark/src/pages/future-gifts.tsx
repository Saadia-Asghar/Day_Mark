import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListFutureGifts } from "@workspace/api-client-react";
import { Plus } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { SealedGiftCard } from "@/components/scrapbook";
import { DaymarkCharacter } from "@/components/daymark-character";

export default function FutureGiftsPage() {
  const { data: gifts, isLoading, isError, refetch } = useListFutureGifts();

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32">

      {/* Header */}
      <header className="px-5 pt-12 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">Gifts for Later</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Messages and memories waiting for the right day.
          </p>
        </div>
        <Link href="/future-gifts/new">
          <button
            className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95"
            aria-label="Create future gift"
          >
            <Plus className="w-5 h-5" />
          </button>
        </Link>
      </header>

      {isError ? (
        <div className="px-5">
          <DmErrorState message="We couldn't open your future gifts." onRetry={refetch} />
        </div>
      ) : isLoading ? (
        <div className="px-5 space-y-4 mt-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-muted/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : gifts && gifts.length > 0 ? (
        <div className="px-5 space-y-5 mt-2">
          {gifts.map((gift, i) => {
            const unlockDate = new Date(gift.unlockDate);
            const isReady = isPast(unlockDate) || !gift.isLocked;
            const daysLeft = Math.max(0, differenceInDays(unlockDate, new Date()));
            const isUnlockingSoon = !isReady && daysLeft <= 7;

            return (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <SealedGiftCard
                  title={gift.title}
                  recipientName={gift.recipientName}
                  unlockDate={format(unlockDate, "MMMM d, yyyy")}
                  daysLeft={daysLeft}
                  isReady={isReady}
                  isUnlockingSoon={isUnlockingSoon}
                  id={gift.id}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 mt-16 flex flex-col items-center text-center">
          <DaymarkCharacter character="marky" pose="holdingGift" size="lg" animation="float" className="mb-5" />
          <h2 className="text-xl font-bold mb-1">Some moments are meant to arrive later.</h2>
          <p className="text-sm text-muted-foreground mb-7 max-w-xs">
            Seal a memory, a letter, or a photo — and choose when it opens.
          </p>
          <Link href="/future-gifts/new">
            <button className="bg-primary text-white px-8 py-3.5 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center gap-2 active:scale-95 transition-all">
              <Plus className="w-5 h-5" /> Create a Future Gift
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
