import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Clock, Inbox, Edit2, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface OtherUser {
  id: string;
  firstName: string | null;
  displayName: string | null;
  username: string | null;
  profileImageUrl: string | null;
}

interface ScheduledMessage {
  id: number;
  title: string | null;
  message: string;
  occasionType: string;
  deliveryTimestamp: string;
  status: string;
  sentAt: string | null;
  otherUser: OtherUser | null;
}

interface MessagesData {
  received: ScheduledMessage[];
  scheduled: ScheduledMessage[];
  sent: ScheduledMessage[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const OCCASION_EMOJI: Record<string, string> = {
  birthday: "🎂",
  anniversary: "💍",
  graduation: "🎓",
  good_luck: "🍀",
  just_because: "💜",
  custom: "✨",
};

function Avatar({ user, size = 40 }: { user: OtherUser | null; size?: number }) {
  const initials = ((user?.displayName ?? user?.firstName ?? user?.username ?? "?")[0] ?? "?").toUpperCase();
  return user?.profileImageUrl ? (
    <img src={user.profileImageUrl} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[#EAE3FF] flex items-center justify-center flex-shrink-0 font-bold text-primary" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function displayName(u: OtherUser | null) {
  return u?.displayName ?? u?.firstName ?? u?.username ?? "Someone";
}

function Countdown({ to }: { to: string }) {
  const days = differenceInDays(new Date(to), new Date());
  if (days <= 0) return <span className="text-orange-500 font-bold">Today</span>;
  if (days === 1) return <span className="text-primary font-bold">Tomorrow</span>;
  return <span className="text-muted-foreground font-medium">{days} days</span>;
}

// ── Message Card components ────────────────────────────────────────────────

function ReceivedCard({ msg }: { msg: ScheduledMessage }) {
  const [open, setOpen] = useState(false);
  const emoji = OCCASION_EMOJI[msg.occasionType] ?? "💜";

  return (
    <motion.div
      layout
      onClick={() => setOpen(!open)}
      className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Envelope / sealed look when closed */}
      <div className="p-4 flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Avatar user={msg.otherUser} />
          <span className="absolute -bottom-1 -right-1 text-base leading-none">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm truncate">{displayName(msg.otherUser)}</p>
            <p className="text-[10px] text-muted-foreground shrink-0">
              {msg.sentAt ? formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true }) : ""}
            </p>
          </div>
          {msg.title && <p className="text-xs font-semibold text-primary mt-0.5">{msg.title}</p>}
          {!open && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{msg.message}</p>}
        </div>
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border/50 bg-[#FFF9F5] px-4 py-4"
        >
          <p className="text-sm leading-relaxed text-foreground">{msg.message}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function ScheduledCard({ msg, onCancel }: { msg: ScheduledMessage; onCancel: (id: number) => void }) {
  const emoji = OCCASION_EMOJI[msg.occasionType] ?? "💜";

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-start gap-3">
      <div className="relative flex-shrink-0">
        <Avatar user={msg.otherUser} />
        <span className="absolute -bottom-1 -right-1 text-base leading-none">{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">For {displayName(msg.otherUser)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(msg.deliveryTimestamp), "MMM d, yyyy 'at' h:mm a")}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="w-3 h-3 text-primary" />
          <Countdown to={msg.deliveryTimestamp} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{msg.message}</p>
      </div>
      <button onClick={() => onCancel(msg.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-95">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"received" | "scheduled" | "sent">("received");
  const [data, setData] = useState<MessagesData>({ received: [], scheduled: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

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
      if (res.ok) {
        toast({ title: "Message cancelled" });
        setData((d) => ({ ...d, scheduled: d.scheduled.filter((m) => m.id !== id) }));
      }
    } catch {
      toast({ title: "Couldn't cancel message", variant: "destructive" });
    }
  }

  const tabs = [
    { id: "received" as const, label: "Received", icon: Inbox, count: data.received.length },
    { id: "scheduled" as const, label: "Scheduled", icon: Clock, count: data.scheduled.length },
    { id: "sent" as const, label: "Sent", icon: Send, count: data.sent.length },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/home" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-center">Messages for Later</h1>
        <p className="text-xs text-center text-muted-foreground mt-0.5">Words that arrive when they matter most.</p>

        {/* Tabs */}
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

      <div className="px-5 pt-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}

        {!loading && tab === "received" && (
          data.received.length === 0 ? (
            <div className="text-center py-16">
              <Inbox className="w-12 h-12 text-muted/40 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nothing is waiting yet.</p>
              <p className="text-xs text-muted-foreground mt-2">Messages from your people will arrive here on the right day.</p>
            </div>
          ) : data.received.map((m) => <ReceivedCard key={m.id} msg={m} />)
        )}

        {!loading && tab === "scheduled" && (
          data.scheduled.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted/40 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nothing scheduled yet.</p>
              <p className="text-xs text-muted-foreground mt-2">Write something for someone. They'll receive it exactly when you choose.</p>
              <Link href="/people" className="mt-4 inline-block bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full">
                Go to My People
              </Link>
            </div>
          ) : data.scheduled.map((m) => <ScheduledCard key={m.id} msg={m} onCancel={cancelMessage} />)
        )}

        {!loading && tab === "sent" && (
          data.sent.length === 0 ? (
            <div className="text-center py-16">
              <Send className="w-12 h-12 text-muted/40 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nothing sent yet.</p>
            </div>
          ) : data.sent.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-start gap-3">
              <Avatar user={m.otherUser} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">To {displayName(m.otherUser)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Delivered {m.sentAt ? format(new Date(m.sentAt), "MMM d, yyyy") : ""}</p>
                {m.title && <p className="text-xs font-semibold text-primary mt-0.5">{m.title}</p>}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.message}</p>
              </div>
              <span className="text-[10px] text-green-600 bg-green-50 font-bold px-2 py-1 rounded-full">Sent ✓</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
