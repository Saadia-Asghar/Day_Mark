import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListMemories } from "@workspace/api-client-react";
import type { Memory } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { DaymarkCharacter } from "@/components/daymark-character";

// ── Category visual config ─────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  tag: string; tagText: string; accent: string; accentText: string; emoji: string; rotate: string;
}> = {
  friends:      { tag: "bg-pink-100",   tagText: "text-pink-700",   accent: "#FF719D", accentText: "#fff", emoji: "👯‍♀️", rotate: "rotate-[-0.8deg]" },
  family:       { tag: "bg-amber-100",  tagText: "text-amber-700",  accent: "#FFC857", accentText: "#333", emoji: "🏡", rotate: "rotate-[0.6deg]" },
  travel:       { tag: "bg-sky-100",    tagText: "text-sky-700",    accent: "#75C8FF", accentText: "#fff", emoji: "✈️", rotate: "rotate-[-0.5deg]" },
  achievements: { tag: "bg-violet-100", tagText: "text-violet-700", accent: "#6847F5", accentText: "#fff", emoji: "⭐", rotate: "rotate-[0.8deg]" },
  college:      { tag: "bg-indigo-100", tagText: "text-indigo-700", accent: "#6366F1", accentText: "#fff", emoji: "🎓", rotate: "rotate-[-0.6deg]" },
  everyday:     { tag: "bg-emerald-100",tagText: "text-emerald-700",accent: "#9CE2B1", accentText: "#333", emoji: "🌿", rotate: "rotate-[0.4deg]" },
};
const getCfg = (cat: string) => CATEGORY_CONFIG[cat.toLowerCase()] ?? CATEGORY_CONFIG["everyday"];

// ── Tape strip decoration ─────────────────────────────────────────────
const Tape = ({ angle = -3, side = "left" }: { angle?: number; side?: "left" | "right" | "center" }) => (
  <div
    className="absolute -top-2.5 z-20 w-10 h-[15px] rounded-[3px]"
    style={{
      background: "rgba(253,241,200,0.88)",
      border: "1px solid rgba(210,170,50,0.2)",
      transform: `rotate(${angle}deg)`,
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      left: side === "left" ? "16px" : side === "right" ? undefined : "50%",
      right: side === "right" ? "16px" : undefined,
      marginLeft: side === "center" ? "-20px" : undefined,
    }}
  />
);

// ── Memory card components ─────────────────────────────────────────────
interface CardProps {
  memory: Memory;
  index: number;
}

// Large hero card (full-width Polaroid-ish)
const LargeCard = ({ memory, index }: CardProps) => {
  const cfg = getCfg(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative col-span-2 ${cfg.rotate}`}
    >
      <Tape angle={-4} side="left" />
      <Link href={`/gifts/${memory.id}`} className="block outline-none">
        <div className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden" style={{ borderRadius: 8 }}>
          {/* Photo or gradient */}
          <div className="relative" style={{ aspectRatio: "16/9" }}>
            {memory.photoUrls?.[0] ? (
              <img src={memory.photoUrls[0]} alt={memory.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-end p-4"
                style={{ background: `linear-gradient(135deg, ${memory.giftColor}dd 0%, ${memory.giftColor}88 100%)` }}
              >
                <span className="text-white font-bold text-2xl drop-shadow leading-tight">{memory.title}</span>
              </div>
            )}
            {/* Gradient overlay for text */}
            {memory.photoUrls?.[0] && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            )}
            {/* Category emoji badge */}
            <div className={`absolute top-3 left-3 ${cfg.tag} ${cfg.tagText} text-[10px] font-bold px-2.5 py-1 rounded-full`}>
              {cfg.emoji} {memory.category}
            </div>
            {memory.isKeptClose && (
              <div className="absolute top-3 right-3 text-base">❤️</div>
            )}
            {memory.photoUrls?.[0] && (
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-bold text-lg leading-snug drop-shadow line-clamp-2">{memory.title}</h3>
                <p className="text-white/70 text-xs mt-0.5 font-mono">{format(new Date(memory.date), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>
          {/* Polaroid bottom if no photo */}
          {!memory.photoUrls?.[0] && (
            <div className="px-3 pb-3 pt-1.5">
              <p className="text-xs text-muted-foreground font-mono">{format(new Date(memory.date), "MMM d, yyyy")}</p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

// Small card (half-width)
const SmallCard = ({ memory, index }: CardProps) => {
  const cfg = getCfg(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative col-span-1 ${cfg.rotate}`}
    >
      <Link href={`/gifts/${memory.id}`} className="block outline-none">
        <div
          className="bg-white shadow-sm overflow-hidden border border-white/80"
          style={{ borderRadius: 8, aspectRatio: "3/4" }}
        >
          {memory.photoUrls?.[0] ? (
            <div className="relative w-full h-full">
              <img src={memory.photoUrls[0]} alt={memory.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <h4 className="text-white font-bold text-[11px] leading-tight line-clamp-2 drop-shadow">{memory.title}</h4>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full flex flex-col justify-end p-2.5"
              style={{ background: `linear-gradient(135deg, ${memory.giftColor}ee 0%, ${memory.giftColor}99 100%)` }}
            >
              <span className="text-white font-bold text-xs leading-tight line-clamp-3 drop-shadow">{memory.title}</span>
              <span className="text-white/70 text-[10px] mt-1 font-mono">{format(new Date(memory.date), "MMM d")}</span>
            </div>
          )}
          {/* Gift ribbon accent at top */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: memory.giftColor + "cc" }} />
        </div>
      </Link>
    </motion.div>
  );
};

