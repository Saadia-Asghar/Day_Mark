import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useGetPerson } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Gift } from "lucide-react";
import { format } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { TapeStrip, DateStamp, RibbonDivider, GiftTag, OnThisDayCard } from "@/components/scrapbook";

// ── DayLink Streak Card ────────────────────────────────────────────────────
interface DaylinkData {
  currentStreak: number;
  longestStreak: number;
  todayQualified: boolean;
  history: { date: string; qualified: boolean }[];
}

function DaylinkCard({ personUserId }: { personUserId: string }) {
  const [streak, setStreak] = useState<DaylinkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/daylinks/${personUserId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.streak) setStreak(d.streak); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [personUserId]);

  if (loading) {
    return <div className="h-28 bg-muted rounded-3xl animate-pulse" />;
  }

  if (!streak) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-border shadow-sm p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Linked ribbon icon */}
          <svg viewBox="0 0 20 12" className="w-5 h-5" fill="none">
            <path d="M2 6 C2 3 5 1 8 3 L10 6 L12 9 C15 11 18 9 18 6" stroke="#6847F5" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M18 6 C18 3 15 1 12 3 L10 6 L8 9 C5 11 2 9 2 6" stroke="#FF719D" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-extrabold tracking-wider uppercase text-muted-foreground">DayLink</span>
        </div>
        {streak.todayQualified && (
          <span className="text-[10px] text-green-600 bg-green-50 font-bold px-2 py-0.5 rounded-full">Today ✓</span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mb-4">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-primary">{streak.currentStreak}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-2xl font-extrabold text-foreground">{streak.longestStreak}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Best</p>
        </div>
      </div>

      {/* 7-day history strip */}
      <div className="flex gap-1.5 items-end">
        {streak.history.map((h, i) => {
          const dayLabel = new Date(h.date).toLocaleDateString("en-US", { weekday: "short" })[0];
          return (
            <div key={h.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-full transition-all ${
                  h.qualified
                    ? "bg-primary shadow-[0_0_8px_rgba(104,71,245,0.3)]"
                    : "bg-muted"
                }`}
                style={{ height: h.qualified ? 20 : 8 }}
              />
              <span className="text-[9px] text-muted-foreground font-medium">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function PersonDetailPage() {
  const [, params] = useRoute("/people/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();

  const { data: person, isLoading, isError, refetch } = useGetPerson(id || 0);

  if (isError) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] p-5 pt-20 flex flex-col">
        <Link href="/people" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <DmErrorState message="We couldn't load this person's story." onRetry={refetch} />
      </div>
    );
  }

  if (isLoading || !person) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  const handleWrapTogether = () => {
    setLocation(`/wrap?personId=${id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32 overflow-x-hidden">

      {/* Back */}
      <Link href="/people" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center active:scale-95">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* ── Hero — portrait postcard ───────────────────────────── */}
      <div className="px-4 pt-20 pb-6">
        <div className="relative">
          <TapeStrip rotate={-4} className="-top-2 left-8" />
          <TapeStrip rotate={3} className="-top-2 right-8" />

          <div
            className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.13)]"
            style={{ transform: "rotate(-0.6deg)", borderRadius: 4 }}
          >
            {/* Portrait photo */}
            <div className="p-3 pb-0">
              <div
                className="relative bg-[#EAE3FF] overflow-hidden"
                style={{ aspectRatio: "3/2" }}
              >
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-8xl font-bold text-primary/20">{person.name.charAt(0)}</span>
                  </div>
                )}
                {/* Date stamp */}
                {person.nextImportantDate && (
                  <DateStamp
                    date={format(new Date(person.nextImportantDate), "MMM d")}
                    className="absolute top-3 right-3"
                  />
                )}
              </div>
            </div>

            {/* Caption strip */}
            <div className="px-4 pt-3 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{person.name}</h1>
                  {person.relationship && (
                    <div className="mt-1">
                      <span className="inline-block bg-[#EAE3FF] text-primary text-xs font-bold px-3 py-1 rounded-full">
                        {person.relationship}
                      </span>
                    </div>
                  )}
                </div>
                {/* Stats */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <Gift className="w-4 h-4 text-primary" />
                    <span>{person.memoriesCount || 0} memories</span>
                  </div>
                  {person.nextImportantDate && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(person.nextImportantDate), "MMM d")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Handwritten note */}
              <p
                className="mt-3 text-sm text-muted-foreground italic border-t border-dashed border-border/50 pt-2"
                style={{ fontFamily: "cursive" }}
              >
                {person.memoriesCount
                  ? `${person.memoriesCount} shared moment${person.memoriesCount !== 1 ? "s" : ""} — and counting.`
                  : "Your story together starts here."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5">
        <RibbonDivider />

        {/* ── DayLink Streak ───────────────────────────────────── */}
        {person.linkedUserId && (
          <div className="mb-6">
            <DaylinkCard personUserId={person.linkedUserId} />
          </div>
        )}

        {/* ── Our Story Timeline ───────────────────────────────── */}
        <h2 className="text-base font-extrabold uppercase tracking-widest text-muted-foreground mb-5 mt-4">
          Our Story
        </h2>

        {person.memories && person.memories.length > 0 ? (
          <div className="space-y-5 relative">
            {/* Ribbon line */}
            <div
              className="absolute top-0 bottom-0 left-5 w-0.5 rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent"
              aria-hidden="true"
            />

            {person.memories.map((memory, i) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative pl-12"
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-4 w-10 h-10 rounded-full border-4 border-[#FFF9F5] flex items-center justify-center shadow-sm z-10"
                  style={{ backgroundColor: memory.giftColor }}
                >
                  <Gift className="w-4 h-4 text-white" />
                </div>

                {/* Memory card */}
                <Link href={`/gifts/${memory.id}`} className="block outline-none">
                  <div className="bg-white rounded-2xl border border-border shadow-sm p-4 active:scale-[0.98] transition-transform">
                    <p className="text-xs font-bold text-muted-foreground mb-1">
                      {format(new Date(memory.date), "MMMM d, yyyy")}
                    </p>
                    <h3 className="font-bold text-base leading-snug mb-2">{memory.title}</h3>

                    {memory.photoUrls && memory.photoUrls.length > 0 && (
                      <div className="h-20 w-full rounded-xl overflow-hidden mb-2 border border-border/40">
                        <img
                          src={memory.photoUrls[0]}
                          className="w-full h-full object-cover"
                          alt={memory.title}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {memory.story && (
                      <p className="text-sm text-muted-foreground line-clamp-2 italic"
                        style={{ fontFamily: "cursive" }}>
                        "{memory.story}"
                      </p>
                    )}

                    <div className="mt-2">
                      <GiftTag category={memory.category} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-border shadow-sm">
            <Gift className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">No shared memories yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Wrap a memory with {person.name} and it will appear here.
            </p>
            <button
              onClick={handleWrapTogether}
              className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(104,71,245,0.25)] active:scale-95 transition-all"
            >
              Wrap a memory together
            </button>
          </div>
        )}

        {/* ── Wrap together CTA ───────────────────────────────── */}
        {person.memories && person.memories.length > 0 && (
          <div className="mt-8">
            <button
              onClick={handleWrapTogether}
              className="w-full bg-primary text-white py-4 rounded-full text-base font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              🎁 Wrap a memory together
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
