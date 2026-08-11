/**
 * Memory Globe — real geographic Leaflet map.
 *
 * Features:
 * - Interactive world map (zoom, pan, touch)
 * - Custom animated marker pins with photo previews
 * - Filters: All / Today / This Week / Category
 * - City / country exploration
 * - Privacy: city-centroid locations only (no GPS)
 * - Memory profile card on pin tap
 * - Report abuse flow
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, X, Flag, Filter, Loader2, Globe2 } from "lucide-react";
import { format, isToday, isThisWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

type FilterId = "all" | "today" | "week" | "travel" | "people" | "food" | "everyday" | "celebration" | "nature";

// ── Category config ────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; bg: string }> = {
  everyday:    { color: "#6847F5", bg: "#EAE3FF" },
  travel:      { color: "#0EA5E9", bg: "#E0F2FE" },
  food:        { color: "#F97316", bg: "#FFF0E4" },
  people:      { color: "#EC4899", bg: "#FCE7F3" },
  nature:      { color: "#22C55E", bg: "#DCFCE7" },
  celebration: { color: "#EAB308", bg: "#FEF9C3" },
};
function catOf(cat: string) { return CAT[cat] ?? CAT.everyday; }

// ── Leaflet map component ──────────────────────────────────────────────────

function LeafletMap({ memories, onSelect }: { memories: GlobeMemory[]; onSelect: (m: GlobeMemory) => void }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[-85, -200], [85, 200]],
      minZoom: 1.5,
      maxZoom: 14,
    });

    // Warm cream-tinted tile layer (CartoDB Voyager)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        attribution: '© <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      },
    ).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Attribution
    L.control.attribution({ position: "bottomleft", prefix: false })
      .addAttribution('Map © <a href="https://carto.com/">CartoDB</a>')
      .addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when memories change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const pinned = memories.filter((m) => m.approximateLatitude != null && m.approximateLongitude != null);

    // Simple proximity cluster (within ~2 degrees)
    const clusters: { memories: GlobeMemory[]; lat: number; lon: number }[] = [];
    for (const m of pinned) {
      const lat = m.approximateLatitude!;
      const lon = m.approximateLongitude!;
      const existing = clusters.find(
        (c) => Math.abs(c.lat - lat) < 2 && Math.abs(c.lon - lon) < 2
      );
      if (existing) existing.memories.push(m);
      else clusters.push({ memories: [m], lat, lon });
    }

    for (const cluster of clusters) {
      const primary = cluster.memories[0];
      const { color } = catOf(primary.category);
      const isCluster = cluster.memories.length > 1;
      const dotLabel = isCluster ? String(cluster.memories.length) : "·";

      // Build custom HTML icon
      const iconHtml = `
        <div style="
          position: relative;
          width: ${isCluster ? 44 : 36}px;
          height: ${isCluster ? 44 : 36}px;
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="
            position: absolute; inset: 0; border-radius: 50%;
            background: ${color}20;
            animation: pulse 2s infinite;
          "></div>
          <div style="
            width: ${isCluster ? 36 : 28}px;
            height: ${isCluster ? 36 : 28}px;
            border-radius: 50%;
            background: ${color};
            border: 3px solid white;
            box-shadow: 0 2px 12px ${color}60;
            display: flex; align-items: center; justify-content: center;
            font-size: ${isCluster ? 14 : 16}px;
            color: white;
            font-weight: 900;
            font-family: system-ui;
            cursor: pointer;
          ">
            ${dotLabel}
          </div>
          ${primary.photoUrl ? `
            <div style="
              position: absolute;
              width: 48px; height: 48px;
              border-radius: 50%;
              border: 2px solid white;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              left: 50%; top: -52px;
              transform: translateX(-50%);
            ">
              <img src="${primary.photoUrl}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
          ` : ""}
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([cluster.lat, cluster.lon], { icon });
      marker.on("click", () => onSelect(primary));
      marker.addTo(markersRef.current!);
    }
  }, [memories, onSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full flex-1"
      style={{ minHeight: "calc(100dvh - 200px)" }}
    />
  );
}

// ── Memory card (bottom sheet) ─────────────────────────────────────────────

function MemoryCard({ memory, onClose, onReport }: { memory: GlobeMemory; onClose: () => void; onReport: (id: number) => void }) {
  const { color } = catOf(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-x-4 bottom-24 z-[1000] max-w-[400px] mx-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-border/20" style={{ transform: "rotate(-0.5deg)" }}>
        {/* Tape strip */}
        <div className="flex justify-center pt-1 pb-0">
          <div className="w-12 h-4 rounded-sm" style={{ background: "rgba(234,227,255,0.9)" }} />
        </div>
        {memory.photoUrl && (
          <img src={memory.photoUrl} alt={memory.caption ?? ""} className="w-full object-cover max-h-48" />
        )}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}>{memory.category}</span>
          </div>
          {memory.caption && (
            <p className="font-bold text-foreground text-sm leading-snug italic" style={{ fontFamily: "Georgia, serif" }}>
              "{memory.caption}"
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {memory.locationLabel && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <MapPin className="w-3 h-3" />{memory.locationLabel}
              </span>
            )}
            {memory.date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(memory.date), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
            <span className="text-xs font-bold text-muted-foreground">
              {memory.displayName === "Anonymous" ? "Anonymous" : `@${memory.username ?? memory.displayName}`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => onReport(memory.publicId)} className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-lg active:scale-95">
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
  const { color } = catOf(memory.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex gap-3 p-3">
        {memory.photoUrl ? (
          <img src={memory.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border/30" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${color}20` }}>
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {memory.caption && (
            <p className="text-sm font-semibold leading-snug line-clamp-2 italic" style={{ fontFamily: "Georgia, serif" }}>
              "{memory.caption}"
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {memory.locationLabel && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />{memory.locationLabel}
              </span>
            )}
            {memory.date && <span className="text-[10px] text-muted-foreground">{format(new Date(memory.date), "MMM d")}</span>}
          </div>
          <span className="text-[10px] font-bold mt-1 block" style={{ color }}>
            {memory.displayName === "Anonymous" ? "Anonymous" : `@${memory.username ?? memory.displayName}`}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Filter pills ─────────────────────────────────────────────────────────

const FILTER_COLORS: Record<string, string> = {
  all: "#6847F5", today: "#F59E0B", week: "#06B6D4", travel: "#0EA5E9",
  food: "#F97316", celebration: "#EAB308", nature: "#22C55E", everyday: "#6847F5",
};
const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "travel", label: "Travel" },
  { id: "food", label: "Food" },
  { id: "celebration", label: "Celebration" },
  { id: "nature", label: "Nature" },
  { id: "everyday", label: "Everyday" },
];

function applyFilter(memories: GlobeMemory[], filter: FilterId): GlobeMemory[] {
  switch (filter) {
    case "today":
      return memories.filter((m) => m.date && isToday(new Date(m.date)));
    case "week":
      return memories.filter((m) => m.date && isThisWeek(new Date(m.date)));
    case "travel":
    case "food":
    case "celebration":
    case "nature":
    case "everyday":
    case "people":
      return memories.filter((m) => m.category === filter);
    default:
      return memories;
  }
}

// ── View mode toggle ─────────────────────────────────────────────────────

type ViewMode = "map" | "feed";

// ── Main ───────────────────────────────────────────────────────────────────

export default function GlobePage() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<GlobeMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GlobeMemory | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [reportId, setReportId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => { loadMemories(); }, []);

  async function loadMemories() {
    setLoading(true);
    try {
      const res = await fetch("/api/globe/memories?limit=100", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function submitReport(id: number) {
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await fetch(`/api/globe/memories/${id}/report`, {
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

  const handleSelect = useCallback((m: GlobeMemory) => setSelected(m), []);
  const filtered = applyFilter(memories, filter);
  const withCoords = filtered.filter((m) => m.approximateLatitude != null && m.approximateLongitude != null);

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans flex flex-col overflow-hidden">
      {/* Leaflet CSS pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .leaflet-container { background: #EAE3FF; }
        .leaflet-control-zoom a {
          background: white !important;
          border-color: rgba(0,0,0,0.1) !important;
          color: #6847F5 !important;
          font-weight: 900 !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex-none bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-3 z-10">
        <Link href="/home" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* View toggle */}
        <div className="flex justify-center mb-3">
          <div className="flex bg-muted/60 rounded-full p-1 gap-1">
            <button
              onClick={() => setViewMode("map")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "map" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode("feed")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "feed" ? "bg-white shadow text-primary" : "text-muted-foreground"}`}
            >
              Feed
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f.id ? "bg-primary text-white shadow-sm" : "bg-white border border-border/60 text-foreground"
              }`}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FILTER_COLORS[f.id] ?? "#6847F5" }} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex-none px-5 py-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border/20">
        <MapPin className="w-3 h-3" />
        <span><strong className="text-foreground">{filtered.length}</strong> moments · <strong className="text-foreground">{withCoords.length}</strong> mapped</span>
      </div>

      {/* Map or Feed */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading memories from around the world…</p>
          </div>
        </div>
      ) : viewMode === "map" ? (
        <div className="flex-1 relative z-0">
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#EAE3FF] flex items-center justify-center mb-4 mx-auto">
              <Globe2 className="w-8 h-8 text-primary" />
            </div>
              <p className="font-bold text-foreground">No memories match this filter yet.</p>
              <p className="text-xs text-muted-foreground mt-2">Be the first — publish a memory with a location to the globe.</p>
              <Link href="/gifts" className="mt-4 inline-block bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full">
                My Memories
              </Link>
            </div>
          ) : (
            <LeafletMap memories={filtered} onSelect={handleSelect} />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-24">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-bold text-foreground">No memories match this filter.</p>
            </div>
          ) : (
            filtered.map((m) => (
              <FeedCard key={m.publicId} memory={m} onSelect={() => setSelected(m)} />
            ))
          )}
        </div>
      )}

      {/* Selected memory card */}
      <AnimatePresence>
        {selected && (
          <MemoryCard
            key={selected.publicId}
            memory={selected}
            onClose={() => setSelected(null)}
            onReport={(id) => { setSelected(null); setReportId(id); }}
          />
        )}
      </AnimatePresence>

      {/* Report sheet */}
      <AnimatePresence>
        {reportId !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[1001]"
              onClick={() => setReportId(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[1002] bg-[#FFF9F5] rounded-t-3xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold text-lg">Report this memory</h2>
                <button onClick={() => setReportId(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {["Inappropriate content", "Spam", "Privacy violation", "Other"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${reportReason === r ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-border"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={() => submitReport(reportId!)}
                disabled={!reportReason || submittingReport}
                className="w-full h-12 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Report"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Privacy note */}
      {viewMode === "map" && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] text-muted-foreground font-medium shadow-sm border border-border/40 whitespace-nowrap">
            City-level locations only · No exact GPS shared
          </div>
        </div>
      )}
    </div>
  );
}
