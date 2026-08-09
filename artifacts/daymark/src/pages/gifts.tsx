import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListMemories } from "@workspace/api-client-react";
import { Search, List, Grid as GridIcon, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { DmMemoryCard, DmErrorState } from "@/components/daymark";
import markyEmpty from "@assets/generated_images/marky_empty.png";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Friends", value: "friends" },
  { label: "Family", value: "family" },
  { label: "Travel", value: "travel" },
  { label: "Achievements", value: "achievements" },
  { label: "Everyday", value: "everyday" },
];

export default function GiftsPage() {
  const { data: memories, isLoading, isError, refetch } = useListMemories();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "timeline">("grid");

  const filteredMemories = memories?.filter(m => {
    const matchesFilter = filter === "all" || m.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans w-full max-w-[500px] mx-auto overflow-hidden flex flex-col">
      <header className="pt-10 pb-4 px-5 shrink-0 bg-background/90 backdrop-blur-md z-10 sticky top-0 border-b border-border/50">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-[28px] font-bold text-foreground">My Gifts 🎁</h1>
          <button 
            onClick={() => setView(view === "grid" ? "timeline" : "grid")}
            className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground shadow-sm hover:bg-muted transition-colors"
            aria-label="Toggle View"
          >
            {view === "grid" ? <List className="w-5 h-5" /> : <GridIcon className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-sm font-semibold text-muted-foreground mb-4">All the little things worth keeping.</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search memories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`snap-start px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shadow-sm ${
                filter === f.value 
                  ? "bg-foreground text-background border-foreground" 
                  : "bg-white text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {isError ? (
          <DmErrorState message="Couldn't load your gifts." onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-muted rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center mt-12">
            <img src={markyEmpty} alt="Empty box" className="w-48 h-48 object-contain mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-1">No gifts found</h2>
            <p className="text-sm text-muted-foreground font-semibold mb-6">Wrap a memory to fill this space.</p>
            <Link href="/wrap" className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] text-sm">
              Wrap a Memory
            </Link>
          </div>
        ) : view === "grid" ? (
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
        ) : (
          <div className="space-y-4">
            {filteredMemories.map((memory, i) => (
              <Link key={memory.id} href={`/gifts/${memory.id}`} className="block outline-none">
                 <motion.div 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.05 }}
                   whileTap={{ scale: 0.98 }}
                   className="bg-white rounded-2xl border border-border shadow-sm flex items-center relative overflow-hidden"
                 >
                   <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: memory.giftColor }} />
                   
                   {memory.photoUrls?.[0] && (
                     <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 ml-4 my-3">
                       <img src={memory.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                     </div>
                   )}
                   
                   <div className={`py-4 pr-4 flex-1 ${memory.photoUrls?.[0] ? 'ml-3' : 'ml-5'}`}>
                     <div className="flex items-center justify-between mb-1">
                       <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{memory.category}</span>
                       <span className="text-xs font-semibold text-muted-foreground">{format(new Date(memory.date), "MMM d, yyyy")}</span>
                     </div>
                     <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-1">{memory.title}</h3>
                   </div>
                   
                   <div className="pr-4 shrink-0 text-muted-foreground">
                     <ChevronRight className="w-5 h-5" />
                   </div>
                 </motion.div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
