import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMemory, useKeepMemoryClose, useListMemories } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Heart, MapPin, Calendar, Share, Loader2, Image as ImageIcon } from "lucide-react";
import { DmCategoryTag, DmErrorState } from "@/components/daymark";
import { TapeStrip, DateStamp, LocationStamp, GiftTag, MoodSticker, StoryLetter, RibbonDivider, OnThisDayCard } from "@/components/scrapbook";
import { useToast } from "@/hooks/use-toast";

export default function GiftDetailPage() {
  const [, params] = useRoute("/gifts/:id");
  const id = Number(params?.id);
  const { toast } = useToast();

  const { data: memory, isLoading, isError, refetch } = useGetMemory(id || 0);
  const { data: allMemories } = useListMemories(memory?.category ? { category: memory.category } : {});
  const keepClose = useKeepMemoryClose();

  const [isOpened, setIsOpened] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isOpened) return;
    const t = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(t);
  }, [isOpened]);

  const [showTimeout, setShowTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowTimeout(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (isError || (isLoading && showTimeout)) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col pt-20">
        <Link href="/gifts" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <DmErrorState message="We couldn't open this part of your Daymark." onRetry={refetch} />
      </div>
    );
  }

  if (isLoading || !memory) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleKeepClose = () => keepClose.mutate({ id });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memory.title,
          text: memory.story || `A memory from ${format(new Date(memory.date), "MMM d, yyyy")}`,
          url: window.location.href,
        });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied ✓", description: "Share it with someone special." });
      } catch {
        toast({ title: "Couldn't copy link", variant: "destructive" });
      }
    }
  };

  // Deterministic related-memory order seeded by memory id
  const relatedMemories = (allMemories || [])
    .filter((m) => m.id !== id)
    .sort((a, b) => ((a.id * 2654435761) % (id || 1)) - ((b.id * 2654435761) % (id || 1)))
    .slice(0, 3);

  const hasPhoto = !!memory.photoUrls?.length && !imgError;
  const dateStr = format(new Date(memory.date), "MMM d, yyyy");

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans relative overflow-x-hidden">

      {/* Back */}
      <Link href="/gifts" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center active:scale-95">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </Link>

      {/* ── Unwrap Gate ─────────────────────────────────────────── */}
      <AnimatePresence>
        {!showContent && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#FFF9F5]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={isOpened ? { scale: 1.1, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              className="w-[200px] h-[220px] cursor-pointer relative"
              onClick={() => setIsOpened(true)}
              role="button"
              aria-label="Tap to unwrap"
            >
              <div
                className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: memory.giftColor }}
              >
                <motion.div
                  className="absolute w-full h-10 bg-white/40 top-1/2 -translate-y-1/2 mix-blend-overlay"
                  animate={isOpened ? { height: 0, opacity: 0 } : { height: 40, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className="absolute w-10 h-full bg-white/40 left-1/2 -translate-x-1/2 mix-blend-overlay"
                  animate={isOpened ? { width: 0, opacity: 0 } : { width: 40, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <motion.div
                animate={isOpened ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 h-1/3 rounded-t-3xl border-b-[6px] border-black/10 z-10"
                style={{ backgroundColor: memory.giftColor }}
              >
                <div className="absolute w-10 h-full bg-white/40 left-1/2 -translate-x-1/2 mix-blend-overlay" />
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-white/60 shadow-sm mix-blend-overlay" />
                  <div className="w-10 h-10 rounded-full bg-white/60 shadow-sm mix-blend-overlay" />
                </div>
              </motion.div>
            </motion.div>
            {!isOpened && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-12 text-sm font-bold tracking-widest uppercase text-muted-foreground"
              >
                Tap to unwrap ✨
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className={`transition-opacity duration-1000 ${showContent ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>

        {/* Hero photo — Polaroid-style */}
        <div className="px-4 pt-16 pb-4">
          <div className="relative">
            <TapeStrip rotate={-4} className="-top-2 left-8" />
            <TapeStrip rotate={3} className="-top-2 right-8" />

            <div
              className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.14)]"
              style={{ transform: "rotate(-0.8deg)", borderRadius: 4 }}
            >
              {/* Photo */}
              <div className="p-2.5 pb-0">
                <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  {hasPhoto ? (
                    <>
                      <img
                        src={memory.photoUrls![0]}
                        alt={memory.title}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${memory.giftColor} 0%, ${memory.giftColor}99 100%)`,
                      }}
                    >
                      <ImageIcon className="w-8 h-8 text-white/60" />
                      <span className="text-white font-bold text-xl drop-shadow px-4 text-center">
                        {memory.title}
                      </span>
                    </div>
                  )}

                  {/* Overlays */}
                  <DateStamp date={dateStr} className="absolute top-3 right-3" />
                  {memory.location && (
                    <LocationStamp location={memory.location} className="absolute bottom-3 left-3" />
                  )}
                </div>
              </div>

              {/* Polaroid caption */}
              <div className="px-4 pt-3 pb-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-base leading-snug">{memory.title}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {format(new Date(memory.date), "EEEE, MMMM d")}
                  </p>
                </div>
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-white transition-colors active:scale-95"
                    aria-label="Share"
                  >
                    <Share className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-32">

          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap mt-2 mb-5">
            <GiftTag category={memory.category} />
            {memory.mood && <MoodSticker mood={memory.mood} />}
          </div>

          {/* People */}
          {memory.people && memory.people.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3">Shared With</p>
              <div className="flex flex-wrap gap-2">
                {memory.people.map((person) => (
                  <Link key={person.id} href={`/people/${person.id}`}>
                    <div className="flex items-center gap-2 bg-white border border-border rounded-full py-1.5 pr-4 pl-1.5 shadow-sm active:scale-95 transition-all">
                      <div className="w-7 h-7 rounded-full bg-[#EAE3FF] overflow-hidden flex items-center justify-center border border-white shadow-sm shrink-0">
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-[10px] font-bold text-primary">{person.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-sm font-bold">{person.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <RibbonDivider color={memory.giftColor} />

          {/* Story — folded letter */}
          {memory.story && (
            <div className="mb-6">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3">The Story</p>
              <StoryLetter story={memory.story} />
            </div>
          )}

          {/* Keep close */}
          <button
            onClick={handleKeepClose}
            disabled={keepClose.isPending}
            className={`w-full py-4 rounded-full text-base font-bold transition-all flex items-center justify-center gap-2 active:scale-95 mt-2 ${
              memory.isKeptClose
                ? "bg-accent text-white shadow-md shadow-accent/30 border-2 border-accent"
                : "bg-white text-foreground border-2 border-border hover:bg-muted"
            } disabled:opacity-70`}
          >
            {keepClose.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Heart className={`w-5 h-5 ${memory.isKeptClose ? "fill-white" : ""}`} />
            )}
            {memory.isKeptClose ? "Kept Close ♡" : "Keep this close ♡"}
          </button>

          {/* Related memories — scrapbook grid */}
          {relatedMemories.length > 0 && (
            <div className="mt-10">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-4">More like this</p>
              <div className="grid grid-cols-2 gap-4">
                {relatedMemories.map((m, i) => (
                  <OnThisDayCard
                    key={m.id}
                    id={m.id}
                    title={m.title}
                    date={format(new Date(m.date), "MMM d")}
                    giftColor={m.giftColor}
                    photoUrl={m.photoUrls?.[0]}
                    story={m.story}
                    rotate={i % 2 === 0 ? -1.5 : 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
