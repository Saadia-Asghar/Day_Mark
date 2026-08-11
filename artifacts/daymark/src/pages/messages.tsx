import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Inbox, Send, Trash2 } from "lucide-react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OtherUser { id: string; firstName: string | null; displayName: string | null; username: string | null; profileImageUrl: string | null }
interface ScheduledMessage {
  id: number; title: string | null; message: string; occasionType: string;
  deliveryTimestamp: string; status: string; sentAt: string | null; otherUser: OtherUser | null;
}
interface MessagesData { received: ScheduledMessage[]; scheduled: ScheduledMessage[]; sent: ScheduledMessage[] }

const OCCASION_COLOR: Record<string, string> = {
  birthday: "#FF6B9D", anniversary: "#F43F5E", graduation: "#F59E0B", good_luck: "#10B981", just_because: "#6847F5", custom: "#94A3B8",
};

function Avatar({ user, size = 40 }: { user: OtherUser | null; size?: number }) {
  const initials = ((user?.displayName ?? user?.firstName ?? user?.username ?? "?")[0] ?? "?").toUpperCase();
  return user?.profileImageUrl ? (
    <img src={user.profileImageUrl} alt="" className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[#EAE3FF] flex items-center justify-center flex-shrink-0 font-bold text-primary border-2 border-white shadow-sm" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function dname(u: OtherUser | null) { return u?.displayName ?? u?.firstName ?? u?.username ?? "Someone"; }

// ── Sealed envelope card ───────────────────────────────────────────────────
function EnvelopeCard({ msg }: { msg: ScheduledMessage }) {
  const [open, setOpen] = useState(false);
  const dotColor = OCCASION_COLOR[msg.occasionType] ?? "#6847F5";
  const isOpened = open;

  return (
    <motion.div layout onClick={() => setOpen(!open)} className="cursor-pointer">
      {/* Envelope outer */}
      <div className={`relative rounded-2xl overflow-hidden transition-all shadow-sm ${isOpened ? "shadow-md" : ""}`}
        style={{ background: isOpened ? "white" : "linear-gradient(135deg,#FDFBF7 0%,#FFF4E6 100%)", border: "1px solid #E8D9C5" }}>

        {/* Envelope flap */}
        <AnimatePresence>
          {!isOpened && (
            <motion.div
              key="flap"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0, originY: 0 }}
              style={{ transformOrigin: "top" }}
              className="absolute top-0 left-0 right-0 h-10 z-10 pointer-events-none"
            >
              {/* V-shaped flap via clip-path */}
              <div style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(135deg,#F5E6CF,#EDD5B8)", height: "100%" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wax seal */}
        {!isOpened && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-extrabold">D</span>
          </div>
        )}

        <div className="p-4 pt-12 flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar user={msg.otherUser} size={44} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: dotColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold text-sm truncate" style={{ fontFamily: "Georgia, serif" }}>{dname(msg.otherUser)}</p>
              <p className="text-[10px] text-muted-foreground shrink-0">
                {msg.sentAt ? formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true }) : ""}
              </p>
            </div>
            {msg.title && <p className="text-xs font-semibold text-primary mt-0.5">{msg.title}</p>}
            {!isOpened && <p className="text-xs text-muted-foreground mt-1">Tap to open this letter</p>}
          </div>
        </div>

        {/* Opened letter content */}
        {isOpened && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-[#E8D9C5] px-5 py-5"
            style={{ background: "repeating-linear-gradient(transparent,transparent 27px,rgba(104,71,245,0.05) 28px)", lineHeight: "28px" }}
          >
            <p className="text-sm text-foreground leading-7" style={{ fontFamily: "Georgia, serif" }}>{msg.message}</p>
            <p className="text-[10px] text-muted-foreground mt-4 text-right italic">
              — {dname(msg.otherUser)}, {msg.sentAt ? format(new Date(msg.sentAt), "MMMM d, yyyy") : ""}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Postcard card for scheduled messages ──────────────────────────────────
function PostcardCard({ msg, onCancel }: { msg: ScheduledMessage; onCancel: (id: number) => void }) {
  const dotColor = OCCASION_COLOR[msg.occasionType] ?? "#6847F5";
  const days = differenceInDays(new Date(msg.deliveryTimestamp), new Date());

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[#DDD6FF]"
      style={{ background: "linear-gradient(135deg,#FFF9F5 60%,#EAE3FF 100%)" }}>

      {/* Postcard stamp area */}
      <div className="absolute top-3 right-3 w-10 h-12 border-2 border-dashed border-primary/30 rounded-sm flex flex-col items-center justify-center bg-white/60">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-[8px] font-bold text-primary mt-0.5">DAYMARK</span>
      </div>

      {/* Address lines (decorative) */}
      <div className="absolute bottom-3 right-3 space-y-1">
        <div className="w-16 h-0.5 bg-muted/30 rounded" />
        <div className="w-12 h-0.5 bg-muted/30 rounded" />
        <div className="w-14 h-0.5 bg-muted/30 rounded" />
      </div>

      <div className="p-4 pr-16">
        <div className="flex items-center gap-3 mb-2">
          <Avatar user={msg.otherUser} size={40} />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm" style={{ fontFamily: "Georgia, serif" }}>For {dname(msg.otherUser)}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(msg.deliveryTimestamp), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-xs font-bold text-primary">
            {days <= 0 ? "Arriving soon" : days === 1 ? "Arrives tomorrow" : `Arrives in ${days} days`}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{msg.message}</p>

        {/* Horizontal divider */}
        <div className="border-t border-dashed border-muted/40 mt-3 pt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Sealed with care</span>
          <button onClick={() => onCancel(msg.id)} className="flex items-center gap-1 text-[10px] text-red-400 font-medium active:scale-95">
            <Trash2 className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stamped letter for sent messages ──────────────────────────────────────
function SentLetterCard({ msg }: { msg: ScheduledMessage }) {
  const dotColor = OCCASION_COLOR[msg.occasionType] ?? "#6847F5";
  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      {/* Postmark header */}
      <div className="bg-gradient-to-r from-muted/30 to-transparent px-4 py-2.5 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
          <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-widest">Delivered</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {msg.sentAt ? format(new Date(msg.sentAt), "MMM d, yyyy") : ""}
        </span>
      </div>

      <div className="p-4 flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Avatar user={msg.otherUser} size={40} />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: dotColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ fontFamily: "Georgia, serif" }}>
            To {dname(msg.otherUser)}
          </p>
          {msg.title && <p className="text-xs font-semibold text-primary mt-0.5">{msg.title}</p>}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.message}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"received" | "scheduled" | "sent">("received");
  const [data, setData] = useState<MessagesData>({ received: [], scheduled: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMessages(); }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }

  async function cancelMessage(id: number) {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast({ title: "Message cancelled" }); setData((d) => ({ ...d, scheduled: d.scheduled.filter((m) => m.id !== id) })); }
    } catch { toast({ title: "Couldn't cancel message", variant: "destructive" }); }
  }

  const tabs = [
    { id: "received" as const, label: "Letters", icon: Inbox, count: data.received.length },
    { id: "scheduled" as const, label: "Postcards", icon: Clock, count: data.scheduled.length },
    { id: "sent" as const, label: "Sent", icon: Send, count: data.sent.length },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-10 overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/home" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-center">Messages for Later</h1>
        <p className="text-xs text-center text-muted-foreground mt-0.5">Words that arrive when they matter most.</p>

        <div className="flex gap-1 mt-4 bg-muted/60 rounded-full p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1 ${tab === t.id ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>
              <t.icon className="w-3 h-3" />
              {t.label}
              {t.count > 0 && <span className="bg-primary/10 text-primary text-[10px] px-1.5 rounded-full font-bold">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>}

        {!loading && tab === "received" && (
          data.received.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#EAE3FF] flex items-center justify-center mb-4 mx-auto">
                <Inbox className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-foreground">Nothing is waiting yet.</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">Letters from your people will arrive here on the right day.</p>
            </div>
          ) : data.received.map((m) => <EnvelopeCard key={m.id} msg={m} />)
        )}

        {!loading && tab === "scheduled" && (
          data.scheduled.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#EAE3FF] flex items-center justify-center mb-4 mx-auto">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-foreground">No postcards scheduled yet.</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">Write something for someone. They'll receive it when you choose.</p>
              <Link href="/people" className="mt-4 inline-block bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full">Go to My People</Link>
            </div>
          ) : data.scheduled.map((m) => <PostcardCard key={m.id} msg={m} onCancel={cancelMessage} />)
        )}

        {!loading && tab === "sent" && (
          data.sent.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#EAE3FF] flex items-center justify-center mb-4 mx-auto">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-foreground">Nothing sent yet.</p>
            </div>
          ) : data.sent.map((m) => <SentLetterCard key={m.id} msg={m} />)
        )}
      </div>
    </div>
  );
}
