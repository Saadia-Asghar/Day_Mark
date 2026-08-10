/**
 * Monthly Memory Capsule page.
 *
 * Shows the previous month's recap — memories, people, places, moods,
 * streaks, future gifts, and one moment you may have forgotten.
 */
import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Share2, Heart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ForgottenMemory { id: number; title: string; date: string; category: string }
interface CapsuleMemory { id: number; title: string; date: string; category: string; photoUrl: string | null }

interface CapsuleSummary {
  year: number;
  month: number;
  memoriesCount: number;
  photoCount: number;
  categories: Record<string, number>;
  topCategory: string | null;
  keptCloseCount: number;
  futureGiftsCreated: number;
  messagesSent: number;
  longestStreak: number;
  bestPhotoUrl: string | null;
  bestPhotoTitle: string | null;
  forgottenMemory: ForgottenMemory | null;
  memories: CapsuleMemory[];
}

interface Capsule {
  id: number;
  userId: string;
  year: number;
  month: number;
  summaryData: CapsuleSummary;
  openedAt: string | null;
  generatedAt: string;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATEGORY_EMOJI: Record<string, string> = { everyday: "✨", travel: "✈️", food: "🍜", people: "💜", nature: "🌿", celebration: "🎉" };

export default function CapsulePage() {
  const [, params] = useRoute("/capsule/:year/:month");
  const { toast } = useToast();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    loadCapsule();
  }, []);

  async function loadCapsule() {
    setLoading(true);
    try {
      const url = params?.year && params?.month
        ? `/api/capsule/${params.year}/${params.month}`
        : "/api/capsule/latest";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCapsule(data.capsule);
        if (data.capsule?.openedAt) setShowContent(true);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleOpen() {
    if (!capsule) return;
    setOpened(true);
    setTimeout(() => setShowContent(true), 800);
    // Mark as opened
    await fetch(`/api/capsule/${capsule.year}/${capsule.month}/open`, {
      method: "POST", credentials: "include"
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center px-8 text-center">
        <Link href="/home" className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Package className="w-16 h-16 text-muted/30 mb-4" />
        <p className="font-bold text-lg">No capsule yet</p>
        <p className="text-sm text-muted-foreground mt-2">Keep saving memories — your monthly recap will appear here.</p>
      </div>
    );
  }

  const data = capsule.summaryData;
  const monthName = MONTH_NAMES[(data.month ?? capsule.month) - 1];
  const year = data.year ?? capsule.year;

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4 flex items-center justify-between">
        <Link href="/home" className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-extrabold">Your {monthName} in Little Things</h1>
          <p className="text-xs text-muted-foreground">{year}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Hero — wrapped gift or reveal */}
      {!showContent ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <motion.div
            animate={opened ? { scale: [1, 1.2, 0.8, 1.1, 1], rotate: [0, -5, 5, -3, 0] } : { y: [0, -6, 0] }}
            transition={opened ? { duration: 0.8 } : { repeat: Infinity, duration: 2 }}
            className="text-8xl mb-8 cursor-pointer select-none"
            onClick={!opened ? handleOpen : undefined}
          >
            🎁
          </motion.div>
          {!opened ? (
            <>
              <h2 className="text-2xl font-extrabold text-foreground">Your {monthName} is wrapped</h2>
              <p className="text-sm text-muted-foreground mt-2">{data.memoriesCount ?? 0} little moment{(data.memoriesCount ?? 0) !== 1 ? "s" : ""} inside.</p>
              <button
                onClick={handleOpen}
                className="mt-8 bg-primary text-white font-bold px-8 py-4 rounded-full shadow-[0_0_24px_rgba(104,71,245,0.3)] active:scale-95 transition-all text-base"
              >
                Unwrap {monthName} 🎀
              </button>
            </>
          ) : (
            <p className="text-lg font-bold text-primary animate-pulse">Opening…</p>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="px-5 py-6 space-y-6 pb-20"
        >
          {/* Best photo */}
          {data.bestPhotoUrl && (
            <div className="relative rounded-3xl overflow-hidden shadow-lg">
              <img src={data.bestPhotoUrl} alt={data.bestPhotoTitle ?? ""} className="w-full aspect-[4/3] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-extrabold text-lg leading-tight">{data.bestPhotoTitle}</p>
                <p className="text-white/80 text-xs mt-0.5">{monthName} {year} · Best moment</p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Memories", value: data.memoriesCount ?? 0, emoji: "✨" },
              { label: "With photos", value: data.photoCount ?? 0, emoji: "📸" },
              { label: "Kept close", value: data.keptCloseCount ?? 0, emoji: "💜" },
              { label: "Day streak", value: data.longestStreak ?? 0, emoji: "🔥" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 text-center">
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {data.categories && Object.keys(data.categories).length > 0 && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">What you captured</p>
              <div className="space-y-2">
                {Object.entries(data.categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-base">{CATEGORY_EMOJI[cat] ?? "✨"}</span>
                    <span className="text-sm font-medium capitalize flex-1">{cat.replace("_", " ")}</span>
                    <span className="text-sm font-bold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A moment you may have forgotten */}
          {data.forgottenMemory && (
            <div className="relative">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">One moment you may have forgotten</p>
              <Link href={`/gifts/${data.forgottenMemory.id}`}>
                <div className="bg-gradient-to-br from-[#EAE3FF] to-[#FFF9F5] rounded-2xl border border-primary/20 shadow-sm p-4 active:scale-[0.98] transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{CATEGORY_EMOJI[data.forgottenMemory.category] ?? "✨"}</span>
                    <div>
                      <p className="font-bold text-sm">{data.forgottenMemory.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(data.forgottenMemory.date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Memory grid */}
          {data.memories && data.memories.length > 0 && (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">
                All {data.memoriesCount} moments
              </p>
              <div className="grid grid-cols-3 gap-2">
                {data.memories.slice(0, 9).map((m) => (
                  <Link key={m.id} href={`/gifts/${m.id}`}>
                    <div className="aspect-square rounded-xl overflow-hidden bg-[#EAE3FF]/40 border border-border/40 flex items-center justify-center active:scale-95 transition-all">
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt={m.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center px-1">
                          <div className="text-lg">{CATEGORY_EMOJI[m.category] ?? "✨"}</div>
                          <p className="text-[8px] font-bold text-muted-foreground line-clamp-2 mt-0.5">{m.title}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share CTA */}
          <button
            onClick={async () => {
              if (navigator.share) {
                try { await navigator.share({ title: `My ${monthName} in Little Things`, text: `${data.memoriesCount} memories captured in ${monthName} ${year} on Daymark 💜` }); }
                catch { /* cancelled */ }
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-[0_0_16px_rgba(104,71,245,0.2)] active:scale-[0.98] transition-all"
          >
            <Share2 className="w-4 h-4" /> Share this capsule
          </button>
        </motion.div>
      )}
    </div>
  );
}
