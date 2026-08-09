import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListMemories } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { DmMemoryCard } from "@/components/daymark";
import markyEmpty from "@assets/generated_images/marky_empty.png";

const FILTERS = ["All", "Friends", "Family", "Travel", "College", "Achievements", "Little Things"];

export default function GiftsPage() {
  const { data: memories, isLoading } = useListMemories();
  const [filter, setFilter] = useState("All");

  const filteredMemories = memories?.filter(m => 
    filter === "All" || m.category.toLowerCase() === filter.toLowerCase()
  ) || [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans w-full max-w-[500px] mx-auto overflow-hidden flex flex-col">
      <header className="pt-10 pb-4 px-5 shrink-0 bg-background/90 backdrop-blur-md z-10 sticky top-0 border-b border-border/50">
        <h1 className="text-[28px] font-bold text-foreground mb-1">My Gifts 🎁</h1>
        <p className="text-sm font-semibold text-muted-foreground mb-4">All the little things worth keeping.</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search memories..." 
            className="w-full bg-white border border-border rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`snap-start px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shadow-sm ${
                filter === f 
                  ? "bg-foreground text-background border-foreground" 
                  : "bg-white text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-lavender/50 rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center mt-12">
            <img src={markyEmpty} alt="Empty box" className="w-48 h-48 object-contain mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-1">No gifts found</h2>
            <p className="text-sm text-muted-foreground font-semibold mb-6">Wrap a memory to fill this space.</p>
            <Link href="/wrap" className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-glow text-sm">
              Wrap a Memory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredMemories.map((memory, i) => (
              <Link key={memory.id} href={`/gifts/${memory.id}`} className="outline-none block h-full">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="h-full"
                >
                  <DmMemoryCard 
                    title={memory.title}
                    date={format(new Date(memory.date), "MMM d, yyyy")}
                    category={memory.category}
                    giftColor={memory.giftColor}
                    photoUrl={memory.photoUrls?.[0]}
                    people={memory.people}
                    isKeptClose={memory.isKeptClose}
                  />
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}