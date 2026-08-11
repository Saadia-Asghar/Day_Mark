/**
 * Invite Friends page — /invite
 *
 * Create personal invite links and share them via WhatsApp, native share, or copy.
 * Also shows active invites with use counts and revoke option.
 */
import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Copy, Link2, Loader2, Check, X, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppAuth } from "@/App";

interface Invite {
  id: number;
  token: string;
  url: string;
  expiresAt: string | null;
  maxUses: number;
  useCount: number;
  isExpired: boolean;
  isExhausted: boolean;
  createdAt: string;
}

// ── Join page (shown when opened via invite link) ─────────────────────────
function JoinPage({ token }: { token: string }) {
  const [info, setInfo] = useState<{ inviterName: string; inviterAvatar: string | null; inviterUsername: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invites/redeem/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.valid) setInfo(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center px-8 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 max-w-[320px]">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
          <span className="text-3xl font-extrabold text-white">D</span>
        </div>

        <div>
          {info ? (
            <>
              <h1 className="text-2xl font-extrabold">
                {info.inviterName} invited you to Daymark
              </h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Keep the little gifts life gives you — memories, moments, the people who make it worth it.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold">Join Daymark</h1>
              <p className="text-sm text-muted-foreground mt-3">A home for the moments that matter.</p>
            </>
          )}
        </div>

        <Link href="/sign-up">
          <button className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-base shadow-[0_0_24px_rgba(104,71,245,0.3)] active:scale-95 transition-all">
            {info ? `Connect with ${info.inviterName.split(" ")[0]}` : "Create your account"}
          </button>
        </Link>

        <p className="text-xs text-muted-foreground">
          Already have an account? <Link href="/sign-in" className="text-primary font-bold">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

// ── Invite creation page ──────────────────────────────────────────────────
export default function InvitePage() {
  const [, joinParams] = useRoute("/join/:slug");
  const { toast } = useToast();
  const { user } = useAppAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);

  // If this is a join link (from invite)
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const inviteToken = urlParams.get("invite");
  if (inviteToken) return <JoinPage token={inviteToken} />;

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    try {
      const res = await fetch("/api/invites", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const active = (data.invites ?? []).filter((inv: Invite) => !inv.isExpired && !inv.isExhausted);
        setInvites(active);
        if (active.length > 0) setCurrentInvite(active[0]);
      }
    } catch { /* silent */ }
  }

  async function createInvite() {
    setCreating(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ expiryDays: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentInvite(data.invite ? { ...data.invite, url: data.url, isExpired: false, isExhausted: false } : null);
        loadInvites();
      }
    } catch { /* silent */ }
    setCreating(false);
  }

  async function revokeInvite(id: number) {
    try {
      await fetch(`/api/invites/${id}`, { method: "DELETE", credentials: "include" });
      setInvites((prev) => prev.filter((i) => i.id !== id));
      if (currentInvite?.id === id) setCurrentInvite(null);
    } catch { /* silent */ }
  }

  async function handleShare(method: "native" | "whatsapp" | "copy") {
    if (!currentInvite) { await createInvite(); return; }
    const url = currentInvite.url;
    const text = `Come save little memories on Daymark with me — ${url}`;

    switch (method) {
      case "native":
        if (navigator.share) { try { await navigator.share({ title: "Join me on Daymark", text, url }); } catch { /* cancelled */ } }
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        break;
      case "copy":
        try { await navigator.clipboard.writeText(url); toast({ title: "Invite link copied ✓" }); } catch { /* silent */ }
        break;
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-10 overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/connections" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-center">Invite Friends</h1>
        <p className="text-xs text-center text-muted-foreground mt-0.5">Share Daymark with people you love.</p>
      </div>

      <div className="px-5 pt-6 space-y-6">
        {/* Hero card */}
        <div className="bg-gradient-to-br from-primary to-[#9B70FF] rounded-3xl p-6 text-white shadow-[0_8px_32px_rgba(104,71,245,0.3)]">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <div className="w-6 h-6 rounded-full bg-white/60" />
          </div>
          <h2 className="text-xl font-extrabold">Invite someone special</h2>
          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
            The best memories are shared ones. Bring a friend to Daymark.
          </p>
          {!currentInvite && (
            <button
              onClick={createInvite}
              disabled={creating}
              className="mt-4 bg-white text-primary font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Create invite link
            </button>
          )}
        </div>

        {/* Invite link display */}
        {currentInvite && (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 bg-muted/30 rounded-xl px-3 py-2">
                <p className="text-xs text-muted-foreground truncate">{currentInvite.url}</p>
              </div>
              <button
                onClick={() => handleShare("copy")}
                className="w-10 h-10 rounded-xl bg-[#EAE3FF] flex items-center justify-center active:scale-95 flex-shrink-0"
              >
                <Copy className="w-4 h-4 text-primary" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{currentInvite.useCount}/{currentInvite.maxUses} uses · Valid 30 days</p>
          </div>
        )}

        {/* Share buttons */}
        <div className="space-y-3">
          <button onClick={() => handleShare("native")} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/60 shadow-sm active:scale-[0.98] transition-all">
            <div className="w-11 h-11 rounded-xl bg-[#EAE3FF] flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Share</p>
              <p className="text-xs text-muted-foreground">Instagram, Messages, more</p>
            </div>
          </button>

          <button onClick={() => handleShare("whatsapp")} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/60 shadow-sm active:scale-[0.98] transition-all">
            <div className="w-11 h-11 rounded-xl bg-[#dcfce7] flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Send a personal invite</p>
            </div>
          </button>

          <button onClick={() => handleShare("copy")} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/60 shadow-sm active:scale-[0.98] transition-all">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
              <Copy className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Copy Link</p>
              <p className="text-xs text-muted-foreground">Paste anywhere you like</p>
            </div>
          </button>
        </div>

        {/* Active invites */}
        {invites.length > 1 && (
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">Active invites</p>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl border border-border/60 p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate text-muted-foreground">{inv.token.slice(0, 20)}…</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{inv.useCount}/{inv.maxUses} uses</p>
                  </div>
                  <button onClick={() => revokeInvite(inv.id)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center active:scale-95">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
