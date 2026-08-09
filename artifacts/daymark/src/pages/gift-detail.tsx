import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMemory, useKeepMemoryClose, useListMemories } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Heart, MapPin, Calendar, Share, Loader2 } from "lucide-react";
import { DmCategoryTag, DmMoodChip, DmErrorState, DmMemoryCard } from "@/components/daymark";

export default function GiftDetailPage() {
  const [, params] = useRoute("/gifts/:id");
  const id = Number(params?.id);
  
  const { data: memory, isLoading, isError, refetch } = useGetMemory(id, { 
    query: { enabled: !!id } 
  });
  
  // Client-side approx related memories
  const { data: allMemories } = useListMemories({ category: memory?.category }, {
    query: { enabled: !!memory?.category }
  });
  
  const keepClose = useKeepMemoryClose();
  
  const [isOpened, setIsOpened] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Trigger content reveal after box opens
  useEffect(() => {
    if (isOpened) {
      const timer = setTimeout(() => setShowContent(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isOpened]);

  // Handle timeout for slow loading
  const [showTimeout, setShowTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowTimeout(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (isError || (isLoading && showTimeout)) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col max-w-[500px] mx-auto pt-20">
         <Link href="/gifts" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <DmErrorState message="Couldn't open this memory." onRetry={refetch} />
      </div>
    );
  }

  if (isLoading || !memory) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center max-w-[500px] mx-auto">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleKeepClose = () => {
    keepClose.mutate({ id });
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memory.title,
          text: memory.story || `A memory from ${format(new Date(memory.date), "MMM d, yyyy")}`,
          url: window.location.href,
        });
      } catch (e) {
        // ignore cancellation
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const getMoodEmoji = (mood?: string | null) => {
    if (!mood) return "✨";
    const mapping: Record<string, string> = {
      "Happy": "☀️", "Emotional": "🥹", "Peaceful": "🌿", 
      "Chaotic": "😂", "Proud": "✨", "Grateful": "💜", "Nostalgic": "🌙"
    };
    return mapping[mood] || "✨";
  };

  const relatedMemories = (allMemories || [])
    .filter(m => m.id !== id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return (
    <div className="min-h-[100dvh] max-w-[500px] mx-auto bg-background text-foreground font-sans relative overflow-x-hidden">
      
      {/* Back Button - always visible */}
      <Link href="/gifts" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors active:scale-95">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </Link>

      <AnimatePresence>
        {!showContent && (
          <motion.div 
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={isOpened ? { scale: 1.1, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              className="w-[200px] h-[220px] cursor-pointer relative"
              onClick={() => setIsOpened(true)}
            >
              {/* The Box Body */}
              <div 
                className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: memory.giftColor }}
              >
                {/* Ribbon horizontal & vertical */}
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

              {/* The Box Lid (animates up) */}
              <motion.div
                animate={isOpened ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 h-1/3 rounded-t-3xl border-b-[6px] border-black/10 z-10"
                style={{ backgroundColor: memory.giftColor }}
              >
                <div className="absolute w-10 h-full bg-white/40 left-1/2 -translate-x-1/2 mix-blend-overlay" />
                {/* Bow */}
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

      {/* Content */}
      <div className={`transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        
        {/* Hero Area */}
        <div className="relative w-full aspect-[16/9] rounded-b-[2rem] overflow-hidden bg-muted shadow-sm">
          {memory.photoUrls && memory.photoUrls.length > 0 ? (
            <img src={memory.photoUrls[0]} alt="Memory" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--gcolor)] to-black/40 flex items-center justify-center p-8 text-center" style={{ '--gcolor': memory.giftColor } as any}>
              <h2 className="text-3xl font-bold text-white drop-shadow-md">{memory.title}</h2>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute bottom-4 left-4">
            <span className="bg-white text-foreground text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm">
              {format(new Date(memory.date), "MMM d, yyyy")}
            </span>
          </div>
          
          <div className="absolute top-safe mt-6 right-4 flex gap-2">
            <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-white transition-colors shadow-sm">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Details Area */}
        <div className="px-5 pt-6 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <DmCategoryTag category={memory.category} color={memory.giftColor} />
            {memory.mood && (
              <span className="text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5">
                {getMoodEmoji(memory.mood)} {memory.mood}
              </span>
            )}
          </div>

          {memory.photoUrls && memory.photoUrls.length > 0 && (
            <h1 className="text-[32px] font-bold leading-tight mb-4 text-foreground">{memory.title}</h1>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-muted-foreground mb-8">
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(memory.date), "EEEE")}</div>
            {memory.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {memory.location}</div>}
          </div>

          {memory.people && memory.people.length > 0 && (
            <div className="mb-8 border-t border-border pt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Shared With</h3>
              <div className="flex flex-wrap gap-4">
                {memory.people.map(person => (
                  <div key={person.id} className="flex items-center gap-3 bg-white border border-border rounded-full py-1.5 pr-4 pl-1.5 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-[#EAE3FF] border border-white overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary">{person.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold">{person.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memory.story && (
            <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm mb-10 relative">
              <div className="absolute -top-4 -left-2 text-[48px] text-primary/20 font-serif leading-none opacity-50 select-none pointer-events-none">"</div>
              <p className="text-base font-semibold leading-relaxed text-foreground relative z-10 whitespace-pre-wrap">
                {memory.story}
              </p>
            </div>
          )}

          <button 
            onClick={handleKeepClose}
            disabled={keepClose.isPending}
            className={`w-full py-4 rounded-full text-base font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${
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
          
          {/* Related Memories */}
          {relatedMemories.length > 0 && (
             <div className="mt-12">
               <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">More memories like this</h3>
               <div className="grid grid-cols-2 gap-4">
                 {relatedMemories.map(m => (
                    <Link key={m.id} href={`/gifts/${m.id}`} className="outline-none">
                      <DmMemoryCard 
                        title={m.title}
                        date={format(new Date(m.date), "MMM d")}
                        category={m.category}
                        giftColor={m.giftColor}
                        photoUrl={m.photoUrls?.[0]}
                      />
                    </Link>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
