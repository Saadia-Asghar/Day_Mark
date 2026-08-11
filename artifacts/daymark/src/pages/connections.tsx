import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, UserPlus, Check, X, Users, Share2, QrCode } from "lucide-react";
import { useAppAuth } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface SearchUser {
  id: string;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  connectionStatus: string | null;
  connectionId: number | null;
}

interface Connection {
  id: number;
  requesterUserId: string;
  recipientUserId: string;
  status: string;
  acceptedAt: string | null;
  otherUser: { id: string; firstName: string | null; lastName: string | null; displayName: string | null; username: string | null; profileImageUrl: string | null } | null;
}

function Avatar({ user, size = 52 }: { user: { firstName?: string | null; displayName?: string | null; profileImageUrl?: string | null; username?: string | null }; size?: number }) {
  const initials = ((user.displayName ?? user.firstName ?? user.username ?? "?")[0] ?? "?").toUpperCase();
  return user.profileImageUrl ? (
    <img src={user.profileImageUrl} alt="" className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[#EAE3FF] flex items-center justify-center flex-shrink-0 font-bold text-primary border-2 border-white shadow-sm" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function dn(u?: { displayName?: string | null; firstName?: string | null; lastName?: string | null; username?: string | null } | null) {
  if (!u) return "Daymark user";
  return (u.displayName ?? [u.firstName, u.lastName].filter(Boolean).join(" ")) || (u.username ?? "Daymark user");
}

// ── Polaroid portrait card for accepted connections ────────────────────────
function PortraitCard({ conn }: { conn: Connection }) {
  const other = conn.otherUser;
  const since = conn.acceptedAt ? new Date(conn.acceptedAt) : null;
  const monthYear = since ? since.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Polaroid frame */}
      <div className="bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-3 pb-5 relative">
        {/* Tape strip */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 bg-[#EAE3FF]/80 rounded-sm rotate-[-1deg]" />

        {/* Photo / avatar */}
        <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-gradient-to-br from-[#EAE3FF] to-[#FFF9F5] flex items-center justify-center mb-3">
          {other?.profileImageUrl ? (
            <img src={other.profileImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-4xl font-extrabold text-primary/40">
              {((other?.displayName ?? other?.firstName ?? other?.username ?? "?")[0] ?? "?").toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <p className="text-center font-bold text-sm leading-tight truncate">{dn(other)}</p>
        {other?.username && (
          <p className="text-center text-[10px] font-semibold text-primary mt-0.5">@{other.username}</p>
        )}
        {monthYear && (
          <p className="text-center text-[10px] text-muted-foreground mt-1">Friends since {monthYear}</p>
        )}

        {/* Daylink ribbon */}
        <div className="absolute bottom-2 right-2 text-[10px] font-bold text-[#6847F5] bg-[#EAE3FF] px-2 py-0.5 rounded-full">
          Daylink
        </div>
      </div>
    </motion.div>
  );
}

// ── Invitation card for pending requests ──────────────────────────────────
function InvitationCard({ conn, onAccept, onDecline, accepting }: {
  conn: Connection & { requester: SearchUser | null };
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative bg-[#FDFBF7] border border-[#E8D9C5] rounded-2xl shadow-sm overflow-hidden"
      style={{ background: "linear-gradient(135deg,#FDFBF7 0%,#FFF4E6 100%)" }}
    >
      {/* Envelope-flap top */}
      <div className="h-2 bg-gradient-to-r from-[#E8D9C5] to-[#F5E6CF]" />

      <div className="p-4 flex items-start gap-3">
        <Avatar user={conn.requester ?? {}} size={48} />
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm">{dn(conn.requester)}</p>
          {conn.requester?.username && (
            <p className="text-[11px] text-primary font-semibold">@{conn.requester.username}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1 italic" style={{ fontFamily: "Georgia, serif" }}>
            "I'd love to connect on Daymark"
          </p>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onAccept}
          disabled={accepting}
          className="flex-1 h-9 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Accept
        </button>
        <button
          onClick={onDecline}
          disabled={accepting}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ConnectionsPage() {
  const { user } = useAppAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<(Connection & { requester: SearchUser | null })[]>([]);
  const [tab, setTab] = useState<"connections" | "search" | "pending">("connections");
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<number>>(new Set());

  useEffect(() => { loadConnections(); loadPending(); }, []);

  async function loadConnections() {
    try {
      const res = await fetch("/api/connections", { credentials: "include" });
      if (res.ok) setConnections((await res.json()).connections ?? []);
    } catch { /* silent */ }
  }

  async function loadPending() {
    try {
      const res = await fetch("/api/connections/pending", { credentials: "include" });
      if (res.ok) setPending((await res.json()).pending ?? []);
    } catch { /* silent */ }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) setSearchResults((await res.json()).users ?? []);
    } catch { /* silent */ }
    setSearching(false);
  }

  async function sendRequest(userId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ recipientUserId: userId }),
      });
      if (res.ok) {
        toast({ title: "Connection request sent" });
        setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, connectionStatus: "pending" } : u));
      } else {
        const err = await res.json();
        toast({ title: err.error ?? "Couldn't send request", variant: "destructive" });
      }
    } catch { toast({ title: "Something went wrong", variant: "destructive" }); }
    setLoading(false);
  }

  async function acceptRequest(connId: number) {
    setPendingActions((s) => new Set(s).add(connId));
    try {
      const res = await fetch(`/api/connections/${connId}/accept`, { method: "PATCH", credentials: "include" });
      if (res.ok) { toast({ title: "Connected!" }); setPending((prev) => prev.filter((p) => p.id !== connId)); loadConnections(); }
    } catch { /* silent */ }
    setPendingActions((s) => { const n = new Set(s); n.delete(connId); return n; });
  }

  async function declineRequest(connId: number) {
    setPendingActions((s) => new Set(s).add(connId));
    try { await fetch(`/api/connections/${connId}/decline`, { method: "PATCH", credentials: "include" }); setPending((prev) => prev.filter((p) => p.id !== connId)); }
    catch { /* silent */ }
    setPendingActions((s) => { const n = new Set(s); n.delete(connId); return n; });
  }

  async function handleInvite() {
    try {
      const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) });
      if (res.ok) {
        const data = await res.json();
        if (navigator.share) {
          await navigator.share({ title: "Join me on Daymark", text: "I'm saving little memories on Daymark — come join me!", url: data.url });
        } else {
          await navigator.clipboard.writeText(data.url);
          toast({ title: "Invite link copied ✓" });
        }
      }
    } catch { /* cancelled */ }
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/people" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button onClick={handleInvite} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#EAE3FF] flex items-center justify-center active:scale-95">
          <Share2 className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-xl font-extrabold text-center">Your People on Daymark</h1>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-muted/60 rounded-full p-1">
          {(["connections", "search", "pending"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-1.5 text-xs font-bold capitalize transition-all ${tab === t ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>
              {t === "pending" && pending.length > 0 ? `Pending (${pending.length})` : t === "search" ? "Find Friend" : t === "connections" ? "Friends" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* ── Search tab ─────────────────────────────────────────────────── */}
        {tab === "search" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by @username..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-full text-sm outline-none focus:border-primary"
              />
            </div>
            {searching && <p className="text-center text-sm text-muted-foreground">Searching...</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No one found for <strong>@{searchQuery}</strong></p>
                <p className="text-xs text-muted-foreground mt-2">They may have discovery turned off.</p>
              </div>
            )}
            <div className="space-y-3">
              {searchResults.map((u) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3">
                  <Avatar user={u} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{dn(u)}</p>
                    {u.username && <p className="text-xs text-primary font-semibold">@{u.username}</p>}
                  </div>
                  {u.connectionStatus === "accepted" ? (
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">Friends</span>
                  ) : u.connectionStatus === "pending" ? (
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">Pending</span>
                  ) : (
                    <button onClick={() => sendRequest(u.id)} disabled={loading} className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all">
                      <UserPlus className="w-3 h-3" /> Connect
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            {searchQuery.length < 2 && (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted/40 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Find friends on Daymark</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Search by @username to find people you know.</p>
                <button onClick={handleInvite} className="mt-4 flex items-center gap-2 bg-[#EAE3FF] text-primary text-sm font-bold px-5 py-2.5 rounded-full mx-auto active:scale-95">
                  <Share2 className="w-4 h-4" /> Invite Friends
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Pending tab ─────────────────────────────────────────────────── */}
        {tab === "pending" && (
          <AnimatePresence>
            {pending.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-medium">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">Invitations from others will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((req) => (
                  <InvitationCard
                    key={req.id}
                    conn={req}
                    onAccept={() => acceptRequest(req.id)}
                    onDecline={() => declineRequest(req.id)}
                    accepting={pendingActions.has(req.id)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}

        {/* ── Connections tab — Polaroid grid ──────────────────────────────── */}
        {tab === "connections" && (
          <div>
            {connections.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted/40 mx-auto mb-4" />
                <p className="font-bold text-foreground">The best stories start with someone.</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[220px] mx-auto">Find a friend on Daymark to share memories and build your Daylink.</p>
                <button onClick={() => setTab("search")} className="mt-4 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full active:scale-95">
                  Find a friend
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {connections.map((c) => (
                  <PortraitCard key={c.id} conn={c} />
                ))}
              </div>
            )}

            {/* Invite friends CTA */}
            {connections.length > 0 && (
              <button
                onClick={handleInvite}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-primary/30 rounded-2xl text-sm font-bold text-primary active:scale-[0.98] transition-all"
              >
                <Share2 className="w-4 h-4" /> Invite more friends
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
