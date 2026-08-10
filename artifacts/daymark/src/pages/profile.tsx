import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAppAuth } from "@/App";
import {
  useListMemories, useListPeople, useListFutureGifts,
  usePatchUserProfile,
} from "@workspace/api-client-react";
import { ChevronRight, LogOut, X, Check, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ── Edit Profile Sheet ──────────────────────────────────────────────────────
function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAppAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const patchProfile = usePatchUserProfile();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  const handleSave = () => {
    patchProfile.mutate(
      { data: { firstName: firstName || null, lastName: lastName || null } } as any,
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Profile updated ✨" });
          onClose();
        },
        onError: () => toast({ title: "Couldn't save changes", variant: "destructive" }),
      },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h2 className="font-extrabold text-base">Edit Profile</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-5">
              {/* Avatar (display only — profile photo from Replit OIDC) */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="You"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                      {((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || "M"}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-md border border-border flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Profile photo is managed by your sign-in provider</p>
              </div>

              {/* Name fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full h-12 bg-white border border-border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full h-12 bg-white border border-border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              {user?.email && (
                <div>
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">Email</label>
                  <div className="h-12 bg-muted/50 border border-border/50 rounded-xl px-4 flex items-center">
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={patchProfile.isPending}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(104,71,245,0.25)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {patchProfile.isPending ? "Saving…" : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
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
  const { user, logout } = useAppAuth();
  const { data: memories } = useListMemories({});
  const { data: people } = useListPeople();
  const { data: futureGifts } = useListFutureGifts();
  const [showEdit, setShowEdit] = useState(false);

  if (!user) return null;

  const firstName = user.firstName ?? "You";
  const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || "M";

  const stats = [
    { label: "Memories", value: memories?.length ?? 0, icon: "🎁" },
    { label: "People",   value: people?.length ?? 0,   icon: "❤️" },
    { label: "Future",   value: futureGifts?.length ?? 0, icon: "🔒" },
  ];

  const menuSections = [
    {
      title: "My Daymark",
      items: [
        { label: "My Story",          icon: "📖", href: "/home" },
        { label: "My People",         icon: "❤️", href: "/people" },
        { label: "My Gifts",          icon: "🎁", href: "/gifts" },
        { label: "Future Gifts",      icon: "🔒", href: "/future-gifts" },
        { label: "Memory Globe 🌍",   icon: "🌍", href: "/globe" },
      ],
    },
    {
      title: "Connect",
      items: [
        { label: "Connections",       icon: "💜", href: "/connections" },
        { label: "Messages for Later",icon: "💌", href: "/messages" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Privacy",           icon: "🛡️", href: null },
        { label: "Notifications",     icon: "🔔", href: null },
      ],
    },
  ];

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
              <img
                src={user.profileImageUrl}
                alt={firstName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
              />
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
          {(user as any).username && (
            <p className="text-sm font-bold text-primary mt-0.5">@{(user as any).username}</p>
          )}
          {user.email && (
            <p className="text-sm text-muted-foreground font-medium mt-1">{user.email}</p>
          )}

          {/* Edit profile button */}
          <button
            onClick={() => setShowEdit(true)}
            className="mt-3 px-4 py-1.5 rounded-full bg-[#EAE3FF] text-primary text-xs font-bold hover:bg-[#DDD6FF] active:scale-95 transition-all"
          >
            Edit Profile
          </button>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-xl mb-0.5">{s.icon}</span>
                <span className="text-xl font-extrabold">{s.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

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

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-500 active:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm">Sign Out</span>
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Your memories are private unless you choose to share them.
        </p>
      </div>

      {/* Edit profile sheet */}
      <EditProfileSheet open={showEdit} onClose={() => setShowEdit(false)} />
    </div>
  );
}
