import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  useGetHomeSummary, 
  useListCalendarEvents, 
  useListPeople 
} from "@workspace/api-client-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import { Sparkles, Calendar, ArrowRight, Gift, MapPin } from "lucide-react";
import { format, formatDistanceToNow, addDays } from "date-fns";

export default function HomePage() {
  const { data: summary, isLoading: loadingSummary } = useGetHomeSummary();
  const { data: people, isLoading: loadingPeople } = useListPeople();

  // We have upcomingEvents in summary, or we can use useListCalendarEvents. 
  // Let's use summary.upcomingEvents for the home screen scroll.

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 pb-32">
      {/* Header */}
      <header className="pt-8 pb-6 flex items-center justify-between">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-serif font-bold text-foreground"
          >
            Good morning, Saadia ✨
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground font-medium mt-1"
          >
            Let's make today a memory.
          </motion.p>
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-14 h-14 bg-lavender rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden"
        >
          <img src={markyWaving} alt="Marky" className="w-12 h-12 object-contain" />
        </motion.div>
      </header>

      {/* Coming Up */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Coming Up</h2>
          <Link href="/calendar" className="text-sm font-bold text-primary flex items-center">
            See all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-6 px-6">
          {summary?.upcomingEvents?.length ? (
            summary.upcomingEvents.map((event, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                key={event.id}
                className="min-w-[200px] snap-center bg-white p-4 rounded-3xl border border-border shadow-sm flex flex-col gap-2 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-8 -mt-8 ${
                  event.type === 'birthday' ? 'bg-accent/20' : 
                  event.type === 'travel' ? 'bg-blue-100' : 'bg-primary/10'
                }`}></div>
                
                <div className="text-2xl mb-1 relative z-10">
                  {event.type === 'birthday' ? '🎈' : 
                   event.type === 'anniversary' ? '❤️' : 
                   event.type === 'travel' ? '✈️' : 
                   event.type === 'achievement' ? '⭐' : '📅'}
                </div>
                <h3 className="font-bold text-lg leading-tight relative z-10">{event.title}</h3>
                <p className="text-sm text-muted-foreground font-bold relative z-10">
                  {event.daysUntil === 0 ? "Today!" : `in ${event.daysUntil} days`}
                </p>
              </motion.div>
            ))
          ) : (
            // Empty / Loading state
            [1, 2].map((i) => (
              <div key={i} className="min-w-[200px] snap-center bg-lavender/30 p-4 rounded-3xl border border-border shadow-sm flex flex-col gap-2 h-32 animate-pulse"></div>
            ))
          )}
        </div>
      </section>

      {/* Gift From Your Past */}
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          A Gift From Your Past <Gift className="w-5 h-5 text-primary" />
        </h2>
        
        {summary?.giftFromPast ? (
          <Link href={`/gifts/${summary.giftFromPast.id}`}>
            <motion.div 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-[2rem] border border-border shadow-md overflow-hidden"
            >
              {summary.giftFromPast.photoUrls && summary.giftFromPast.photoUrls.length > 0 ? (
                <div className="h-48 w-full bg-muted relative">
                  <img src={summary.giftFromPast.photoUrls[0]} className="w-full h-full object-cover" alt={summary.giftFromPast.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-serif font-bold text-2xl mb-1">{summary.giftFromPast.title}</h3>
                    <p className="text-sm font-medium opacity-90 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {format(new Date(summary.giftFromPast.date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`h-40 w-full relative flex flex-col items-center justify-center text-center p-6`} style={{ backgroundColor: summary.giftFromPast.giftColor }}>
                  <Gift className="w-12 h-12 text-white/50 mb-2" />
                  <h3 className="font-serif font-bold text-2xl text-white mb-1">{summary.giftFromPast.title}</h3>
                  <p className="text-sm font-medium text-white/90">{format(new Date(summary.giftFromPast.date), "MMM d, yyyy")}</p>
                </div>
              )}
              
              <div className="p-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {summary.giftFromPast.people?.slice(0, 3).map((person, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-lavender flex items-center justify-center text-xs font-bold shadow-sm">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        person.name.charAt(0)
                      )}
                    </div>
                  ))}
                  {summary.giftFromPast.people && summary.giftFromPast.people.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                      +{summary.giftFromPast.people.length - 3}
                    </div>
                  )}
                </div>
                
                <span className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-full shadow-sm">
                  Open Gift
                </span>
              </div>
            </motion.div>
          </Link>
        ) : (
          <div className="bg-white rounded-[2rem] border border-border shadow-sm p-8 text-center flex flex-col items-center justify-center">
            <Gift className="w-12 h-12 text-muted mb-3" />
            <h3 className="font-bold text-lg">No past gifts yet</h3>
            <p className="text-muted-foreground text-sm">Your memories will appear here as time passes.</p>
          </div>
        )}
      </section>

      {/* Your People */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your People</h2>
          <Link href="/people" className="text-sm font-bold text-primary flex items-center">
            See all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
          {people?.map((person, i) => (
            <Link key={person.id} href={`/people/${person.id}`}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                className="flex flex-col items-center gap-2 w-16"
              >
                <div className="w-16 h-16 rounded-full border-2 border-white shadow-md bg-lavender flex items-center justify-center overflow-hidden">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-primary">{person.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-center w-full truncate">{person.name}</span>
              </motion.div>
            </Link>
          ))}
          
          <Link href="/people">
            <div className="flex flex-col items-center gap-2 w-16">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <ArrowRight className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-center w-full text-muted-foreground truncate">View all</span>
            </div>
          </Link>
        </div>
      </section>
      
      {/* Hide scrollbar utility class injected below */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
