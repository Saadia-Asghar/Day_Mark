import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe2, MapPin, X, Flag } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface GlobeMemory {
  publicId: number;
  caption: string | null;
  photoUrl: string | null;
  category: string;
  locationLabel: string | null;
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  displayName: string;
  username: string | null;
  date: string | null;
  publishedAt: string | null;
}

// ── Category colours ───────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  everyday: "#6847F5",
  travel: "#0EA5E9",
  food: "#F97316",
  people: "#EC4899",
  nature: "#22C55E",
  celebration: "#EAB308",
  default: "#6847F5",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;
}

// ── Memory card ────────────────────────────────────────────────────────────

function MemoryCard({ memory, onClose, onReport }: { memory: GlobeMemory; onClose: () => void; onReport: (id: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-x-4 bottom-8 z-50 bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[380px] mx-auto"
    >
      {memory.photoUrl && (
        <div className="relative w-full h-48">
          <img src={memory.photoUrl} alt={memory.caption ?? ""} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      <div className="p-4">
        {memory.caption && (
          <p className="font-bold text-foreground text-base leading-snug">{memory.caption}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {memory.locationLabel && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {memory.locationLabel}
            </span>
          )}
          {memory.date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(memory.date), "MMM d, yyyy")}
            </span>
          )}
          <span className="text-xs font-semibold text-primary bg-[#EAE3FF] px-2 py-0.5 rounded-full capitalize">{memory.category}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground font-medium">
            {memory.displayName === "Anonymous" ? "Anonymous" : `@${memory.username ?? memory.displayName}`}
          </span>
          <div className="flex gap-2">
            <button onClick={() => onReport(memory.publicId)} className="text-xs text-muted-foreground flex items-center gap-1 active:scale-95">
              <Flag className="w-3 h-3" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Globe map (simplified SVG-based world map) ─────────────────────────────

function GlobePin({ memory, onClick }: { memory: GlobeMemory; onClick: () => void }) {
  if (memory.approximateLatitude == null || memory.approximateLongitude == null) return null;

  // Mercator projection (simplified)
  const x = ((memory.approximateLongitude + 180) / 360) * 100;
  const latRad = (memory.approximateLatitude * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 50 - (mercN / (2 * Math.PI)) * 100;

  const color = categoryColor(memory.category);

  return (
    <g transform={`translate(${x}%, ${y}%)`} style={{ cursor: "pointer" }} onClick={onClick}>
      <circle r="5" fill={color} opacity="0.2">
        <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r="4.5" fill={color} opacity="0.9" />
      <circle r="2" fill="white" />
    </g>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function GlobePage() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<GlobeMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GlobeMemory | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    setLoading(true);
    try {
      const res = await fetch("/api/globe/memories?limit=50", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function submitReport(memoryId: number) {
    if (!reportReason) return;
    try {
      await fetch(`/api/globe/memories/${memoryId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: reportReason }),
      });
      toast({ title: "Report submitted. Thank you." });
    } catch { /* silent */ }
    setReportId(null);
    setReportReason("");
  }

  // Split memories into those with and without coordinates
  const pinned = memories.filter((m) => m.approximateLatitude != null);
  const feed = memories.slice(0, 20);

  return (
    <div className="min-h-[100dvh] bg-[#0D0A1E] text-white font-sans overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0D0A1E]/90 backdrop-blur-md border-b border-white/10 px-5 pt-14 pb-4">
        <Link href="/home" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-extrabold">Memory Globe 🌍</h1>
          <p className="text-xs text-white/50 mt-0.5">Small moments from everywhere.</p>
        </div>
      </div>

      {/* Globe SVG */}
      <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden bg-[#1A1033] border border-white/10 shadow-2xl" style={{ height: 280 }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-[#6847F5]/30 border-t-[#6847F5] animate-spin" />
          </div>
        ) : (
          <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Ocean */}
            <rect width="100" height="60" fill="#0D0A1E" />

            {/* Simplified continent outlines */}
            {/* North America */}
            <path d="M8 12 L20 10 L24 15 L22 25 L18 30 L12 28 L8 22 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />
            {/* South America */}
            <path d="M18 30 L26 28 L28 38 L24 48 L18 46 L16 38 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />
            {/* Europe */}
            <path d="M44 10 L52 8 L54 15 L50 20 L44 18 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />
            {/* Africa */}
            <path d="M44 20 L54 18 L56 30 L52 42 L44 40 L42 30 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />
            {/* Asia */}
            <path d="M54 8 L82 6 L86 14 L84 22 L76 24 L60 22 L54 15 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />
            {/* Australia */}
            <path d="M74 34 L84 32 L86 40 L80 44 L72 42 Z" fill="#1E1245" stroke="#6847F5" strokeWidth="0.3" opacity="0.8" />

            {/* Memory pins */}
            {pinned.map((m) => (
              <GlobePin key={m.publicId} memory={m} onClick={() => setSelected(m)} />
            ))}
          </svg>
        )}

        {/* Pin count overlay */}
        {!loading && pinned.length > 0 && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <Globe2 className="w-3 h-3 text-[#6847F5]" />
            <span className="text-xs font-bold text-white">{pinned.length} moments</span>
          </div>
        )}
      </div>

      {/* Today Around the World feed */}
      <div className="px-4 mt-6 mb-24">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-white/50 uppercase">Today Around the World</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <Globe2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 font-medium">No public moments yet.</p>
            <p className="text-xs text-white/30 mt-1">Be the first to share a little moment with the world.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map((m) => (
              <motion.div
                key={m.publicId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(m)}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex cursor-pointer active:scale-[0.99] transition-transform"
              >
                {m.photoUrl && (
                  <img src={m.photoUrl} alt="" className="w-20 h-20 object-cover flex-shrink-0" />
                )}
                <div className="p-3 flex-1 min-w-0">
                  {m.caption && <p className="text-sm font-bold text-white leading-snug line-clamp-2">{m.caption}</p>}
                  {m.locationLabel && (
                    <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {m.locationLabel}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-white/40">{m.displayName}</span>
                    {m.publishedAt && (
                      <span className="text-[10px] text-white/30">
                        {formatDistanceToNow(new Date(m.publishedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Selected memory card */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <MemoryCard
              memory={selected}
              onClose={() => setSelected(null)}
              onReport={(id) => { setReportId(id); setSelected(null); }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Report dialog */}
      <AnimatePresence>
        {reportId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setReportId(null)} />
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="relative w-full bg-white rounded-t-3xl p-6 max-w-[430px] mx-auto">
              <h3 className="font-extrabold text-base mb-4">Report this memory</h3>
              <div className="space-y-2">
                {["personal information", "harassment", "inappropriate", "spam", "unsafe location", "other"].map((r) => (
                  <button key={r} onClick={() => setReportReason(r)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all capitalize ${reportReason === r ? "border-primary bg-[#EAE3FF] text-primary" : "border-border bg-muted/40"}`}>{r}</button>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setReportId(null); setReportReason(""); }} className="flex-1 py-3 rounded-full border border-border text-sm font-bold">Cancel</button>
                <button onClick={() => submitReport(reportId)} disabled={!reportReason} className="flex-1 py-3 rounded-full bg-primary text-white text-sm font-bold disabled:opacity-50">Submit Report</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
