import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAppAuth } from "@/App";
import { useListMemories, useListPeople, useListFutureGifts } from "@workspace/api-client-react";
import { Settings, LogOut, Gift, Users, Lock, ChevronRight } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAppAuth();
  const { data: memories } = useListMemories({});
  const { data: people } = useListPeople();
  const { data: futureGifts } = useListFutureGifts();

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
        { label: "My Story",       icon: "📖", href: "/home" },
        { label: "My People",      icon: "❤️", href: "/people" },
        { label: "My Gifts",       icon: "🎁", href: "/gifts" },
        { label: "Future Gifts",   icon: "🔒", href: "/future-gifts" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Privacy",        icon: "🛡️", href: null },
        { label: "Notifications",  icon: "🔔", href: null },
      ],
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32 overflow-x-hidden">

      {/* Hero */}
      <div className="bg-white border-b border-border/50 pt-14 pb-8 px-5 relative overflow-hidden">
        {/* Background doodle */}
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
            {/* Sticker */}
            <div className="absolute -bottom-1 -right-1 text-xl">✨</div>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground">
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName ?? "Your Daymark"}
          </h1>
          {user.email && (
            <p className="text-sm text-muted-foreground font-medium mt-1">{user.email}</p>
          )}

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
    </div>
  );
}
