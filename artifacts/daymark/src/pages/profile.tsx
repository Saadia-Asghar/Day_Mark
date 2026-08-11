import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAppAuth } from "@/App";
import {
  useListMemories, useListPeople, useListFutureGifts,
} from "@workspace/api-client-react";
import { ChevronRight, LogOut, X, Check, Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useClerk, useUser } from "@clerk/react";
import { useUpload } from "@workspace/object-storage-web";

// ── Edit Profile Sheet ───────────────────────────────────────────────────
function EditProfileSheet({ open, onClose, dbUser }: {
  open: boolean;
  onClose: () => void;
  dbUser: any;
}) {
  const { user: clerkUser } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(clerkUser?.firstName ?? "");
  const [lastName, setLastName] = useState(clerkUser?.lastName ?? "");
  const [username, setUsername] = useState(dbUser?.username ?? "");
  const [bio, setBio] = useState(dbUser?.bio ?? "");
  const [city, setCity] = useState(dbUser?.city ?? "");
  const [birthday, setBirthday] = useState(dbUser?.birthday ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoObjectPath, setPhotoObjectPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setPhotoObjectPath(response.objectPath);
    },
  });

  // Reset fields when sheet opens
  useEffect(() => {
    if (open) {
      setFirstName(clerkUser?.firstName ?? "");
      setLastName(clerkUser?.lastName ?? "");
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
    if (!clerkUser) return;
    setSaving(true);
    try {
      // Update Clerk name
      await clerkUser.update({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      // Update DB profile (username, bio, city, birthday, profileImageUrl)
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
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
                  {photoPreview || clerkUser?.imageUrl ? (
                    <img
                      src={photoPreview ?? clerkUser!.imageUrl}
                      alt="You"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                      {((clerkUser?.firstName?.[0] ?? "") + (clerkUser?.lastName?.[0] ?? "")).toUpperCase() || "M"}
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

              {/* Email (read-only) */}
              {clerkUser?.primaryEmailAddress?.emailAddress && (
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Email</label>
                  <div className="h-11 bg-muted/50 border border-border/50 rounded-xl px-3 flex items-center">
                    <span className="text-sm text-muted-foreground">{clerkUser.primaryEmailAddress.emailAddress}</span>
                  </div>
                </div>
              )}

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
  const { user } = useAppAuth();
  const { signOut } = useClerk();
  const { data: memories } = useListMemories({});
  const { data: people } = useListPeople();
  const { data: futureGifts } = useListFutureGifts();
  const [showEdit, setShowEdit] = useState(false);
  const [daylinksCount, setDaylinksCount] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    id: number; type: string; title: string; eventMonth: number; eventDay: number;
    daysUntil: number; nextDate: string;
  }>>([]);

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
    { label: "Memories",   value: memories?.length ?? 0,     icon: "🎁" },
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
        { label: "My Gifts",           icon: "🎁", href: "/gifts" },
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
        await signOut({ redirectUrl: basePath || "/" });
      }
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32 overflow-x-hidden">

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
              {dbUser.city ? `📍 ${dbUser.city}` : user.email}
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
              const EVENT_EMOJI: Record<string, string> = { birthday: "🎂", anniversary: "💍", friendship_anniversary: "💜", graduation: "🎓", custom: "✨" };
              const emoji = EVENT_EMOJI[ev.type] ?? "📅";
              const label = ev.daysUntil === 0 ? "Today 🎉" : ev.daysUntil === 1 ? "Tomorrow" : `In ${ev.daysUntil} days`;
              const date = new Date(ev.nextDate + "T00:00:00");
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < Math.min(upcomingEvents.length, 5) - 1 ? "border-b border-border/50" : ""}`}>
                  <span className="text-xl">{emoji}</span>
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
            <span className="text-xl">📦</span>
            <span className="font-bold text-sm flex-1 text-left">{exporting ? "Exporting…" : "Export My Data"}</span>
          </button>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-500 active:bg-red-50 transition-colors border-b border-border/50"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm">Sign Out</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-400 active:bg-red-50 transition-colors"
          >
            <span className="text-xl">🗑️</span>
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
              <span className="text-2xl">🗑️</span>
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
