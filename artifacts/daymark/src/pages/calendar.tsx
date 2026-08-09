import { useState } from "react";
import { Link } from "wouter";
import { useListCalendarEvents, useGetOnThisDay } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
} from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { OnThisDayCard, GiftFromPastSkeleton } from "@/components/scrapbook";

// Event type → visual marker
const EVENT_MARKERS: Record<string, string> = {
  birthday:    "🎈",
  memory:      "🎁",
  travel:      "📍",
  anniversary: "❤️",
  achievement: "⭐",
  future_gift: "🔒",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events, isLoading: loadingEvents, isError: eventsError, refetch: refetchEvents } = useListCalendarEvents({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });

  const { data: onThisDay, isLoading: loadingOnThisDay, isError: onThisDayError, refetch: refetchOnThisDay } = useGetOnThisDay();

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (date: Date) =>
    (events ?? []).filter((e) => isSameDay(new Date(e.date), date));

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const todayStr = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32">

      {/* Header */}
      <header className="px-5 pt-12 pb-5">
        <h1 className="text-[28px] font-extrabold leading-tight">Your Days ✨</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          The moments ahead and the ones worth revisiting.
        </p>
      </header>

      {/* ── Month Calendar ──────────────────────────────────────── */}
      <section className="mx-4 bg-white rounded-3xl border border-border shadow-sm mb-6 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold">{format(currentDate, "MMMM yyyy")}</h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-3">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-[11px] font-bold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {days.map((date, i) => {
              const dayEvents = getEventsForDay(date);
              const isCurrent = isToday(date);
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
              const inMonth = isSameMonth(date, currentDate);
              const hasEvent = dayEvents.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSameDay(date, selectedDate ?? new Date(0)) ? null : date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all active:scale-95 ${
                    isCurrent ? "bg-primary text-white font-bold" :
                    isSelected ? "bg-[#EAE3FF] text-primary font-bold ring-2 ring-primary/30" :
                    hasEvent ? "bg-[#FFF9F5] font-bold" :
                    "hover:bg-muted"
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  <span className="text-sm z-10">{format(date, "d")}</span>
                  {hasEvent && (
                    <span className="absolute -bottom-0.5 text-[8px] z-20 leading-none">
                      {EVENT_MARKERS[dayEvents[0].type] ?? "🎁"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Selected Date Panel ─────────────────────────────────── */}
      {selectedDate && (
        <section className="mx-4 mb-6 bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-xs font-extrabold text-primary uppercase tracking-widest mb-4">
            {format(selectedDate, "MMMM d")}
          </p>
          {selectedEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <span className="text-xl">{EVENT_MARKERS[e.type] ?? "🗓"}</span>
                  <div>
                    <p className="font-bold text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{e.type.replace(/_/g, " ")}</p>
                  </div>
                  {e.memoryId && (
                    <Link href={`/gifts/${e.memoryId}`} className="ml-auto">
                      <span className="text-xs font-bold text-primary bg-[#EAE3FF] px-2.5 py-1 rounded-full">Open</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground font-medium mb-3">Nothing marked here yet.</p>
              <Link href="/wrap">
                <button className="flex items-center gap-1.5 mx-auto text-sm font-bold text-primary bg-[#EAE3FF] px-4 py-2 rounded-full active:scale-95 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add a moment
                </button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── On This Day ─────────────────────────────────────────── */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
            On This Day
          </span>
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground font-medium">{todayStr}</span>
        </div>

        {onThisDayError ? (
          <DmErrorState message="We couldn't open this part of your Daymark." onRetry={refetchOnThisDay} />
        ) : loadingOnThisDay ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <GiftFromPastSkeleton key={i} />
            ))}
          </div>
        ) : onThisDay && onThisDay.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {onThisDay.map((m, i) => (
              <OnThisDayCard
                key={m.id}
                id={m.id}
                title={m.title}
                date={new Date(m.date).getFullYear().toString()}
                giftColor={m.giftColor}
                photoUrl={m.photoUrls?.[0]}
                story={m.story}
                rotate={i % 2 === 0 ? -1.5 : 1.2}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border p-8 flex flex-col items-center text-center shadow-sm">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="font-bold text-base mb-1">Nothing to revisit yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't saved any memories on this date in past years.
            </p>
            <Link href="/wrap">
              <button className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(104,71,245,0.25)] active:scale-95 transition-all">
                Wrap a Memory
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* ── Calendar errors ─────────────────────────────────────── */}
      {eventsError && (
        <div className="px-4 mt-4">
          <DmErrorState message="Couldn't load calendar events." onRetry={refetchEvents} />
        </div>
      )}
    </div>
  );
}
