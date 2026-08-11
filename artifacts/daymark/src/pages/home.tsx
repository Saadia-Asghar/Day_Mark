import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetHomeSummary, useListPeople, useListNotifications,
  useMarkNotificationRead, useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import type { CalendarEvent, Notification } from "@workspace/api-client-react";
import { DaymarkCharacter } from "@/components/daymark-character";
import { Gift, Bell, Camera, Mic, MapPin, Edit3, Plus, X, CheckCheck, Globe2, Sparkles, Package } from "lucide-react";
import { format, formatDistanceToNow, differenceInYears } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { TapeStrip, GiftFromPastSkeleton, EmptyPastGiftState } from "@/components/scrapbook";
import { useAppAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";

// ── Background doodles ────────────────────────────────────────────────────
const BackgroundDoodles = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none select-none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M348 48 L349.8 54 L356 54 L351 57.8 L353 64 L348 60.5 L343 64 L345 57.8 L340 54 L346.2 54Z"
      fill="#6847F5" opacity="0.07"
    />
    <circle cx="28" cy="130" r="3.5" fill="#FF719D" opacity="0.1" />
    <circle cx="44" cy="118" r="2.5" fill="#FFC857" opacity="0.12" />
    <circle cx="20" cy="115" r="2" fill="#6847F5" opacity="0.09" />
    <path
      d="M370 290 L371.2 294 L375 294 L372.2 296.5 L373.2 300 L370 298 L366.8 300 L367.8 296.5 L365 294 L368.8 294Z"
      fill="#FFC857" opacity="0.1"
    />
    <circle cx="22" cy="510" r="5" fill="#FFB58A" opacity="0.09" />
    <circle cx="30" cy="504" r="4" fill="#FF719D" opacity="0.07" />
    <circle cx="14" cy="505" r="3.5" fill="#FFB58A" opacity="0.07" />
    <text x="362" y="195" fontSize="11" fill="#FF719D" opacity="0.11">♡</text>
    <text x="10" y="390" fontSize="9" fill="#6847F5" opacity="0.1">✦</text>
    <text x="368" y="440" fontSize="8" fill="#FFC857" opacity="0.1">✦</text>
    <circle cx="200" cy="12" r="2" fill="#6847F5" opacity="0.07" />
    <circle cx="214" cy="12" r="1.5" fill="#6847F5" opacity="0.05" />
    <circle cx="186" cy="12" r="1.5" fill="#6847F5" opacity="0.05" />
  </svg>
);

