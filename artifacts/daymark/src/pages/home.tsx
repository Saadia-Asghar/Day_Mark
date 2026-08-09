import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetHomeSummary, useListPeople, useListNotifications } from "@workspace/api-client-react";
import type { CalendarEvent } from "@workspace/api-client-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import { Gift, Bell, Camera, Mic, MapPin, Edit3, Plus } from "lucide-react";
import { format } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { TapeStrip, GiftFromPastSkeleton, EmptyPastGiftState } from "@/components/scrapbook";
import { useAppAuth } from "@/App";

// ── Background doodles ────────────────────────────────────────────────────
const BackgroundDoodles = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none select-none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Top-right sparkle */}
    <path
      d="M348 48 L349.8 54 L356 54 L351 57.8 L353 64 L348 60.5 L343 64 L345 57.8 L340 54 L346.2 54Z"
      fill="#6847F5" opacity="0.07"
    />
    {/* Top-left dots */}
    <circle cx="28" cy="130" r="3.5" fill="#FF719D" opacity="0.1" />
    <circle cx="44" cy="118" r="2.5" fill="#FFC857" opacity="0.12" />
    <circle cx="20" cy="115" r="2" fill="#6847F5" opacity="0.09" />
    {/* Mid-right tiny star */}
    <path
      d="M370 290 L371.2 294 L375 294 L372.2 296.5 L373.2 300 L370 298 L366.8 300 L367.8 296.5 L365 294 L368.8 294Z"
      fill="#FFC857" opacity="0.1"
    />
    {/* Bottom-left flower petals */}
    <circle cx="22" cy="510" r="5" fill="#FFB58A" opacity="0.09" />
    <circle cx="30" cy="504" r="4" fill="#FF719D" opacity="0.07" />
    <circle cx="14" cy="505" r="3.5" fill="#FFB58A" opacity="0.07" />
    {/* Small heart */}
    <text x="362" y="195" fontSize="11" fill="#FF719D" opacity="0.11">♡</text>
    {/* Tiny cross sparkles */}
    <text x="10" y="390" fontSize="9" fill="#6847F5" opacity="0.1">✦</text>
    <text x="368" y="440" fontSize="8" fill="#FFC857" opacity="0.1">✦</text>
    {/* Dot row mid */}
    <circle cx="200" cy="12" r="2" fill="#6847F5" opacity="0.07" />
    <circle cx="214" cy="12" r="1.5" fill="#6847F5" opacity="0.05" />
    <circle cx="186" cy="12" r="1.5" fill="#6847F5" opacity="0.05" />
  </svg>
);

