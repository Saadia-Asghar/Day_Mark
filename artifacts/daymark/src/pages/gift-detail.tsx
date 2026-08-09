import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMemory, useKeepMemoryClose } from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  ArrowLeft, Heart, MapPin, Calendar, Users, 
  MessageSquare, Mic, Play 
} from "lucide-react";

export default function GiftDetailPage() {
  const [, params] = useRoute("/gifts/:id");
  const id = Number(params?.id);
  
  const { data: memory, isLoading } = useGetMemory(id, { 
    query: { enabled: !!id } 
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

  if (isLoading || !memory) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
    </div>;
  }

  const handleKeepClose = () => {
    keepClose.mutate({ id });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden">
      
      {/* Back Button - always visible */}
      <Link href="/gifts" className="absolute top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </Link>

      <AnimatePresence>
        {!showContent && (
          <motion.div 
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={isOpened ? { scale: 1.5, opacity: 0, rotate: 10 } : { scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-64 h-64 cursor-pointer relative"
              onClick={() => setIsOpened(true)}
            >
              {/* Box Graphic */}
              <div 
                className="absolute inset-0 rounded-3xl shadow-2xl border-4 border-white/50 overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: memory.giftColor }}
              >
                <div className="absolute w-full h-8 bg-white/40 top-1/2 -translate-y-1/2"></div>
                <div className="absolute w-8 h-full bg-white/40 left-1/2 -translate-x-1/2"></div>
                
                {/* Ribbon Bow */}
                {!isOpened && (
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute z-10 w-20 h-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/60 shadow-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-foreground opacity-50">Tap</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
            
            {!isOpened && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 text-xl font-serif font-bold text-muted-foreground"
              >
                Tap to open
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Content */}
      <div className={`pt-24 px-6 pb-32 transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* Photo Header */}
        {memory.photoUrls && memory.photoUrls.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={showContent ? { y: 0, opacity: 1, scale: 1 } : {}}
            transition={{ type: "spring", bounce: 0.4 }}
            className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl mb-8 relative border-8 border-white bg-lavender"
          >
            <img src={memory.photoUrls[0]} alt="Memory" className="w-full h-full object-cover" />
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-2 mb-4">
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: memory.giftColor }}
            >
              {memory.category}
            </span>
          </div>

          <h1 className="text-4xl font-serif font-bold leading-tight mb-4">{memory.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground mb-8">
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(memory.date), "MMMM d, yyyy")}</div>
            {memory.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {memory.location}</div>}
          </div>
        </motion.div>

        {memory.story && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={showContent ? { y: 0, opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-3xl border border-border shadow-sm mb-8"
          >
            <MessageSquare className="w-6 h-6 text-primary mb-4 opacity-50" />
            <p className="text-lg leading-relaxed font-medium text-foreground">
              {memory.story}
            </p>
          </motion.div>
        )}

        {memory.people && memory.people.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={showContent ? { y: 0, opacity: 1 } : {}}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" /> Shared with
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {memory.people.map(person => (
                <div key={person.id} className="flex flex-col items-center gap-2 w-16 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-lavender border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xl text-primary">{person.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold truncate w-full text-center">{person.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-12 mb-8"
        >
          <button 
            onClick={handleKeepClose}
            className={`flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-md active:scale-95 ${
              memory.isKeptClose 
                ? "bg-accent text-accent-foreground shadow-accent/30" 
                : "bg-white text-foreground border border-border"
            }`}
          >
            <Heart className={`w-5 h-5 ${memory.isKeptClose ? "fill-current" : ""}`} />
            {memory.isKeptClose ? "Kept Close" : "Keep This Close ♡"}
          </button>
        </motion.div>

      </div>
    </div>
  );
}