// ── Event gift-tag card ───────────────────────────────────────────────────
const getEventTagStyle = (type: string) => {
  switch (type) {
    case "birthday":
      return { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", circle: "border-pink-300", emoji: "🎂", rotate: "-rotate-1" };
    case "travel":
      return { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", circle: "border-sky-300", emoji: "✈️", rotate: "rotate-1" };
    case "anniversary":
      return { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", circle: "border-rose-300", emoji: "❤️", rotate: "-rotate-0.5" };
    case "achievement":
      return { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", circle: "border-violet-300", emoji: "⭐", rotate: "rotate-0.5" };
    default:
      return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", circle: "border-amber-300", emoji: "📅", rotate: "-rotate-1" };
  }
};

const EventTag = ({ event, index }: { event: CalendarEvent; index: number }) => {
  const s = getEventTagStyle(event.type);
  const subtitle =
    event.daysUntil === 0 ? "Today!" :
    event.daysUntil === 1 ? "Tomorrow" :
    event.daysUntil != null ? `${event.daysUntil}d away` : "Coming up";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={`relative snap-start shrink-0 pt-4 ${s.rotate}`}
    >
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${s.circle} bg-[#FFF9F5] z-10`} />
      <div className={`${s.bg} border ${s.border} rounded-2xl px-4 py-3.5 min-w-[88px] flex flex-col items-center shadow-sm`}>
        <span className="text-2xl mb-1.5">{s.emoji}</span>
        <span className={`text-xs font-bold text-center leading-tight ${s.text}`}>{event.title}</span>
        <span className={`text-[10px] font-semibold mt-1 opacity-70 ${s.text}`}>{subtitle}</span>
      </div>
    </motion.div>
  );
};

// ── Quick-capture buttons ─────────────────────────────────────────────────
const CaptureButtons = () => {
  const items = [
    {
      id: "photo", label: "PHOTO", href: "/wrap?type=photo",
      node: (
        <div className="bg-white border-2 border-sky-100 rounded-lg p-1.5 shadow-sm flex items-center justify-center w-11 h-11">
          <Camera className="w-5 h-5 text-sky-500" />
        </div>
      ),
      border: "border-sky-100", text: "text-sky-600",
    },
    {
      id: "story", label: "STORY", href: "/wrap?type=story",
      node: (
        <div className="relative w-11 h-11 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center">
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-200 rounded-bl-md" />
          <Edit3 className="w-5 h-5 text-amber-600" />
        </div>
      ),
      border: "border-amber-100", text: "text-amber-700",
    },
    {
      id: "voice", label: "VOICE", href: "/wrap?type=voice",
      node: (
        <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center gap-px overflow-hidden">
          {[2, 4, 6, 4, 7, 4, 5, 3, 6, 3].map((h, i) => (
            <div key={i} className="w-0.5 rounded-full bg-emerald-500 opacity-80" style={{ height: `${h * 3}px` }} />
          ))}
        </div>
      ),
      border: "border-emerald-100", text: "text-emerald-700",
    },
    {
      id: "place", label: "PLACE", href: "/wrap?type=place",
      node: (
        <div className="relative w-11 h-11 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center">
          <div className="absolute top-1 right-1 w-3 h-4 border border-rose-300 rounded-[2px]" />
          <MapPin className="w-5 h-5 text-rose-500" />
        </div>
      ),
      border: "border-rose-100", text: "text-rose-700",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <Link key={item.id} href={item.href}>
          <motion.div
            whileTap={{ scale: 0.92, y: -2 }}
            className={`flex flex-col items-center gap-2 py-3 rounded-2xl border ${item.border} bg-white shadow-sm cursor-pointer`}
          >
            {item.node}
            <span className={`text-[9px] font-extrabold tracking-widest ${item.text}`}>{item.label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
};

// ── Notifications drawer ──────────────────────────────────────────────────
function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications: Notification[] = (data as any)?.notifications ?? [];

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id } as any, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };
  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };

  const typeIcon: Record<string, string> = {
    memory_from_past: "💜",
    birthday_upcoming: "🎂",
    future_gift_ready: "🔓",
    shared_memory_updated: "📸",
    collaborator_invitation: "💌",
    memory_anniversary: "⭐",
    // Social feature notification types
    connection_request: "💜",
    connection_accepted: "✨",
    memory_drop: "💌",
    daylink_updated: "🔗",
    daylink_milestone: "🌟",
    scheduled_message_received: "💌",
    prompt_shared: "💭",
    globe_reaction: "🌍",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
              <h2 className="font-extrabold text-base">Notifications</h2>
              <div className="flex items-center gap-3">
                {notifications.some((n) => !n.readAt) && (
                  <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs font-bold text-primary">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {isLoading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)
              ) : notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">🔔</span>
                  <p className="font-bold text-sm">Everything is quiet for now.</p>
                  <p className="text-xs text-muted-foreground">Daymark will let you know when something special happens.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      n.readAt ? "bg-white/60 border-border/30 opacity-70" : "bg-white border-border shadow-sm"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#EAE3FF] flex items-center justify-center text-lg flex-shrink-0">
                      {typeIcon[n.type] ?? "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.readAt && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="w-7 h-7 rounded-full bg-[#EAE3FF] flex items-center justify-center flex-shrink-0 mt-0.5"
                        aria-label="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-primary" />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── DayLink streak type ───────────────────────────────────────────────────
interface DaylinkStreak {
  id: number;
  currentStreak: number;
  longestStreak: number;
  otherUser: { id: string; firstName: string | null; displayName: string | null; profileImageUrl: string | null } | null;
}

// ── DayLink card ─────────────────────────────────────────────────────────
function DaylinkCard({ streak }: { streak: DaylinkStreak }) {
  const name = streak.otherUser?.displayName ?? streak.otherUser?.firstName ?? "Someone";
  const avatar = streak.otherUser?.profileImageUrl;
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3 flex-shrink-0 w-[168px] snap-start">
      {avatar ? (
        <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#EAE3FF] flex items-center justify-center font-bold text-primary flex-shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-bold text-xs truncate">{name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <svg viewBox="0 0 20 12" className="w-4 h-4" fill="none">
            <path d="M2 6 C2 3 5 1 8 3 L10 6 L12 9 C15 11 18 9 18 6" stroke="#6847F5" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M18 6 C18 3 15 1 12 3 L10 6 L8 9 C5 11 2 9 2 6" stroke="#FF719D" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-extrabold text-primary">{streak.currentStreak}</span>
          <span className="text-[10px] text-muted-foreground font-medium">day{streak.currentStreak !== 1 ? "s" : ""}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
          {streak.currentStreak} little {streak.currentStreak === 1 ? "day" : "days"} together
        </p>
      </div>
    </div>
  );
}

// ── Globe preview card ────────────────────────────────────────────────────
function GlobePreviewCard({ memory }: { memory: { caption?: string | null; locationLabel?: string | null; displayName?: string } }) {
  return (
    <Link href="/globe" className="block outline-none mx-5">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="rounded-3xl overflow-hidden bg-[#0D0A1E] border border-white/10 shadow-lg p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6847F5]/20 flex items-center justify-center flex-shrink-0">
            <Globe2 className="w-5 h-5 text-[#6847F5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-white/40 uppercase">Moment From Somewhere 🌍</p>
            <p className="text-sm font-bold text-white mt-1 leading-snug line-clamp-2">
              {memory.caption ?? "A little moment from somewhere in the world."}
            </p>
            {memory.locationLabel && (
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {memory.locationLabel}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/30">{memory.displayName ?? "Anonymous"}</span>
          <span className="text-xs text-[#6847F5] font-bold">Explore Globe →</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Daily prompt card ─────────────────────────────────────────────────────
interface DailyPrompt { id: number; text: string; category: string; activeDate: string }

function DailyQuestionCard({ prompt, onAnswered }: { prompt: DailyPrompt; onAnswered?: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async (mode: "private" | "memory") => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/prompts/${prompt.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ responseText: text.trim(), mode }),
      });
      setDone(true);
      setOpen(false);
      onAnswered?.();
    } catch (_) {}
    setSaving(false);
  };

  if (done) {
    return (
      <div className="mx-5 bg-white border border-border rounded-2xl p-4 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">✨ Saved for today</p>
        <p className="text-xs text-muted-foreground mt-1">Your little answer is safe.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="mx-5 bg-white border border-border rounded-2xl p-4 shadow-sm cursor-pointer relative overflow-hidden"
      >
        {/* Tape corner */}
        <div className="absolute -top-1 left-6 w-10 h-3 bg-amber-100/80 border border-amber-200/60 rounded-sm rotate-[-1deg]" />
        <p className="text-[11px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase mb-2 mt-1">Today's Little Question 💭</p>
        <p className="text-base font-bold text-foreground leading-snug">{prompt.text}</p>
        <p className="text-xs text-primary font-semibold mt-3">Tap to answer →</p>
      </motion.div>

      {/* Answer sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h2 className="font-extrabold text-base">Today's Little Question</h2>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="px-5 py-6 space-y-4">
                <p className="font-bold text-base text-foreground">{prompt.text}</p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your little answer here…"
                  rows={4}
                  className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSave("private")}
                    disabled={!text.trim() || saving}
                    className="flex-1 h-12 bg-[#EAE3FF] text-primary rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    Keep for myself
                  </button>
                  <button
                    onClick={() => handleSave("memory")}
                    disabled={!text.trim() || saving}
                    className="flex-1 h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-[0_0_16px_rgba(104,71,245,0.25)] disabled:opacity-50"
                  >
                    Save as memory ✨
                  </button>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full text-xs text-muted-foreground font-medium py-1"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAppAuth();
  const { data: summary, isLoading: loadingSummary, isError: isSummaryError, refetch: refetchSummary } = useGetHomeSummary();
  const { data: people, isLoading: loadingPeople, isError: isPeopleError, refetch: refetchPeople } = useListPeople();
  const { data: notifications } = useListNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [daylinks, setDaylinks] = useState<DaylinkStreak[]>([]);
  const [globePreview, setGlobePreview] = useState<{ caption?: string | null; locationLabel?: string | null; displayName?: string } | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<{ prompt: DailyPrompt | null; response: { id: number } | null } | null>(null);
  const [promptAnswered, setPromptAnswered] = useState(false);

  useEffect(() => {
    fetch("/api/daylinks", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.daylinks?.length > 0) setDaylinks(d.daylinks.slice(0, 3)); })
      .catch(() => {});

    fetch("/api/globe/memories?limit=1", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.memories?.[0]) setGlobePreview(d.memories[0]); })
      .catch(() => {});

    fetch("/api/prompts/today", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setTodayPrompt(d);
          setPromptAnswered(!!d.response);
        }
      })
      .catch(() => {});
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.firstName ?? null;

  // "This Day" — compute how many years ago
  const thisDay = summary?.giftFromPast ?? null;
  const yearsAgo = thisDay?.date
    ? differenceInYears(new Date(), new Date(thisDay.date))
    : 0;
  const isOnThisDay = thisDay && yearsAgo > 0 && (() => {
    const todayMD = new Date().toISOString().slice(5, 10);
    const memMD = thisDay.date?.slice(5, 10);
    return todayMD === memMD;
  })();

  const sectionLabel = (label: string) => (
    <div className="px-5 mb-4 flex items-center gap-2">
      <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );

  const rotations = [-2, 1.5, -1, 2, -1.5, 1];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans w-full flex flex-col relative overflow-hidden">
      <BackgroundDoodles />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="px-5 pt-12 pb-1 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shadow-sm">
            <Gift className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight">Daymark</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-white hover:shadow-sm transition-all"
            aria-label={`Notifications${(notifications?.unreadCount ?? 0) > 0 ? `, ${notifications?.unreadCount} unread` : ""}`}
          >
            <Bell className="w-5 h-5" />
            {(notifications?.unreadCount ?? 0) > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {(notifications?.unreadCount ?? 0) > 9 ? "9+" : notifications?.unreadCount}
              </span>
            )}
          </button>
          <Link href="/profile" aria-label="Profile">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={firstName ?? "You"} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                {firstName ? firstName[0].toUpperCase() : "M"}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-32 relative z-10">

        {/* ── 1. Greeting ─────────────────────────────────────────── */}
        <section className="px-5 pt-5 pb-2 relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm font-semibold text-muted-foreground">
              {firstName ? `${greeting}, ${firstName} ✨` : `${greeting} ✨`}
            </p>
            <h1 className="text-[28px] leading-[1.2] font-extrabold text-foreground mt-1 max-w-[230px]">
              What will you remember about today?
            </h1>
          </motion.div>
          <DaymarkCharacter
            character="marky"
            pose="wave"
            size="md"
            animation="float"
            className="absolute right-5 bottom-0"
          />
        </section>

        <div className="mx-5 mt-8 mb-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* ── 2. This Day ✨ ────────────────────────────────────────── */}
        <section className="mt-8 px-4">
          <div className="px-1 mb-5 flex items-center gap-2">
            <SparkleIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-primary uppercase">
              {isOnThisDay ? "This Day ✨" : "A Gift From Your Past"}
            </span>
          </div>

          {loadingSummary ? (
            <GiftFromPastSkeleton />
          ) : isSummaryError ? (
            <DmErrorState message="We couldn't open your past gift right now." onRetry={refetchSummary} />
          ) : thisDay ? (
            <Link href={`/gifts/${thisDay.id}`} className="block outline-none">
              <div className="relative">
                <TapeStrip rotate={-3} className="-top-2.5 left-6" />
                <motion.div
                  whileTap={{ scale: 0.98, rotate: 0 }}
                  className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.13)] relative z-10"
                  style={{ transform: "rotate(-1.3deg)", borderRadius: 4 }}
                >
                  <div className="p-2.5 pb-0">
                    <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {thisDay.photoUrls?.length ? (
                        <img
                          src={thisDay.photoUrls[0]}
                          alt={thisDay.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-end p-4"
                          style={{ background: `linear-gradient(135deg, ${thisDay.giftColor} 0%, ${thisDay.giftColor}99 100%)` }}
                        >
                          <span className="text-white font-bold text-xl drop-shadow">{thisDay.title}</span>
                        </div>
                      )}
                      {thisDay.location && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]">{thisDay.location}</span>
                        </div>
                      )}
                      {/* Year-ago badge */}
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                        <span className="text-[10px] font-mono text-white">
                          {isOnThisDay && yearsAgo > 0
                            ? `${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago today`
                            : format(new Date(thisDay.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pt-3 pb-5">
                    {isOnThisDay && yearsAgo > 0 && (
                      <p className="text-[11px] font-bold text-primary mb-1">
                        {yearsAgo === 1 ? "One year ago today" : `${yearsAgo} years ago today`}
                      </p>
                    )}
                    <h3 className="font-bold text-foreground text-base leading-snug">{thisDay.title}</h3>
                    {thisDay.story && (
                      <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 italic" style={{ fontFamily: "cursive" }}>
                        "{thisDay.story}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex -space-x-2">
                        {thisDay.people?.slice(0, 4).map((p, i) => (
                          <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-[#EAE3FF] flex items-center justify-center overflow-hidden shadow-sm">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold text-primary">{p.name.charAt(0)}</span>
                            )}
                          </div>
                        ))}
                        {thisDay.people && thisDay.people.length > 4 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-muted flex items-center justify-center">
                            <span className="text-[9px] font-bold text-muted-foreground">+{thisDay.people.length - 4}</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-primary text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-sm shadow-primary/20 flex items-center gap-1">
                        ✨ Open memory
                      </div>
                    </div>
                  </div>
                </motion.div>

                <DaymarkCharacter
                  character="marky"
                  pose="celebrate"
                  size="sm"
                  animation="float"
                  className="absolute -bottom-5 -right-1 z-20"
                />
              </div>
            </Link>
          ) : (
            <div className="mx-1">
              <EmptyPastGiftState />
              <p className="text-center text-xs text-muted-foreground mt-3">Today is still being written.</p>
              <Link href="/wrap" className="block mx-auto w-fit mt-2">
                <div className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(104,71,245,0.2)]">
                  Keep today
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* ── 3. Important Today ───────────────────────────────────── */}
        <ImportantTodaySection />

        {/* ── 3. Daylinks ✨ ────────────────────────────────────────── */}
        {daylinks.length > 0 && (
          <section className="mt-10">
            <div className="px-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 12" className="w-4 h-4" fill="none">
                  <path d="M2 6 C2 3 5 1 8 3 L10 6 L12 9 C15 11 18 9 18 6" stroke="#6847F5" strokeWidth="2.2" strokeLinecap="round"/>
                  <path d="M18 6 C18 3 15 1 12 3 L10 6 L8 9 C5 11 2 9 2 6" stroke="#FF719D" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">Your Daylinks ✨</span>
              </div>
              <Link href="/connections" className="text-xs font-bold text-primary">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {daylinks.map((d) => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Link href="/connections"><DaylinkCard streak={d} /></Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Today's Little Question ───────────────────────────── */}
        {todayPrompt?.prompt && !promptAnswered && (
          <section className="mt-10">
            <DailyQuestionCard
              prompt={todayPrompt.prompt}
              onAnswered={() => setPromptAnswered(true)}
            />
          </section>
        )}

        {/* ── 5. Capture Today ─────────────────────────────────────── */}
        <section className="mt-10 px-5">
          {sectionLabel("Capture Today")}
          <CaptureButtons />
        </section>

        {/* ── 6. Moment From Somewhere ─────────────────────────────── */}
        {globePreview && (
          <section className="mt-10">
            {sectionLabel("Moment From Somewhere")}
            <GlobePreviewCard memory={globePreview} />
          </section>
        )}

        {/* ── 7. Coming Up ─────────────────────────────────────────── */}
        <section className="mt-10">
          {sectionLabel("Coming Up")}

          {isSummaryError ? (
            <DmErrorState message="Could not load today's events." onRetry={refetchSummary} />
          ) : loadingSummary ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="snap-start shrink-0 pt-4">
                  <div className="w-[88px] h-[90px] bg-muted rounded-2xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : summary?.upcomingEvents && summary.upcomingEvents.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {summary.upcomingEvents.map((event, i) => (
                <EventTag key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="px-5">
              <p className="text-sm text-muted-foreground font-medium italic">Nothing special on the horizon yet. 🗓</p>
            </div>
          )}
        </section>

        {/* ── 8. Your People ───────────────────────────────────────── */}
        <section className="mt-10 mb-6">
          <div className="px-5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">Your People</span>
              <span className="text-sm">❤️</span>
            </div>
            <Link href="/people" className="text-xs font-bold text-primary">See all</Link>
          </div>

          {isPeopleError ? (
            <DmErrorState message="Could not load your people." onRetry={refetchPeople} />
          ) : loadingPeople ? (
            <div className="flex gap-5 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="snap-start shrink-0 flex flex-col items-center gap-2">
                  <div className="w-[62px] h-[62px] rounded-full bg-muted animate-pulse border-2 border-white shadow-sm" />
                  <div className="h-2.5 w-10 bg-muted animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : people && people.length > 0 ? (
            <div className="flex gap-5 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {people.map((person, i) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="snap-start shrink-0"
                  style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
                >
                  <Link href={`/people/${person.id}`}>
                    <div className="flex flex-col items-center gap-1.5 w-[68px]">
                      <div className="bg-white p-1.5 shadow-md rounded-full border border-white/50">
                        <div className="w-[54px] h-[54px] rounded-full bg-[#EAE3FF] flex items-center justify-center overflow-hidden">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-primary text-xl">{person.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-center w-full truncate">{person.name}</span>
                      {person.memoriesCount != null && (
                        <span className="text-[10px] text-muted-foreground font-semibold -mt-1">
                          {person.memoriesCount} moment{person.memoriesCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
              <div className="snap-start shrink-0">
                <Link href="/people">
                  <div className="flex flex-col items-center gap-1.5 w-[68px]">
                    <div className="bg-white p-1.5 shadow-sm rounded-full border border-dashed border-border">
                      <div className="w-[54px] h-[54px] rounded-full bg-background flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground">Add</span>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-5 py-6 flex flex-col items-center justify-center bg-white border border-border rounded-2xl text-center shadow-sm">
              <p className="text-sm font-bold text-foreground mb-1">Every shared story starts with one little moment.</p>
              <p className="text-xs text-muted-foreground mb-3">Find someone you want to remember life with.</p>
              <Link href="/people" className="text-sm font-bold text-primary flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add someone special
              </Link>
            </div>
          )}
        </section>
      </main>

      <NotificationsDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
}

// ── Important Today section ───────────────────────────────────────────────
interface UpcomingEvent {
  id: number; type: string; title: string; eventMonth: number; eventDay: number;
  nextDate: string; daysUntil: number;
}

function ImportantTodaySection() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [capsuleReady, setCapsuleReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/relationship-events/upcoming?days=1", { credentials: "include" })
        .then((r) => r.ok ? r.json() : { events: [] })
        .then((d) => setEvents((d.events ?? []).filter((e: UpcomingEvent) => e.daysUntil <= 1))),
      (new Date().getDate() <= 7
        ? fetch("/api/capsule/latest", { credentials: "include" })
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (d?.capsule && !d.capsule.openedAt) setCapsuleReady(true); })
        : Promise.resolve()),
    ]).finally(() => setLoaded(true));
  }, []);

  const hasContent = events.length > 0 || capsuleReady;
  if (!loaded || !hasContent) return null;

  const EVENT_EMOJI: Record<string, string> = {
    birthday: "🎂", anniversary: "💍", friendship_anniversary: "💜",
    graduation: "🎓", custom: "✨",
  };

  return (
    <section className="mt-8 px-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-extrabold tracking-[0.12em] text-primary uppercase">Important Today</span>
        <div className="flex-1 h-px bg-primary/20" />
      </div>
      <div className="space-y-3">
        {events.map((ev) => (
          <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-white rounded-2xl border border-primary/20 shadow-sm px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAE3FF] flex items-center justify-center text-xl flex-shrink-0">
              {EVENT_EMOJI[ev.type] ?? "📅"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">{ev.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ev.daysUntil === 0 ? "Today 🎉" : "Tomorrow"}
              </p>
            </div>
            {ev.type === "birthday" && (
              <Link href="/messages">
                <button className="text-xs bg-primary text-white font-bold px-3 py-1.5 rounded-full active:scale-95">
                  Write a wish
                </button>
              </Link>
            )}
          </motion.div>
        ))}
        {capsuleReady && (
          <Link href="/capsule">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-gradient-to-r from-[#EAE3FF] to-[#FFF9F5] rounded-2xl border border-primary/20 shadow-sm px-4 py-3 active:scale-[0.98] transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-xl flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Your memory capsule is ready 🎁</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last month wrapped up. Tap to open.</p>
              </div>
              <span className="text-primary text-lg">→</span>
            </motion.div>
          </Link>
        )}
      </div>
    </section>
  );
}

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z"
      fill="currentColor"
    />
  </svg>
);