// ── Event gift-tag card ───────────────────────────────────────────────────
const getEventTagStyle = (type: string) => {
  switch (type) {
    case "birthday":
      return { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", circle: "border-pink-300", emoji: "🎂", rotate: "-rotate-1" };
    case "travel":
      return { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", circle: "border-sky-300", emoji: "✈️", rotate: "rotate-1" };
    case "anniversary":
      return { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", circle: "border-rose-300", emoji: "❤️", rotate: "-rotate-0.5" };
    case "achievement":
      return { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", circle: "border-violet-300", emoji: "⭐", rotate: "rotate-0.5" };
    default:
      return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", circle: "border-amber-300", emoji: "📅", rotate: "-rotate-1" };
  }
};

const EventTag = ({ event, index }: { event: CalendarEvent; index: number }) => {
  const s = getEventTagStyle(event.type);
  const subtitle =
    event.daysUntil === 0 ? "Today!" :
    event.daysUntil === 1 ? "Tomorrow" :
    event.daysUntil != null ? `${event.daysUntil}d away` : "Coming up";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={`relative snap-start shrink-0 pt-4 ${s.rotate}`}
    >
      {/* Hang hole */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${s.circle} bg-[#FFF9F5] z-10`} />
      {/* Tag body */}
      <div className={`${s.bg} border ${s.border} rounded-2xl px-4 py-3.5 min-w-[88px] flex flex-col items-center shadow-sm`}>
        <span className="text-2xl mb-1.5">{s.emoji}</span>
        <span className={`text-xs font-bold text-center leading-tight ${s.text}`}>{event.title}</span>
        <span className={`text-[10px] font-semibold mt-1 opacity-70 ${s.text}`}>{subtitle}</span>
      </div>
    </motion.div>
  );
};

// ── Physical quick-capture buttons ────────────────────────────────────────
const CaptureButtons = () => {
  const items = [
    {
      id: "photo",
      label: "PHOTO",
      href: "/wrap?type=photo",
      node: (
        <div className="bg-white border-2 border-sky-100 rounded-lg p-1.5 shadow-sm flex items-center justify-center w-11 h-11">
          <Camera className="w-5 h-5 text-sky-500" />
        </div>
      ),
      bg: "bg-white",
      border: "border-sky-100",
      text: "text-sky-600",
    },
    {
      id: "story",
      label: "STORY",
      href: "/wrap?type=story",
      node: (
        <div className="relative w-11 h-11 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center">
          {/* Folded corner */}
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-200 rounded-bl-md" />
          <Edit3 className="w-5 h-5 text-amber-600" />
        </div>
      ),
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-700",
    },
    {
      id: "voice",
      label: "VOICE",
      href: "/wrap?type=voice",
      node: (
        <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center gap-px overflow-hidden">
          {[2, 4, 6, 4, 7, 4, 5, 3, 6, 3].map((h, i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-emerald-500 opacity-80"
              style={{ height: `${h * 3}px` }}
            />
          ))}
        </div>
      ),
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-700",
    },
    {
      id: "place",
      label: "PLACE",
      href: "/wrap?type=place",
      node: (
        <div className="relative w-11 h-11 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center">
          {/* Postcard stamp corner */}
          <div className="absolute top-1 right-1 w-3 h-4 border border-rose-300 rounded-[2px]" />
          <MapPin className="w-5 h-5 text-rose-500" />
        </div>
      ),
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-700",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <Link key={item.id} href={item.href}>
          <motion.div
            whileTap={{ scale: 0.92, y: -2 }}
            className={`flex flex-col items-center gap-2 py-3 rounded-2xl border ${item.border} bg-white shadow-sm cursor-pointer`}
          >
            {item.node}
            <span className={`text-[9px] font-extrabold tracking-widest ${item.text}`}>{item.label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAppAuth();
  const { data: summary, isLoading: loadingSummary, isError: isSummaryError, refetch: refetchSummary } = useGetHomeSummary();
  const { data: people, isLoading: loadingPeople, isError: isPeopleError, refetch: refetchPeople } = useListPeople();
  const { data: notifications } = useListNotifications();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.firstName ?? null;

  // Scrapbook rotations for people
  const rotations = [-2, 1.5, -1, 2, -1.5, 1];

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans w-full flex flex-col relative overflow-hidden">
      <BackgroundDoodles />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="px-5 pt-12 pb-1 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shadow-sm">
            <Gift className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight">Daymark</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-white hover:shadow-sm transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {(notifications?.unreadCount ?? 0) > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {(notifications?.unreadCount ?? 0) > 9 ? "9+" : notifications?.unreadCount}
              </span>
            )}
          </button>
          <Link href="/profile" aria-label="Profile">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={firstName ?? "You"}
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                {firstName ? firstName[0].toUpperCase() : "M"}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-32 relative z-10">

        {/* Hero greeting + Marky */}
        <section className="px-5 pt-5 pb-2 relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm font-semibold text-muted-foreground">
              {firstName ? `${greeting}, ${firstName} ✨` : `${greeting} ✨`}
            </p>
            <h1 className="text-[28px] leading-[1.2] font-extrabold text-foreground mt-1 max-w-[230px]">
              What will you remember about today?
            </h1>
          </motion.div>
          {/* Marky integrated into heading scene */}
          <motion.img
            src={markyWaving}
            alt="Marky"
            className="absolute right-5 bottom-0 w-[90px] h-[90px] drop-shadow-md"
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
          />
        </section>

        {/* Thin decorative divider */}
        <div className="mx-5 mt-8 mb-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* ── Today's moments ────────────────────────────────────── */}
        <section className="mt-6">
          <div className="px-5 mb-4 flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">Coming Up</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {isSummaryError ? (
            <DmErrorState message="Could not load today's events." onRetry={refetchSummary} />
          ) : loadingSummary ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="snap-start shrink-0 pt-4">
                  <div className="w-[88px] h-[90px] bg-muted rounded-2xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : summary?.upcomingEvents && summary.upcomingEvents.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {summary.upcomingEvents.map((event, i) => (
                <EventTag key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="px-5">
              <p className="text-sm text-muted-foreground font-medium">No special dates coming up soon. 🗓</p>
            </div>
          )}
        </section>

        {/* ── A Gift From Your Past ──────────────────────────────── */}
        <section className="mt-10 px-4">
          <div className="px-1 mb-5 flex items-center gap-2">
            <SparkleIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-primary uppercase">A Gift From Your Past</span>
          </div>

          {loadingSummary ? (
            <GiftFromPastSkeleton />
          ) : isSummaryError ? (
            <DmErrorState
              message="We couldn't open your past gift right now."
              onRetry={refetchSummary}
            />
          ) : summary?.giftFromPast ? (
            <Link href={`/gifts/${summary.giftFromPast.id}`} className="block outline-none">
              <div className="relative">
                {/* Tape strip at top-left */}
                <TapeStrip rotate={-3} className="-top-2.5 left-6" />
                {/* Polaroid card */}
                <motion.div
                  whileTap={{ scale: 0.98, rotate: 0 }}
                  className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.13)] relative z-10"
                  style={{ transform: "rotate(-1.3deg)", borderRadius: 4 }}
                >
                  {/* Photo area */}
                  <div className="p-2.5 pb-0">
                    <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {summary.giftFromPast.photoUrls?.length ? (
                        <img
                          src={summary.giftFromPast.photoUrls[0]}
                          alt={summary.giftFromPast.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-end p-4"
                          style={{
                            background: `linear-gradient(135deg, ${summary.giftFromPast.giftColor} 0%, ${summary.giftFromPast.giftColor}99 100%)`,
                          }}
                        >
                          <span className="text-white font-bold text-xl drop-shadow">{summary.giftFromPast.title}</span>
                        </div>
                      )}
                      {/* Location stamp overlay */}
                      {summary.giftFromPast.location && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]">
                            {summary.giftFromPast.location}
                          </span>
                        </div>
                      )}
                      {/* Date stamp */}
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-[10px] font-mono text-white">
                          {format(new Date(summary.giftFromPast.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Polaroid white bottom */}
                  <div className="px-3 pt-3 pb-5">
                    <h3 className="font-bold text-foreground text-base leading-snug">
                      {summary.giftFromPast.title}
                    </h3>
                    {summary.giftFromPast.story && (
                      <p
                        className="text-[12px] text-muted-foreground mt-1 line-clamp-2 italic"
                        style={{ fontFamily: "cursive" }}
                      >
                        "{summary.giftFromPast.story}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      {/* People avatars */}
                      <div className="flex -space-x-2">
                        {summary.giftFromPast.people?.slice(0, 4).map((p, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full border-2 border-white bg-[#EAE3FF] flex items-center justify-center overflow-hidden shadow-sm"
                          >
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold text-primary">{p.name.charAt(0)}</span>
                            )}
                          </div>
                        ))}
                        {summary.giftFromPast.people && summary.giftFromPast.people.length > 4 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-muted flex items-center justify-center">
                            <span className="text-[9px] font-bold text-muted-foreground">+{summary.giftFromPast.people.length - 4}</span>
                          </div>
                        )}
                      </div>
                      {/* Open button */}
                      <div className="bg-primary text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-sm shadow-primary/20 flex items-center gap-1">
                        🎁 Open this memory
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Marky peeking from behind the photo */}
                <motion.img
                  src={markyWaving}
                  alt="Marky"
                  className="absolute -bottom-5 -right-1 w-14 h-14 drop-shadow-md z-20 pointer-events-none"
                  animate={{ rotate: [-3, 3, -3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </Link>
          ) : (
            <EmptyPastGiftState />
          )}
        </section>

        {/* ── Quick Capture ──────────────────────────────────────── */}
        <section className="mt-12 px-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">Capture Now</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <CaptureButtons />
        </section>

        {/* ── Your People ────────────────────────────────────────── */}
        <section className="mt-12 mb-6">
          <div className="px-5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">The people in your story</span>
              <span className="text-sm">❤️</span>
            </div>
            <Link href="/people" className="text-xs font-bold text-primary">See all</Link>
          </div>

          {isPeopleError ? (
            <DmErrorState message="Could not load your people." onRetry={refetchPeople} />
          ) : loadingPeople ? (
            <div className="flex gap-5 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="snap-start shrink-0 flex flex-col items-center gap-2">
                  <div className="w-[62px] h-[62px] rounded-full bg-muted animate-pulse border-2 border-white shadow-sm" />
                  <div className="h-2.5 w-10 bg-muted animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : people && people.length > 0 ? (
            <div className="flex gap-5 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x pb-2">
              {people.map((person, i) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="snap-start shrink-0"
                  style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
                >
                  <Link href={`/people/${person.id}`}>
                    <div className="flex flex-col items-center gap-1.5 w-[68px]">
                      {/* Scrapbook portrait: white mat + photo */}
                      <div className="bg-white p-1.5 shadow-md rounded-full border border-white/50">
                        <div className="w-[54px] h-[54px] rounded-full bg-[#EAE3FF] flex items-center justify-center overflow-hidden">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-primary text-xl">{person.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-center w-full truncate">{person.name}</span>
                      {person.memoriesCount != null && (
                        <span className="text-[10px] text-muted-foreground font-semibold -mt-1">
                          {person.memoriesCount} moments
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
              {/* Add person */}
              <div className="snap-start shrink-0">
                <Link href="/people">
                  <div className="flex flex-col items-center gap-1.5 w-[68px]">
                    <div className="bg-white p-1.5 shadow-sm rounded-full border border-dashed border-border">
                      <div className="w-[54px] h-[54px] rounded-full bg-background flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground">Add</span>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-5 py-6 flex flex-col items-center justify-center bg-white border border-border rounded-2xl text-center shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-3">Memories are better shared.</p>
              <Link href="/people" className="text-sm font-bold text-primary flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add someone special
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z"
      fill="currentColor"
    />
  </svg>
);
