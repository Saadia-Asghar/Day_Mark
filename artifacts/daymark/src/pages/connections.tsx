import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, UserPlus, Check, X, Users } from "lucide-react";
import { useAppAuth } from "@/App";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

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
  otherUser: { id: string; firstName: string | null; lastName: string | null; displayName: string | null; username: string | null; profileImageUrl: string | null } | null;
}

// ── Avatar helper ──────────────────────────────────────────────────────────

function Avatar({ user, size = 44 }: { user: { firstName?: string | null; displayName?: string | null; profileImageUrl?: string | null; username?: string | null }; size?: number }) {
  const initials = ((user.displayName ?? user.firstName ?? user.username ?? "?")[0] ?? "?").toUpperCase();
  return user.profileImageUrl ? (
    <img src={user.profileImageUrl} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[#EAE3FF] flex items-center justify-center flex-shrink-0 font-bold text-primary" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    loadConnections();
    loadPending();
  }, []);

  async function loadConnections() {
    try {
      const res = await fetch("/api/connections", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections ?? []);
      }
    } catch { /* silent */ }
  }

  async function loadPending() {
    try {
      const res = await fetch("/api/connections/pending", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending ?? []);
      }
    } catch { /* silent */ }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users ?? []);
      }
    } catch { /* silent */ }
    setSearching(false);
  }

  async function sendRequest(userId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientUserId: userId }),
      });
      if (res.ok) {
        toast({ title: "Connection request sent 💜" });
        setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, connectionStatus: "pending" } : u));
      } else {
        const err = await res.json();
        toast({ title: err.error ?? "Couldn't send request", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setLoading(false);
  }

  async function acceptRequest(connId: number) {
    setPendingActions((s) => new Set(s).add(connId));
    try {
      const res = await fetch(`/api/connections/${connId}/accept`, { method: "PATCH", credentials: "include" });
      if (res.ok) {
        toast({ title: "Connected! 💜" });
        setPending((prev) => prev.filter((p) => p.id !== connId));
        loadConnections();
      }
    } catch { /* silent */ }
    setPendingActions((s) => { const next = new Set(s); next.delete(connId); return next; });
  }

  async function declineRequest(connId: number) {
    setPendingActions((s) => new Set(s).add(connId));
    try {
      await fetch(`/api/connections/${connId}/decline`, { method: "PATCH", credentials: "include" });
      setPending((prev) => prev.filter((p) => p.id !== connId));
    } catch { /* silent */ }
    setPendingActions((s) => { const next = new Set(s); next.delete(connId); return next; });
  }

  const displayName = (u: { displayName?: string | null; firstName?: string | null; lastName?: string | null; username?: string | null }) =>
    (u.displayName ?? [u.firstName, u.lastName].filter(Boolean).join(" ")) || (u.username ?? "Daymark user");

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/people" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-center">Your People on Daymark</h1>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-muted/60 rounded-full p-1">
          {(["connections", "search", "pending"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-1.5 text-xs font-bold capitalize transition-all ${tab === t ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>
              {t === "pending" && pending.length > 0 ? `Pending (${pending.length})` : t === "search" ? "Find Friend" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* ── Search tab ──────────────────────────────────────────────── */}
        {tab === "search" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by @username..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-full text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            {searching && <p className="text-center text-sm text-muted-foreground">Searching...</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No Daymark user found for <strong>@{searchQuery}</strong></p>
                <p className="text-xs text-muted-foreground mt-2">They may have discovery turned off.</p>
              </div>
            )}
            <div className="space-y-3">
              {searchResults.map((u) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{displayName(u)}</p>
                    {u.username && <p className="text-xs text-primary font-semibold">@{u.username}</p>}
                  </div>
                  {u.connectionStatus === "accepted" ? (
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">Connected</span>
                  ) : u.connectionStatus === "pending" ? (
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">Pending</span>
                  ) : (
                    <button onClick={() => sendRequest(u.id)} disabled={loading} className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all">
                      <UserPlus className="w-3 h-3" />
                      Connect
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            {searchQuery.length < 2 && (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Find friends on Daymark</p>
                <p className="text-xs text-muted-foreground mt-1">Search by @username to find and connect with people you know.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Pending tab ─────────────────────────────────────────────── */}
        {tab === "pending" && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-medium">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">Connection requests from others will appear here.</p>
              </div>
            ) : (
              pending.map((req) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3">
                  <Avatar user={req.requester ?? {}} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{displayName(req.requester ?? {})}</p>
                    {req.requester?.username && <p className="text-xs text-primary font-semibold">@{req.requester.username}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">wants to connect on Daymark 💜</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(req.id)} disabled={pendingActions.has(req.id)} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center active:scale-95">
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => declineRequest(req.id)} disabled={pendingActions.has(req.id)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── Connections tab ─────────────────────────────────────────── */}
        {tab === "connections" && (
          <div className="space-y-3">
            {connections.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted/40 mx-auto mb-3" />
                <p className="font-bold text-foreground">The best stories start with someone.</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[220px] mx-auto">Find a friend on Daymark to share memories and build your Daylink.</p>
                <button onClick={() => setTab("search")} className="mt-4 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full active:scale-95">
                  Find a Daymark friend
                </button>
              </div>
            ) : (
              connections.map((c) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3">
                  <Avatar user={c.otherUser ?? {}} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{displayName(c.otherUser ?? {})}</p>
                    {c.otherUser?.username && <p className="text-xs text-primary font-semibold">@{c.otherUser.username}</p>}
                  </div>
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">Connected</span>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
