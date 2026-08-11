import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useGetPerson } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Gift, Mail, X, ImageIcon, StickyNote, Loader2, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { TapeStrip, DateStamp, RibbonDivider, GiftTag } from "@/components/scrapbook";
import { useToast } from "@/hooks/use-toast";

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

// ── Memory Drop compose sheet ──────────────────────────────────────────────

interface MemoryDrop {
  id: number;
  note: string | null;
  photoUrl: string | null;
  status: string;
  reaction: string | null;
  createdAt: string;
  sender: { id: string; firstName: string | null; displayName: string | null; username: string | null; profileImageUrl: string | null } | null;
}

function DropComposeSheet({
  recipientUserId,
  recipientName,
  onClose,
  onSent,
}: {
  recipientUserId: string;
  recipientName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<"note" | "photo">("note");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (type === "note" && !note.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientUserId, note: note.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ title: d.error ?? "Couldn't send", variant: "destructive" });
      } else {
        toast({ title: `Moment dropped to ${recipientName} 💜` });
        onSent();
        onClose();
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setSending(false);
  }

  return (
    <>
      <motion.div
        key="drop-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="drop-sheet"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="font-extrabold text-base">Drop a little moment 💌</h2>
            <p className="text-xs text-muted-foreground mt-0.5">For {recipientName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("note")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${type === "note" ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground"}`}
            >
              <StickyNote className="w-4 h-4" /> Short note
            </button>
            <button
              onClick={() => setType("photo")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${type === "photo" ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground"}`}
            >
              <ImageIcon className="w-4 h-4" /> Photo
            </button>
          </div>

          {type === "note" && (
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A little thought, an inside joke, a tiny memory…"
              rows={4}
              maxLength={500}
              className="w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          )}

          {type === "photo" && (
            <div className="bg-white border-2 border-dashed border-border rounded-2xl h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
              <p className="text-xs font-medium">Photo drops coming soon 📸</p>
            </div>
          )}

          <button
            onClick={send}
            disabled={sending || (type === "note" && !note.trim())}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(104,71,245,0.25)] disabled:opacity-50 transition-all"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>💌 Drop it</>}
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Not a chat. One little moment at a time.
          </p>
        </div>
      </motion.div>
    </>
  );
}

// ── Received drop card ────────────────────────────────────────────────────

function ReceivedDropCard({ drop, onReact }: { drop: MemoryDrop; onReact: (id: number, r: string) => void }) {
  const [opened, setOpened] = useState(drop.status !== "delivered");
  const REACTIONS = ["💜", "✨", "🥹", "😂"];

  const handleOpen = async () => {
    if (opened) return;
    setOpened(true);
    await fetch(`/api/drops/${drop.id}/open`, { method: "PATCH", credentials: "include" });
  };

  return (
    <motion.div
      layout
      onClick={handleOpen}
      className={`rounded-2xl border shadow-sm overflow-hidden cursor-pointer transition-all ${opened ? "bg-white border-border" : "bg-[#EAE3FF]/40 border-primary/20"}`}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Sealed envelope icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${opened ? "bg-muted" : "bg-primary"}`}>
          <Mail className={`w-5 h-5 ${opened ? "text-muted-foreground" : "text-white"}`} />
        </div>
        <div className="flex-1 min-w-0">
          {!opened ? (
            <p className="text-sm font-bold">Tap to open 💜</p>
          ) : (
            <>
              {drop.note && <p className="text-sm font-medium leading-snug line-clamp-2">{drop.note}</p>}
            </>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(drop.createdAt), { addSuffix: true })}
          </p>
        </div>
        {opened && !drop.reaction && (
          <div className="flex gap-1">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={(e) => { e.stopPropagation(); onReact(drop.id, r); }}
                className="text-lg leading-none active:scale-125 transition-transform"
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {drop.reaction && <span className="text-2xl">{drop.reaction}</span>}
      </div>
    </motion.div>
  );
}

export default function PersonDetailPage() {
  const [, params] = useRoute("/people/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dropSheetOpen, setDropSheetOpen] = useState(false);
  const [drops, setDrops] = useState<MemoryDrop[]>([]);
  const [dropsLoaded, setDropsLoaded] = useState(false);
  const [events, setEvents] = useState<Array<{ id: number; type: string; title: string; eventMonth: number; eventDay: number; daysUntil?: number; nextDate?: string }>>([]);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEventType, setNewEventType] = useState("birthday");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMonth, setNewEventMonth] = useState(new Date().getMonth() + 1);
  const [newEventDay, setNewEventDay] = useState(new Date().getDate());
  const [savingEvent, setSavingEvent] = useState(false);

  // ── Birthday wish wall ─────────────────────────────────────────────────
  interface BirthdayWish { id: number; senderUserId: string; senderName?: string; senderAvatar?: string; wishText?: string; type: string; createdAt: string; }
  const [wishes, setWishes] = useState<BirthdayWish[]>([]);
  const [wishText, setWishText] = useState("");
  const [sendingWish, setSendingWish] = useState(false);
  const [wishesLoaded, setWishesLoaded] = useState(false);

  const { data: person, isLoading, isError, refetch } = useGetPerson(id || 0);

  // Load relationship events for this person
  useEffect(() => {
    fetch("/api/relationship-events", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => {
        const personEvents = (d.events ?? []).filter((e: { personId?: number | null }) => e.personId === id);
        const now = new Date();
        const enriched = personEvents.map((ev: { id: number; type: string; title: string; eventMonth: number; eventDay: number }) => {
          const thisYear = now.getFullYear();
          let next = new Date(thisYear, ev.eventMonth - 1, ev.eventDay);
          if (next < now) next = new Date(thisYear + 1, ev.eventMonth - 1, ev.eventDay);
          const daysUntil = Math.ceil((next.getTime() - now.setHours(0,0,0,0)) / 86_400_000);
          now.setTime(Date.now());
          return { ...ev, nextDate: next.toISOString().split("T")[0], daysUntil };
        });
        setEvents(enriched.sort((a: { daysUntil: number }, b: { daysUntil: number }) => a.daysUntil - b.daysUntil));
      })
      .catch(() => {});
  }, [id]);

  // Load birthday wishes when linked user has a birthday today
  useEffect(() => {
    if (!person?.linkedUserId) return;
    const hasBirthdayToday = events.some((ev) => ev.type === "birthday" && ev.daysUntil === 0);
    if (!hasBirthdayToday) return;
    fetch(`/api/birthday-wishes/${person.linkedUserId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { wishes: [] })
      .then((d) => { setWishes(d.wishes ?? []); setWishesLoaded(true); })
      .catch(() => setWishesLoaded(true));
  }, [person?.linkedUserId, events]);

  const sendBirthdayWish = async () => {
    if (!person?.linkedUserId || !wishText.trim()) return;
    setSendingWish(true);
    try {
      const res = await fetch("/api/birthday-wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientUserId: person.linkedUserId, wishText: wishText.trim(), type: "text" }),
      });
      if (res.ok) {
        const data = await res.json();
        setWishes((prev) => [data.wish, ...prev]);
        setWishText("");
        toast({ title: `Birthday wish sent to ${person.name} 🎂` });
      }
    } catch { /* ignore */ }
    setSendingWish(false);
  };

  // Load drops from/to this person
  useEffect(() => {
    fetch("/api/drops", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { drops: [] })
      .then((d) => {
        // Show drops where person is the sender (drops I received from them)
        setDrops((d.drops ?? []).filter((dr: MemoryDrop) =>
          person?.linkedUserId && dr.sender?.id === person.linkedUserId
        ));
        setDropsLoaded(true);
      })
      .catch(() => setDropsLoaded(true));
  }, [person?.linkedUserId]);

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
          <div className="mb-4">
            <DaylinkCard personUserId={person.linkedUserId} />
          </div>
        )}

        {/* ── Birthday Wish Wall ───────────────────────────────── */}
        {person.linkedUserId && events.some((ev) => ev.type === "birthday" && ev.daysUntil === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-br from-[#EAE3FF] to-[#FFF9F5] rounded-3xl border border-primary/20 overflow-hidden shadow-sm"
          >
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎂</span>
                <div>
                  <p className="font-extrabold text-sm text-foreground">It's {person.name}'s birthday!</p>
                  <p className="text-xs text-muted-foreground">Send a birthday wish</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wishText}
                  onChange={(e) => setWishText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendBirthdayWish()}
                  placeholder="Write something meaningful… 💜"
                  className="flex-1 bg-white border border-border/60 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={sendBirthdayWish}
                  disabled={sendingWish || !wishText.trim()}
                  className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0 self-center"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
            {wishesLoaded && wishes.length > 0 && (
              <div className="px-5 pb-5 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/70 mb-1">Wishes sent today</p>
                {wishes.slice(0, 5).map((w) => (
                  <div key={w.id} className="flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">
                        {(w.senderName ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{w.senderName ?? "Someone"}</p>
                      {w.wishText && <p className="text-xs text-muted-foreground mt-0.5">{w.wishText}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Drop a Moment ────────────────────────────────────── */}
        {person.linkedUserId && (
          <div className="mb-6 space-y-3">
            <button
              onClick={() => setDropSheetOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#EAE3FF] text-primary rounded-2xl font-bold text-sm border border-primary/20 active:scale-[0.98] transition-all shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Drop a little moment 💌
            </button>

            {/* Received drops from this person */}
            {dropsLoaded && drops.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">From {person.name}</p>
                {drops.slice(0, 3).map((drop) => (
                  <ReceivedDropCard
                    key={drop.id}
                    drop={drop}
                    onReact={async (id, reaction) => {
                      await fetch(`/api/drops/${id}/react`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ reaction }),
                      });
                      setDrops((prev) => prev.map((d) => d.id === id ? { ...d, reaction, status: "reacted" } : d));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Upcoming Events ──────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Important Dates</p>
            <button
              onClick={() => setAddingEvent(true)}
              className="flex items-center gap-1 text-xs font-bold text-primary active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {events.length === 0 && !addingEvent && (
            <button
              onClick={() => setAddingEvent(true)}
              className="w-full py-3 border border-dashed border-border/60 rounded-2xl text-xs text-muted-foreground font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              🎂 Add a birthday, anniversary, or special date
            </button>
          )}

          {events.length > 0 && (
            <div className="space-y-2">
              {events.map((ev) => {
                const EVENT_EMOJI: Record<string, string> = { birthday: "🎂", anniversary: "💍", friendship_anniversary: "💜", graduation: "🎓", custom: "✨" };
                const daysUntil = ev.daysUntil ?? 0;
                return (
                  <div key={ev.id} className="flex items-center gap-3 bg-white rounded-xl border border-border/60 px-3 py-2.5">
                    <span className="text-xl">{EVENT_EMOJI[ev.type] ?? "📅"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ev.nextDate ? new Date(ev.nextDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        {" · "}
                        {daysUntil === 0 ? "Today 🎉" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add event form */}
          {addingEvent && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 bg-white rounded-2xl border border-primary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">Add an important date</p>
                <button onClick={() => setAddingEvent(false)} className="text-muted-foreground active:scale-95">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <select
                value={newEventType}
                onChange={(e) => {
                  setNewEventType(e.target.value);
                  if (!newEventTitle) {
                    const defaultTitles: Record<string, string> = { birthday: `${person.name}'s Birthday`, anniversary: "Anniversary", friendship_anniversary: "Friendiversary", graduation: "Graduation" };
                    setNewEventTitle(defaultTitles[e.target.value] ?? "");
                  }
                }}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary"
              >
                <option value="birthday">🎂 Birthday</option>
                <option value="anniversary">💍 Anniversary</option>
                <option value="friendship_anniversary">💜 Friendiversary</option>
                <option value="graduation">🎓 Graduation</option>
                <option value="custom">✨ Custom</option>
              </select>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event name"
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <select
                  value={newEventMonth}
                  onChange={(e) => setNewEventMonth(Number(e.target.value))}
                  className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={newEventDay}
                  onChange={(e) => setNewEventDay(Number(e.target.value))}
                  className="w-24 bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button
                disabled={savingEvent || !newEventTitle.trim()}
                onClick={async () => {
                  if (!newEventTitle.trim()) return;
                  setSavingEvent(true);
                  try {
                    const res = await fetch("/api/relationship-events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ personId: id, type: newEventType, title: newEventTitle.trim(), eventMonth: newEventMonth, eventDay: newEventDay }),
                    });
                    if (res.ok) {
                      const d = await res.json();
                      const now = new Date();
                      const thisYear = now.getFullYear();
                      let next = new Date(thisYear, d.event.eventMonth - 1, d.event.eventDay);
                      if (next < now) next = new Date(thisYear + 1, d.event.eventMonth - 1, d.event.eventDay);
                      const daysUntil = Math.ceil((next.getTime() - now.setHours(0,0,0,0)) / 86_400_000);
                      now.setTime(Date.now());
                      setEvents((prev) => [...prev, { ...d.event, daysUntil, nextDate: next.toISOString().split("T")[0] }].sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0)));
                      setAddingEvent(false);
                      setNewEventTitle("");
                    }
                  } catch { /* silent */ }
                  setSavingEvent(false);
                }}
                className="w-full h-10 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {savingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save date"}
              </button>
            </motion.div>
          )}
        </div>

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
              ✨ Wrap a memory together
            </button>
          </div>
        )}
      </div>

      {/* ── Memory Drop compose sheet ─────────────────────────────── */}
      <AnimatePresence>
        {dropSheetOpen && person.linkedUserId && (
          <DropComposeSheet
            recipientUserId={person.linkedUserId}
            recipientName={person.name}
            onClose={() => setDropSheetOpen(false)}
            onSent={() => {
              // Optimistically show sent state
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
