/**
 * Memory Globe — cream/lavender magical presentation.
 *
 * 2.5D sphere with drag-to-rotate, glowing sparkle pins,
 * warm photographic cards, and soft atmospheric styling.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, X, Flag, Sparkles, Globe2 } from "lucide-react";
import { format } from "date-fns";
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

// ── Category config ────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; emoji: string }> = {
  everyday: { color: "#6847F5", emoji: "✨" },
  travel:   { color: "#0EA5E9", emoji: "✈️" },
  food:     { color: "#F97316", emoji: "🍜" },
  people:   { color: "#EC4899", emoji: "💜" },
  nature:   { color: "#22C55E", emoji: "🌿" },
  celebration: { color: "#EAB308", emoji: "🎉" },
  default:  { color: "#6847F5", emoji: "✨" },
};

function catOf(cat: string) {
  return CAT[cat] ?? CAT.default;
}

// ── 2.5D Sphere Globe ─────────────────────────────────────────────────────

const GLOBE_R = 140; // radius in px

function project(lat: number, lon: number, lonOffset: number) {
  const adjustedLon = ((lon + lonOffset + 540) % 360) - 180;
  // Mercator-ish projection onto sphere surface
  const x = (adjustedLon / 180) * GLOBE_R * 0.82;
  const latRad = (lat * Math.PI) / 180;
  const y = -(Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) * GLOBE_R * 0.72;
  // Depth: how "in front" of the sphere is this point
  const normX = x / GLOBE_R;
  const normY = y / GLOBE_R;
  const depth = 1 - Math.min(1, normX * normX + normY * normY);
  return { x, y, depth, visible: depth > 0 };
}

function GlobeComponent({
  memories,
  onSelect,
}: {
  memories: GlobeMemory[];
  onSelect: (m: GlobeMemory) => void;
}) {
  const [lonOffset, setLonOffset] = useState(20);
  const dragRef = useRef<{ startX: number; startLon: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startLon: lonOffset };
  }, [lonOffset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    setLonOffset(dragRef.current.startLon + delta * 0.35);
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const pinned = memories.filter((m) => m.approximateLatitude != null && m.approximateLongitude != null);

  // Cluster nearby pins (within ~8deg)
  const clusters: { memories: GlobeMemory[]; lat: number; lon: number }[] = [];
  for (const m of pinned) {
    const lat = m.approximateLatitude!;
    const lon = m.approximateLongitude!;
    const existing = clusters.find(
      (c) => Math.abs(c.lat - lat) < 8 && Math.abs(c.lon - lon) < 8,
    );
    if (existing) existing.memories.push(m);
    else clusters.push({ memories: [m], lat, lon });
  }

  const W = GLOBE_R * 2 + 40;
  const H = GLOBE_R * 2 + 20;

  return (
    <div
      className="relative select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ width: W, height: H }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {/* Sphere gradient */}
          <radialGradient id="sphereGrad" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#EAE3FF" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#C4B5FD" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6847F5" stopOpacity="0.25" />
          </radialGradient>
          {/* Sphere rim shadow */}
          <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="82%" stopColor="transparent" />
            <stop offset="100%" stopColor="#6847F5" stopOpacity="0.18" />
          </radialGradient>
          {/* Clip to sphere */}
          <clipPath id="sphereClip">
            <circle cx={W / 2} cy={H / 2} r={GLOBE_R} />
          </clipPath>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Sphere body */}
        <circle cx={W / 2} cy={H / 2} r={GLOBE_R} fill="url(#sphereGrad)" />

        {/* Subtle latitude lines */}
        <g clipPath="url(#sphereClip)" opacity="0.12">
          {[-60, -30, 0, 30, 60].map((lat) => {
            const p = project(lat, 0, lonOffset);
            const yy = H / 2 + p.y;
            const rx = Math.sqrt(Math.max(0, GLOBE_R * GLOBE_R - (yy - H / 2) * (yy - H / 2)));
            return <ellipse key={lat} cx={W / 2} cy={yy} rx={rx} ry={rx * 0.08} stroke="#6847F5" strokeWidth="0.8" fill="none" />;
          })}
          {/* Longitude lines */}
          {[-120, -60, 0, 60, 120].map((lon) => {
            const pts: string[] = [];
            for (let lat = -80; lat <= 80; lat += 10) {
              const p = project(lat, lon, lonOffset);
              if (p.visible) pts.push(`${W / 2 + p.x},${H / 2 + p.y}`);
            }
            return pts.length > 1 ? <polyline key={lon} points={pts.join(" ")} stroke="#6847F5" strokeWidth="0.6" fill="none" /> : null;
          })}
        </g>

        {/* Memory pins */}
        <g clipPath="url(#sphereClip)">
          {clusters.map((cluster, i) => {
            const p = project(cluster.lat, cluster.lon, lonOffset);
            if (!p.visible || p.depth < 0.05) return null;
            const cx = W / 2 + p.x;
            const cy = H / 2 + p.y;
            const primary = cluster.memories[0];
            const { color } = catOf(primary.category);
            const size = cluster.memories.length > 1 ? 8 : 6;
            const opacity = 0.4 + p.depth * 0.6;

            return (
              <g
                key={i}
                transform={`translate(${cx}, ${cy})`}
                style={{ cursor: "pointer", opacity }}
                onClick={() => onSelect(cluster.memories[0])}
                filter="url(#glow)"
              >
                {/* Pulse ring */}
                <circle r={size + 4} fill={color} opacity="0.15">
                  <animate attributeName="r" values={`${size + 3};${size + 8};${size + 3}`} dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0;0.2" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Core dot */}
                <circle r={size} fill={color} />
                <circle r={size * 0.4} fill="white" opacity="0.8" />
                {/* Count badge */}
                {cluster.memories.length > 1 && (
                  <text fontSize="5" fill="white" textAnchor="middle" dy="2" fontWeight="bold">
                    {cluster.memories.length}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Rim glow */}
        <circle cx={W / 2} cy={H / 2} r={GLOBE_R} fill="url(#rimGrad)" />
        {/* Glass shine */}
        <ellipse cx={W / 2 - 40} cy={H / 2 - 45} rx={38} ry={22} fill="white" opacity="0.18" transform="rotate(-20, 160, 115)" />
      </svg>

      {/* Drag hint */}
      <p className="absolute bottom-1 w-full text-center text-[10px] text-muted-foreground font-medium pointer-events-none">
        Drag to explore
      </p>
    </div>
  );
}

// ── Memory card ────────────────────────────────────────────────────────────

function MemoryCard({ memory, onClose, onReport }: { memory: GlobeMemory; onClose: () => void; onReport: (id: number) => void }) {
  const { color, emoji } = catOf(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-x-4 bottom-28 z-50 max-w-[380px] mx-auto"
    >
      {/* Scrapbook card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-border/30" style={{ transform: "rotate(-0.5deg)" }}>
        {/* Tape strip */}
        <div className="flex justify-center -mt-1">
          <div className="w-12 h-5 rounded-sm" style={{ background: "rgba(234,227,255,0.8)" }} />
        </div>
        {memory.photoUrl && (
          <img src={memory.photoUrl} alt={memory.caption ?? ""} className="w-full object-cover" style={{ maxHeight: 200 }} />
        )}
        <div className="p-4 pt-3">
          {/* Category pill */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{emoji}</span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}>{memory.category}</span>
          </div>
          {memory.caption && (
            <p className="font-bold text-foreground text-sm leading-snug italic" style={{ fontFamily: "cursive" }}>
              "{memory.caption}"
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {memory.locationLabel && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <MapPin className="w-3 h-3" />
                {memory.locationLabel}
              </span>
            )}
            {memory.date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(memory.date), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground font-semibold">
              {memory.displayName === "Anonymous" ? "✨ Anonymous" : `@${memory.username ?? memory.displayName}`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => onReport(memory.publicId)} className="flex items-center gap-1 text-xs text-muted-foreground active:scale-95 px-2 py-1 rounded-lg hover:bg-muted transition-colors">
                <Flag className="w-3 h-3" /> Report
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────

function FeedCard({ memory, onSelect }: { memory: GlobeMemory; onSelect: () => void }) {
  const { color, emoji } = catOf(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex gap-3 p-3">
        {memory.photoUrl ? (
          <img
            src={memory.photoUrl}
            alt=""
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border/30"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: `${color}20` }}>
            {emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {memory.caption && (
            <p className="text-sm font-semibold leading-snug line-clamp-2 italic" style={{ fontFamily: "cursive" }}>
              "{memory.caption}"
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {memory.locationLabel && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />{memory.locationLabel}
              </span>
            )}
            {memory.date && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(memory.date), "MMM d")}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 block" style={{ color }}>
            {emoji} {memory.displayName === "Anonymous" ? "Anonymous" : `@${memory.username ?? memory.displayName}`}
          </span>
        </div>
      </div>
    </motion.div>
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
  const [submittingReport, setSubmittingReport] = useState(false);

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
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
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
    setSubmittingReport(false);
  }

  const feed = memories.slice(0, 20);

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/home" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-extrabold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Memory Globe
            <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Small moments from everywhere.</p>
        </div>
      </div>

      {/* ── Globe sphere ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-6 pb-4 relative">
        {/* Atmospheric glow behind globe */}
        <div className="absolute top-2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(104,71,245,0.08) 0%, transparent 70%)" }} />

        {/* Decorative sparkles */}
        {[
          { top: 20, left: 30, size: 10, delay: 0 },
          { top: 60, left: 15, size: 8, delay: 0.4 },
          { top: 20, right: 30, size: 12, delay: 0.8 },
          { top: 80, right: 20, size: 7, delay: 1.2 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none text-primary/40"
            style={{ top: s.top, left: (s as any).left, right: (s as any).right, fontSize: s.size }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.5, delay: s.delay, repeat: Infinity }}
          >
            ✨
          </motion.div>
        ))}

        {loading ? (
          <div className="w-[320px] h-[320px] flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : (
          <GlobeComponent memories={memories} onSelect={setSelected} />
        )}

        {/* Memory count pill */}
        {!loading && memories.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-border shadow-sm rounded-full px-3 py-1.5 mt-2">
            <Globe2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">{memories.length} moment{memories.length !== 1 ? "s" : ""} worldwide</span>
          </div>
        )}
      </div>

      {/* ── Today Around the World ──────────────────────────────────── */}
      <div className="px-5 pb-28">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">Today Around the World</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#EAE3FF] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="font-bold text-base">No moments here yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to share a little moment with the world.</p>
            <Link href="/gifts">
              <button className="mt-4 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(104,71,245,0.25)] active:scale-95 transition-all">
                Share a memory →
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map((m) => (
              <FeedCard key={m.publicId} memory={m} onSelect={() => setSelected(m)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Selected memory card ───────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <MemoryCard
            memory={selected}
            onClose={() => setSelected(null)}
            onReport={(id) => { setSelected(null); setReportId(id); }}
          />
        )}
      </AnimatePresence>

      {/* ── Report dialog ──────────────────────────────────────────── */}
      <AnimatePresence>
        {reportId !== null && (
          <>
            <motion.div
              key="report-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setReportId(null)}
            />
            <motion.div
              key="report-dialog"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 p-6"
            >
              <h3 className="font-extrabold text-lg mb-1">Report this memory</h3>
              <p className="text-sm text-muted-foreground mb-4">Tell us why this content shouldn't be on the Globe.</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                className="w-full bg-[#FFF9F5] border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setReportId(null)} className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground active:scale-95 transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => submitReport(reportId)}
                  disabled={!reportReason.trim() || submittingReport}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-all"
                >
                  {submittingReport ? "Sending…" : "Submit Report"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
