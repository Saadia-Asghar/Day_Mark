import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetHomeSummary, useListPeople } from "@workspace/api-client-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import { Gift, Bell, Camera, Mic, MapPin, Plus, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { DmPersonAvatar, DmDatePill, DmErrorState } from "@/components/daymark";
import { useAppAuth } from "@/App";

export default function HomePage() {
  const { user } = useAppAuth();
  const { data: summary, isLoading: loadingSummary, isError: isSummaryError, refetch: refetchSummary } = useGetHomeSummary();
  const { data: people, isLoading: loadingPeople, isError: isPeopleError, refetch: refetchPeople } = useListPeople();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.firstName || null;

  const getPillStyle = (type: string) => {
    switch (type) {
      case "birthday": return { colorClass: "bg-pink-100 text-pink-700", emoji: "🎂" };
      case "travel": return { colorClass: "bg-sky-100 text-sky-700", emoji: "✈️" };
      case "anniversary": return { colorClass: "bg-red-100 text-red-700", emoji: "❤️" };
      case "achievement": return { colorClass: "bg-purple-100 text-purple-700", emoji: "⭐" };
      default: return { colorClass: "bg-amber-100 text-amber-700", emoji: "📅" };
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans w-full overflow-hidden flex flex-col">
      {/* Header strip */}
      <header className="px-5 pt-12 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Gift className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight">Daymark</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={firstName ?? ""}
              className="w-10 h-10 rounded-full object-cover border border-white shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm shadow-sm border border-white">
              {firstName ? firstName[0].toUpperCase() : "M"}
            </div>
          )}
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-32">
        {/* Greeting section */}
        <section className="px-5 pt-4 pb-2 relative">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm font-semibold text-muted-foreground">
              {firstName ? `${greeting}, ${firstName} ✨` : `${greeting} ✨`}
            </p>
            <h1 className="text-[28px] leading-tight font-bold text-foreground mt-1 max-w-[280px]">
              What will you remember about today?
            </h1>
            <motion.img 
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              src={markyWaving} 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 drop-shadow-sm" 
              alt="Marky"
            />
          </motion.div>
        </section>

        {/* TODAY strip */}
        <section className="mt-8 mb-8">
          <div className="px-5 mb-3">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Today</h2>
          </div>
          {isSummaryError ? (
             <DmErrorState message="Could not load today's events." onRetry={refetchSummary} />
          ) : loadingSummary ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 w-32 bg-muted rounded-full animate-pulse shrink-0 snap-start" />
              ))}
            </div>
          ) : summary?.upcomingEvents && summary.upcomingEvents.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
              {summary.upcomingEvents.map((event, i) => {
                const style = getPillStyle(event.type);
                const subtitle = event.daysUntil === 0 ? "Today!" : `in ${event.daysUntil} days`;
                return (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="snap-start"
                  >
                    <DmDatePill 
                      emoji={style.emoji}
                      title={event.title}
                      subtitle={subtitle}
                      colorClass={style.colorClass}
                    />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="px-5">
              <p className="text-sm text-muted-foreground">No special dates coming up soon.</p>
            </div>
          )}
        </section>

        {/* Hero Memory Card */}
        <section className="mt-8 px-5 mb-8">
          <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-3 flex items-center gap-1.5">
            <SparkleIcon className="w-3.5 h-3.5" /> A Gift From Your Past
          </h2>
          
          {loadingSummary ? (
            <div className="w-full max-w-[340px] mx-auto h-72 bg-muted rounded-[2rem] animate-pulse" />
          ) : summary?.giftFromPast ? (
            <Link href={`/gifts/${summary.giftFromPast.id}`} className="block outline-none">
              <motion.div 
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-[340px] mx-auto rounded-[2rem] overflow-hidden shadow-lg border border-border relative bg-white aspect-[4/5] flex flex-col"
              >
                <div className="absolute inset-0 z-0">
                  {summary.giftFromPast.photoUrls?.length ? (
                    <img src={summary.giftFromPast.photoUrls[0]} alt="Memory" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--gift-color)] to-black/30" style={{ '--gift-color': summary.giftFromPast.giftColor } as React.CSSProperties} />
                  )}
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                </div>
                
                {/* Overlays */}
                <div className="absolute top-4 left-4 rotate-[-5deg] bg-white/60 backdrop-blur-sm border-2 border-white/40 px-2 py-0.5 shadow-sm text-[10px] font-bold uppercase tracking-wider text-foreground z-10">
                  📸 memory
                </div>
                <div className="absolute top-4 right-4 text-accent/90 text-2xl z-10">
                  ♡
                </div>
                
                {/* Content at bottom over image */}
                <div className="relative z-10 mt-auto px-5 pb-5">
                  <div className="inline-block bg-white/80 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-bold text-foreground mb-2 shadow-sm">
                    {format(new Date(summary.giftFromPast.date), "MMM d, yyyy")}
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                    {summary.giftFromPast.title}
                  </h3>
                  {summary.giftFromPast.story && (
                    <p className="text-sm text-white/80 italic line-clamp-2">"{summary.giftFromPast.story}"</p>
                  )}
                </div>

                {/* White bottom section */}
                <div className="relative z-10 bg-white px-5 py-4 flex items-center justify-between border-t border-border">
                  <div className="flex -space-x-2">
                    {summary.giftFromPast.people?.slice(0, 3).map((p, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-background overflow-hidden flex items-center justify-center">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-primary">{p.name.charAt(0)}</span>
                        )}
                      </div>
                    ))}
                    {summary.giftFromPast.people && summary.giftFromPast.people.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        +{summary.giftFromPast.people.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm shadow-primary/20">
                    🎁 Open this memory
                  </div>
                </div>
              </motion.div>
            </Link>
          ) : (
            <div className="bg-white rounded-[2rem] border border-border shadow-sm p-8 text-center flex flex-col items-center justify-center">
              <Gift className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
              <h3 className="font-bold text-lg text-foreground">No past gifts yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Your memories will appear here as time passes.</p>
            </div>
          )}
        </section>

        {/* Quick Capture */}
        <section className="mt-8 px-5 mb-8">
          <h2 className="text-base font-semibold mb-3">What happened today?</h2>
          <div className="flex justify-between items-center gap-2">
            {[
              { id: 'photo', icon: Camera, label: 'Photo', color: 'bg-blue-100 text-blue-600' },
              { id: 'story', icon: Edit3, label: 'Story', color: 'bg-amber-100 text-amber-600' },
              { id: 'voice', icon: Mic, label: 'Voice', color: 'bg-emerald-100 text-emerald-600' },
              { id: 'place', icon: MapPin, label: 'Place', color: 'bg-rose-100 text-rose-600' },
            ].map(item => (
              <Link key={item.id} href={`/wrap?type=${item.id}`} className="flex-1">
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-1.5`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold">{item.label}</span>
                </div>
              </Link>
            ))}
            <Link href="/wrap" className="flex-1">
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-1.5`}>
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">More</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Your People */}
        <section className="mt-8 mb-8">
          <div className="px-5 mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Your people ❤️</h2>
            <Link href="/people" className="text-sm font-bold text-primary">See all</Link>
          </div>
          {isPeopleError ? (
             <DmErrorState message="Could not load your people." onRetry={refetchPeople} />
          ) : loadingPeople ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[72px]">
                    <div className="w-[60px] h-[60px] rounded-full bg-muted animate-pulse border-2 border-white shadow-sm" />
                    <div className="h-3 w-10 bg-muted animate-pulse rounded-full" />
                 </div>
               ))}
            </div>
          ) : people && people.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
              {people.map((person, i) => (
                <div key={person.id} className="snap-start shrink-0">
                  <Link href={`/people/${person.id}`}>
                    <DmPersonAvatar 
                      name={person.name} 
                      avatarUrl={person.avatarUrl} 
                      count={person.memoriesCount} 
                    />
                  </Link>
                </div>
              ))}
              <div className="snap-start shrink-0">
                <Link href="/people">
                  <div className="flex flex-col items-center gap-1.5 w-[72px]">
                    <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-center w-full text-muted-foreground truncate">Add</span>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 flex flex-col items-center justify-center bg-white border border-border rounded-2xl text-center shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-3">Memories are better when they're shared.</p>
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
    <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" fill="currentColor"/>
  </svg>
);
