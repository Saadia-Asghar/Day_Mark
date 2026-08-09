import { useState } from "react";
import { Link } from "wouter";
import { useListCalendarEvents, useGetOnThisDay } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Gift, ArrowRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import calRelaxing from "@assets/generated_images/cal_relaxing.png";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: events, isLoading: loadingEvents } = useListCalendarEvents({ 
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear()
  });
  
  const { data: onThisDay, isLoading: loadingOnThisDay } = useGetOnThisDay();

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventForDay = (date: Date) => {
    return events?.find(e => isSameDay(new Date(e.date), date));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 pb-32">
      <header className="pt-8 pb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-serif font-bold text-foreground">Dates & Days</h1>
        <p className="text-muted-foreground font-medium">Time well spent.</p>
      </header>

      {/* Calendar Card */}
      <section className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold font-serif">{format(currentDate, "MMMM yyyy")}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-xs font-bold text-muted-foreground">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Empty cells for start of month */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}
          
          {days.map((date, i) => {
            const event = getEventForDay(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDay = isToday(date);
            
            return (
              <div 
                key={i} 
                className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative ${
                  isCurrentDay ? "bg-primary text-primary-foreground font-bold" : 
                  event ? "bg-lavender font-bold" : "hover:bg-muted"
                } ${!isCurrentMonth ? "opacity-30" : ""}`}
              >
                <span className="text-sm z-10">{format(date, "d")}</span>
                
                {event && (
                  <div className="absolute -bottom-1 text-[10px] z-20">
                    {event.type === 'birthday' ? '🎈' : 
                     event.type === 'anniversary' ? '❤️' : 
                     event.type === 'travel' ? '✈️' : 
                     event.type === 'achievement' ? '⭐' : '🎁'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* On This Day */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          On This Day <CalIcon className="w-5 h-5 text-primary" />
        </h2>
        
        {loadingOnThisDay ? (
          <div className="h-40 bg-white rounded-3xl animate-pulse"></div>
        ) : onThisDay && onThisDay.length > 0 ? (
          <div className="space-y-4">
            {onThisDay.map(memory => (
              <Link key={memory.id} href={`/gifts/${memory.id}`}>
                <div className="bg-white p-4 rounded-3xl border border-border shadow-sm flex items-center gap-4 hover:border-primary transition-colors cursor-pointer group">
                  <div 
                    className="w-20 h-20 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center text-white font-bold"
                    style={{ backgroundColor: memory.giftColor }}
                  >
                    <span className="text-xs opacity-80">{new Date(memory.date).getFullYear()}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight mb-1">{memory.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{memory.story || "A kept memory."}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border p-8 flex flex-col items-center text-center">
            <img src={calRelaxing} alt="Cal relaxing" className="w-32 h-32 object-contain mb-4" />
            <h3 className="font-bold text-lg mb-1">Nothing to remember yet</h3>
            <p className="text-sm text-muted-foreground">You haven't saved any memories on this date in past years.</p>
          </div>
        )}
      </section>
    </div>
  );
}