// Featured card (full-width with more info)
const FeaturedCard = ({ memory, index }: CardProps) => {
  const cfg = getCfg(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative col-span-2 ${cfg.rotate}`}
    >
      <Tape angle={3} side="right" />
      <Link href={`/gifts/${memory.id}`} className="block outline-none">
        <div className="bg-white shadow-md border border-white overflow-hidden flex" style={{ borderRadius: 10 }}>
          {/* Left colored accent strip */}
          <div className="w-1.5 shrink-0" style={{ backgroundColor: memory.giftColor }} />
          {/* Photo */}
          {memory.photoUrls?.[0] && (
            <div className="w-20 h-20 shrink-0">
              <img src={memory.photoUrls[0]} alt={memory.title} className="w-full h-full object-cover" />
            </div>
          )}
          {/* Text content */}
          <div className={`flex-1 p-3 ${!memory.photoUrls?.[0] ? "pl-4" : ""}`}>
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.tagText}`}>
                {cfg.emoji} {memory.category}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                {format(new Date(memory.date), "MMM d")}
              </span>
            </div>
            <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{memory.title}</h3>
            {memory.story && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic" style={{ fontFamily: "cursive" }}>
                "{memory.story}"
              </p>
            )}
            {/* People chips */}
            {memory.people && memory.people.length > 0 && (
              <div className="flex -space-x-1.5 mt-2">
                {memory.people.slice(0, 4).map((p, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white bg-[#EAE3FF] flex items-center justify-center overflow-hidden">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] font-bold text-primary">{p.name.charAt(0)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {memory.isKeptClose && (
            <div className="px-3 flex items-center text-rose-400">❤️</div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

// ── Scrapbook grid layout ──────────────────────────────────────────────
const ScrapbookGrid = ({ memories }: { memories: Memory[] }) => {
  const rows: React.ReactNode[] = [];
  let i = 0;

  const patterns = [
    // Pattern A: 1 large + 2 small
    (idx: number) => {
      const items = memories.slice(idx, idx + 3);
      if (items.length === 0) return { node: null, consumed: 0 };
      if (items.length === 1) return { node: <LargeCard key={items[0].id} memory={items[0]} index={idx} />, consumed: 1 };
      if (items.length === 2) return {
        node: (
          <>
            <LargeCard key={items[0].id} memory={items[0]} index={idx} />
            <SmallCard key={items[1].id} memory={items[1]} index={idx + 1} />
            <SmallCard key={items[1].id + "_empty"} memory={items[1]} index={idx + 1} />
          </>
        ),
        consumed: 2,
      };
      return {
        node: (
          <>
            <LargeCard key={items[0].id} memory={items[0]} index={idx} />
            <SmallCard key={items[1].id} memory={items[1]} index={idx + 1} />
            <SmallCard key={items[2].id} memory={items[2]} index={idx + 2} />
          </>
        ),
        consumed: 3,
      };
    },
    // Pattern B: featured (full row)
    (idx: number) => {
      const item = memories[idx];
      if (!item) return { node: null, consumed: 0 };
      return {
        node: <FeaturedCard key={item.id} memory={item} index={idx} />,
        consumed: 1,
      };
    },
    // Pattern C: 2 small + 1 large
    (idx: number) => {
      const items = memories.slice(idx, idx + 3);
      if (items.length === 0) return { node: null, consumed: 0 };
      if (items.length === 1) return { node: <LargeCard key={items[0].id} memory={items[0]} index={idx} />, consumed: 1 };
      if (items.length === 2) return {
        node: (
          <>
            <SmallCard key={items[0].id} memory={items[0]} index={idx} />
            <LargeCard key={items[1].id} memory={items[1]} index={idx + 1} />
          </>
        ),
        consumed: 2,
      };
      return {
        node: (
          <>
            <SmallCard key={items[0].id} memory={items[0]} index={idx} />
            <SmallCard key={items[1].id} memory={items[1]} index={idx + 1} />
            <LargeCard key={items[2].id} memory={items[2]} index={idx + 2} />
          </>
        ),
        consumed: 3,
      };
    },
  ];

  const sequence = [0, 2, 1, 0, 2, 1]; // A, C, B, A, C, B, ...
  let patternIdx = 0;

  while (i < memories.length) {
    const patternFn = patterns[sequence[patternIdx % sequence.length]];
    const { node, consumed } = patternFn(i);
    if (consumed === 0) break;
    if (node) {
      rows.push(
        <div key={`row-${i}`} className="contents">
          {node}
        </div>
      );
    }
    i += consumed;
    patternIdx++;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {rows}
    </div>
  );
};

// ── Filters ────────────────────────────────────────────────────────────
const FILTERS = [
  { label: "All 🎁", value: "all" },
  { label: "Friends 👯‍♀️", value: "friends" },
  { label: "Family 🏡", value: "family" },
  { label: "Travel ✈️", value: "travel" },
  { label: "College 🎓", value: "college" },
  { label: "Achievements ⭐", value: "achievements" },
  { label: "Everyday 🌿", value: "everyday" },
];

// ── Page ───────────────────────────────────────────────────────────────
export default function GiftsPage() {
  const { data: memories, isLoading, isError, refetch } = useListMemories();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = memories?.filter((m) => {
    const matchFilter = filter === "all" || m.category.toLowerCase() === filter.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }) ?? [];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans w-full flex flex-col overflow-hidden">
      {/* Sticky header */}
      <header className="pt-10 pb-4 px-5 shrink-0 bg-[#FFF9F5]/95 backdrop-blur-md z-10 sticky top-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">My Gifts 🎁</h1>
          <span className="text-xs font-bold text-muted-foreground">{filtered.length} memories</span>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-4">All the little things worth keeping.</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-border rounded-full pl-10 pr-4 py-2.5 text-sm font-medium shadow-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`snap-start shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                filter === f.value
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-32">
        {isError ? (
          <DmErrorState message="Couldn't load your gifts." onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`bg-muted rounded-xl animate-pulse ${i % 3 === 1 ? "col-span-2" : "col-span-1"}`}
                style={{ aspectRatio: i % 3 === 1 ? "16/9" : "3/4" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-16 px-4">
            <DaymarkCharacter character="marky" pose="holdingGift" size="lg" animation="float" className="mb-4" />
            <h2 className="text-xl font-bold mb-1.5">No gifts here yet</h2>
            <p className="text-sm text-muted-foreground font-medium mb-6">
              {search || filter !== "all"
                ? "Try a different filter or search term."
                : "Wrap a memory to start filling this space."}
            </p>
            {!search && filter === "all" && (
              <Link
                href="/wrap"
                className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] text-sm"
              >
                Wrap a Memory 🎁
              </Link>
            )}
          </div>
        ) : (
          <ScrapbookGrid memories={filtered} />
        )}
      </main>
    </div>
  );
}
