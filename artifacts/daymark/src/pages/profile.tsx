import { useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAppAuth } from "@/App";
import {
  useListMemories, useListPeople, useListFutureGifts,
} from "@workspace/api-client-react";
import { ChevronRight, LogOut, X, Check, Camera, Loader2, Mail, Package, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUpload } from "@workspace/object-storage-web";
import { PENDING_EMAIL_KEY } from "@/pages/auth-callback";

/** Shape stored in localStorage while a user's email change is awaiting confirmation. */
interface PendingEmailChange { email: string; ts: number; }

// ── Edit Profile Sheet ───────────────────────────────────────────────────
function EditProfileSheet({ open, onClose, dbUser }: {
  open: boolean;
  onClose: () => void;
  dbUser: any;
}) {
  const { user: appUser } = useAppAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(appUser?.firstName ?? "");
  const [lastName, setLastName] = useState(appUser?.lastName ?? "");
  const [username, setUsername] = useState(dbUser?.username ?? "");
  const [bio, setBio] = useState(dbUser?.bio ?? "");
  const [city, setCity] = useState(dbUser?.city ?? "");
  const [birthday, setBirthday] = useState(dbUser?.birthday ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoObjectPath, setPhotoObjectPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Email update state ────────────────────────────────────────────────────
  const [showEmailUpdate, setShowEmailUpdate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setPhotoObjectPath(response.objectPath);
    },
  });

  // Reset fields when sheet opens
  useEffect(() => {
    if (open) {
      setFirstName(appUser?.firstName ?? "");
      setLastName(appUser?.lastName ?? "");
      setUsername(dbUser?.username ?? "");
      setBio(dbUser?.bio ?? "");
      setCity(dbUser?.city ?? "");
      setBirthday(dbUser?.birthday ?? "");
    }
  }, [open]);

  const usernameValid = !username || /^[a-z0-9_]{3,24}$/.test(username);

  const handleSave = async () => {
    if (!usernameValid) {
      toast({ title: "Invalid username", description: "3-24 chars, letters/numbers/underscores only", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Update DB profile (firstName, lastName, username, bio, city, birthday, profileImageUrl)
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName || null,
          lastName: lastName || null,
          ...(username ? { username } : {}),
          bio: bio || null,
          city: city || null,
          birthday: birthday || null,
          ...(photoObjectPath ? { profileImageUrl: `/api/storage${photoObjectPath}` } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }

      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated ✨" });
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't save changes", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50 flex flex-col max-h-[92dvh]"
          >
            <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
              <h2 className="font-extrabold text-base">Edit Profile</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-6 space-y-5">
              {/* Avatar + photo upload */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  disabled={isUploading}
                >
                  {photoPreview || appUser?.profileImageUrl ? (
                    <img
                      src={photoPreview ?? appUser!.profileImageUrl!}
                      alt="You"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                      {((appUser?.firstName?.[0] ?? "") + (appUser?.lastName?.[0] ?? "")).toUpperCase() || "M"}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const preview = URL.createObjectURL(file);
                    setPhotoPreview(preview);
                    await uploadFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {isUploading ? "Uploading…" : "Tap to change photo"}
                </p>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full h-11 bg-white border border-border rounded-xl px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full h-11 bg-white border border-border rounded-xl px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="yourname"
                    maxLength={24}
                    className={`w-full h-11 bg-white border rounded-xl pl-7 pr-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                      username && !usernameValid ? "border-red-400 focus:border-red-400" : "border-border focus:border-primary"
                    }`}
                  />
                </div>
                {username && !usernameValid && (
                  <p className="text-[11px] text-red-500 mt-1">3–24 chars, letters/numbers/underscores</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">How friends find you on Daymark</p>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A little about you…"
                  rows={2}
                  maxLength={160}
                  className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Where are you?"
                  className="w-full h-11 bg-white border border-border rounded-xl px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Birthday */}
              <div>
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Birthday</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full h-11 bg-white border border-border rounded-xl px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Email — view + update */}
              <div>
                <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Email address</label>
                {!showEmailUpdate ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-11 bg-muted/50 border border-border/50 rounded-xl px-3 flex items-center min-w-0">
                      <span className="text-sm text-muted-foreground truncate">{appUser?.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowEmailUpdate(true); setEmailSent(false); setEmailError(null); setNewEmail(""); }}
                      className="shrink-0 h-11 px-3 border border-border rounded-xl text-xs font-bold text-primary bg-white active:scale-95 transition-all"
                    >
                      Change
                    </button>
                  </div>
                ) : emailSent ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Confirmation email sent 💌</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Click the link in your new inbox to confirm the change to <span className="font-semibold">{newEmail}</span>.
                        Your current email stays active until confirmed.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setShowEmailUpdate(false); setEmailSent(false); }}
                        className="text-xs text-emerald-700 underline mt-1"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      autoComplete="email"
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setEmailError(null); }}
                      placeholder="New email address"
                      className="w-full h-11 bg-white border border-border rounded-xl px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {emailError && (
                      <p className="text-xs text-red-500">{emailError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowEmailUpdate(false); setEmailError(null); }}
                        className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground bg-white active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={emailSending || !newEmail}
                        onClick={async () => {
                          if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                            setEmailError("Please enter a valid email address.");
                            return;
                          }
                          if (newEmail === appUser?.email) {
                            setEmailError("That's already your current email.");
                            return;
                          }
                          setEmailSending(true);
                          setEmailError(null);
                          const { error } = await supabase.auth.updateUser({ email: newEmail });
                          setEmailSending(false);
                          if (error) {
                            const m = error.message.toLowerCase();
                            if (m.includes("already registered") || m.includes("already in use")) {
                              setEmailError("That email already has a Daymark.");
                            } else if (m.includes("invalid")) {
                              setEmailError("Please enter a valid email address.");
                            } else {
                              setEmailError(error.message || "Couldn't send confirmation. Try again.");
                            }
                          } else {
                            // Persist pending state so the banner survives page reloads
                            const pending: PendingEmailChange = { email: newEmail, ts: Date.now() };
                            localStorage.setItem(PENDING_EMAIL_KEY, JSON.stringify(pending));
                            setEmailSent(true);
                          }
                        }}
                        className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(104,71,245,0.2)] active:scale-95 disabled:opacity-60 transition-all"
                      >
                        {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send confirmation"}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      A confirmation link will be sent to your new email. Your current address stays active until confirmed.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (!!username && !usernameValid)}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(104,71,245,0.25)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, signOut } = useAppAuth();
  const { toast } = useToast();
  const search = useSearch();
  const { data: memories } = useListMemories({});
  const { data: people } = useListPeople();
  const { data: futureGifts } = useListFutureGifts();
  const [showEdit, setShowEdit] = useState(false);
  const [daylinksCount, setDaylinksCount] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    id: number; type: string; title: string; eventMonth: number; eventDay: number;
    daysUntil: number; nextDate: string;
  }>>([]);

  // ── Pending email change banner ───────────────────────────────────────────
  const [pendingEmail, setPendingEmail] = useState<PendingEmailChange | null>(() => {
    try {
      const raw = localStorage.getItem(PENDING_EMAIL_KEY);
      if (!raw) return null;
      const parsed: PendingEmailChange = JSON.parse(raw);
      // Expire after 24 hours (matches Supabase link expiry)
      if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PENDING_EMAIL_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  });
  const [resendingEmail, setResendingEmail] = useState(false);

  // Show success toast when arriving back from email-confirmation link
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("emailConfirmed") === "1") {
      toast({ title: "Email updated ✓", description: "Your new email address is now active." });
      setPendingEmail(null);
      // Clean the query param without a full reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [search, toast]);

  // Listen for Supabase USER_UPDATED event (email confirmed in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED") {
        localStorage.removeItem(PENDING_EMAIL_KEY);
        setPendingEmail(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/api/daylinks", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.daylinks) setDaylinksCount(d.daylinks.length); })
      .catch(() => {});

    fetch("/api/relationship-events/upcoming?days=30", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => setUpcomingEvents(d.events ?? []))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const firstName = user.firstName ?? "You";
  const dbUser = user as any;
  const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || "M";

  const stats = [
    { label: "Memories",   value: memories?.length ?? 0,     icon: "📸" },
    { label: "People",     value: people?.length ?? 0,        icon: "❤️" },
    { label: "Daylinks",   value: daylinksCount ?? 0,         icon: "✨" },
    { label: "Future",     value: futureGifts?.length ?? 0,   icon: "🔒" },
  ];

  const menuSections = [
    {
      title: "My Daymark",
      items: [
        { label: "My Story",           icon: "📖", href: "/home" },
        { label: "My People",          icon: "❤️", href: "/people" },
        { label: "My Gifts",           icon: "✨", href: "/gifts" },
        { label: "Future Gifts",       icon: "🔒", href: "/future-gifts" },
        { label: "Memory Globe",       icon: "🌍", href: "/globe" },
      ],
    },
    {
      title: "Connect",
      items: [
        { label: "Connections",        icon: "💜", href: "/connections" },
        { label: "Messages for Later", icon: "💌", href: "/messages" },
        { label: "Invite Friends",     icon: "🔗", href: "/invite" },
        { label: "Monthly Capsule",    icon: "🎁", href: "/capsule" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Privacy",            icon: "🛡️", href: "/settings/privacy" },
        { label: "Notifications",      icon: "🔔", href: "/settings/notifications" },
      ],
    },
  ];

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/auth/export", { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daymark-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deletePhrase !== "delete my daymark") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        credentials: "include",
        headers: { "x-confirm-delete": "yes" },
      });
      if (res.ok) {
        await signOut();
      }
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32 overflow-x-hidden">

      {/* Pending email change banner */}
      <AnimatePresence>
        {pendingEmail && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-3"
          >
            <Mail className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-800">Confirm your new email 💌</p>
              <p className="text-xs text-amber-700 truncate">
                Check <span className="font-semibold">{pendingEmail.email}</span> and click the link to finish changing your address.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  setResendingEmail(true);
                  await supabase.auth.resend({ type: "email_change", email: user?.email ?? "" });
                  setResendingEmail(false);
                  toast({ title: "Resent ✓", description: "Check your inbox again." });
                }}
                disabled={resendingEmail}
                className="text-[11px] font-bold text-amber-700 underline underline-offset-1"
              >
                {resendingEmail ? "Sending…" : "Resend"}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(PENDING_EMAIL_KEY);
                  setPendingEmail(null);
                }}
                className="text-amber-500 hover:text-amber-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="bg-white border-b border-border/50 pt-14 pb-8 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#EAE3FF]/30 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center relative z-10"
        >
          {/* Avatar */}
          <div className="mb-4 relative">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={firstName} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 text-xl">✨</div>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground">
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName ?? "Your Daymark"}
          </h1>
          {dbUser.username && (
            <p className="text-sm font-bold text-primary mt-0.5">@{dbUser.username}</p>
          )}
          {dbUser.bio && (
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px] leading-relaxed">{dbUser.bio}</p>
          )}
          {(dbUser.city || user.email) && (
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {dbUser.city ? dbUser.city : user.email}
            </p>
          )}

          <button
            onClick={() => setShowEdit(true)}
            className="mt-3 px-4 py-1.5 rounded-full bg-[#EAE3FF] text-primary text-xs font-bold hover:bg-[#DDD6FF] active:scale-95 transition-all"
          >
            Edit Profile
          </button>

          {/* Stats */}
          <div className="flex items-center gap-5 mt-5">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-lg mb-0.5">{s.icon}</span>
                <span className="text-xl font-extrabold">{s.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Coming Up — upcoming relationship events */}
      {upcomingEvents.length > 0 && (
        <div className="px-5 pt-5">
          <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 px-1">Coming Up</p>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {upcomingEvents.slice(0, 5).map((ev, i) => {
              const EVENT_COLOR: Record<string, string> = { birthday: "#FF6B9D", anniversary: "#F43F5E", friendship_anniversary: "#6847F5", graduation: "#F59E0B", custom: "#94A3B8" };
              const dotColor = EVENT_COLOR[ev.type] ?? "#6847F5";
              const label = ev.daysUntil === 0 ? "Today" : ev.daysUntil === 1 ? "Tomorrow" : `In ${ev.daysUntil} days`;
              const date = new Date(ev.nextDate + "T00:00:00");
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < Math.min(upcomingEvents.length, 5) - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${dotColor}20` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {label}
                    </p>
                  </div>
                  {ev.daysUntil <= 3 && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.daysUntil === 0 ? "bg-red-400" : ev.daysUntil <= 1 ? "bg-orange-400" : "bg-primary"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="px-5 pt-6 space-y-5">
        {menuSections.map((section) => (
          <div key={section.title}>
            <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              {section.title}
            </p>
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {section.items.map((item, i) => (
                item.href ? (
                  <Link key={item.label} href={item.href} className="block outline-none">
                    <div className={`flex items-center gap-3 px-5 py-4 active:bg-muted transition-colors ${i < section.items.length - 1 ? "border-b border-border/50" : ""}`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-semibold text-sm flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </Link>
                ) : (
                  <div key={item.label} className={`flex items-center gap-3 px-5 py-4 ${i < section.items.length - 1 ? "border-b border-border/50" : ""}`}>
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-semibold text-sm flex-1 text-muted-foreground">{item.label}</span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Soon</span>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}

        {/* Sign out + account actions */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-5 py-4 text-foreground active:bg-muted transition-colors border-b border-border/50"
          >
            <Package className="w-5 h-5 text-foreground" />
            <span className="font-bold text-sm flex-1 text-left">{exporting ? "Exporting…" : "Export My Data"}</span>
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-500 active:bg-red-50 transition-colors border-b border-border/50"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm">Sign Out</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-400 active:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
            <span className="font-bold text-sm">Delete My Daymark</span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Your memories are private unless you choose to share them.
        </p>
      </div>

      <EditProfileSheet open={showEdit} onClose={() => setShowEdit(false)} dbUser={dbUser} />

      {/* Account deletion confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground mb-1">Delete My Daymark</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              This permanently deletes all your memories, people, messages, future gifts, and public Globe content. <strong>This cannot be undone.</strong>
            </p>
            <p className="text-xs font-bold text-foreground mb-2">
              Type <span className="text-red-500 font-extrabold">delete my daymark</span> to confirm:
            </p>
            <input
              type="text"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value.toLowerCase())}
              placeholder="delete my daymark"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deletePhrase !== "delete my daymark" || deleting}
              className="w-full h-12 bg-red-500 text-white rounded-full font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
            >
              {deleting ? "Deleting…" : "Permanently Delete Account"}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeletePhrase(""); }}
              className="w-full mt-3 text-sm text-muted-foreground font-medium py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
