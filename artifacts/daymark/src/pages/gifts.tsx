import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListMemories } from "@workspace/api-client-react";
import { Gift, Calendar, LayoutGrid, List, Map, Settings2 } from "lucide-react";
import { format } from "date-fns";
import markyEmpty from "@assets/generated_images/marky_empty.png";

export default function GiftsPage() {
  const { data: memories, isLoading } = useListMemories();
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [filter, setFilter] = useState("all");

  const filteredMemories = memories?.filter(m => filter === "all" || m.category === filter) || [];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 pb-32">
      <header className="pt-8 pb-6 sticky top-0 bg-background/90 backdrop-blur-md z-20 -mx-6 px-6 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-serif font-bold text-foreground">My Gifts</h1>
          
          <div className="flex bg-lavender p-1 rounded-xl">
            <button 
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView("timeline")}
              className={`p-2 rounded-lg transition-colors ${view === "timeline" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {["all", "everyday", "travel", "friends", "family", "achievements"].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-colors ${
                filter === cat 
                  ? "bg-foreground text-background" 
                  : "bg-white border border-border text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-lavender rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <img src={markyEmpty} alt="Empty box" className="w-64 h-64 object-contain mb-6" />
          <h2 className="text-2xl font-serif font-bold mb-2">No gifts yet</h2>
          <p className="text-muted-foreground font-medium mb-8">Your first little gift is waiting.</p>
          <Link href="/wrap" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30">
            Wrap a Memory
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredMemories.map((memory, i) => (
                <Link key={memory.id} href={`/gifts/${memory.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded-3xl p-5 flex flex-col relative overflow-hidden group shadow-sm hover:shadow-md transition-all cursor-pointer"
                    style={{ backgroundColor: memory.giftColor }}
                  >
                    {/* Ribbon Graphic */}
                    <div className="absolute w-full h-6 bg-white/30 top-1/2 -translate-y-1/2 left-0 z-0"></div>
                    <div className="absolute w-6 h-full bg-white/30 left-1/2 -translate-x-1/2 top-0 z-0"></div>
                    
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
                      <Gift className="w-10 h-10 text-white/80 mb-2 drop-shadow-sm group-hover:scale-110 transition-transform" />
                      <h3 className="font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
                        {memory.title}
                      </h3>
                    </div>
                    
                    <div className="relative z-10 mt-auto text-center w-full">
                      <span className="text-xs font-bold bg-white/30 text-white px-3 py-1 rounded-full backdrop-blur-sm shadow-sm inline-block">
                        {format(new Date(memory.date), "MMM d")}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredMemories.map((memory, i) => (
                <Link key={memory.id} href={`/gifts/${memory.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-3xl p-4 border border-border shadow-sm flex items-center gap-4 hover:border-primary transition-colors"
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: memory.giftColor }}
                    >
                      <div className="absolute w-full h-2 bg-white/30 top-1/2 -translate-y-1/2"></div>
                      <div className="absolute w-2 h-full bg-white/30 left-1/2 -translate-x-1/2"></div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight mb-1">{memory.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(memory.date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
