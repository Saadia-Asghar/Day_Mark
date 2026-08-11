import { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListPeople } from "@workspace/api-client-react";
import { Plus, Search } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { DmErrorState } from "@/components/daymark";
import { ScrapbookPortrait, TapeStrip } from "@/components/scrapbook";
import { DaymarkCharacter } from "@/components/daymark-character";

const ROTATIONS = [-2.5, 1.8, -1.2, 2.1, -1.8, 1.4, -2, 1.5];

function getBirthdayLabel(birthday?: string | null): string | null {
  if (!birthday) return null;
  const today = new Date();
  const bday = new Date(birthday);
  bday.setFullYear(today.getFullYear());
  if (bday < today) bday.setFullYear(today.getFullYear() + 1);
  const days = differenceInDays(bday, today);
  if (days === 0) return "Birthday today!";
  if (days === 1) return "Birthday tomorrow";
  if (days <= 30) return `Birthday in ${days}d`;
  return `Birthday ${format(new Date(birthday), "MMM d")}`;
}

export default function PeoplePage() {
  const { data: people, isLoading, isError, refetch } = useListPeople();
  const [search, setSearch] = useState("");

  const filtered = (people ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-32">

      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-[28px] font-extrabold leading-tight">The People in Your Story</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Every memory is better when you remember who was there.
        </p>
      </header>

      {/* Search */}
      {people && people.length > 0 && (
        <div className="px-5 mb-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-white border border-border rounded-2xl pl-11 pr-4 py-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      )}

      {isError ? (
        <DmErrorState message="We couldn't load your people." onRetry={refetch} />
      ) : isLoading ? (
        <div className="px-5 grid grid-cols-2 gap-4 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="px-5 grid grid-cols-2 gap-4">
          {filtered.map((person, i) => {
            const rotate = ROTATIONS[i % ROTATIONS.length];
            const bdayLabel = getBirthdayLabel(person.birthday);

            return (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link href={`/people/${person.id}`} className="block outline-none">
                  <div
                    className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.09)] p-4 flex flex-col items-center gap-3 active:scale-[0.97] transition-transform"
                    style={{ transform: `rotate(${rotate}deg)`, borderRadius: 4 }}
                  >
                    {/* Tape corner */}
                    <TapeStrip rotate={-5} className="-top-2 left-1/2 -translate-x-1/2" />

                    {/* Portrait */}
                    <div
                      className="bg-[#EAE3FF] rounded-sm overflow-hidden border-4 border-white shadow-md"
                      style={{ width: 88, height: 88 }}
                    >
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary">{person.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="text-center">
                      <p className="font-bold text-sm leading-tight">{person.name}</p>
                      {person.relationship && (
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{person.relationship}</p>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                      {person.memoriesCount != null && (
                        <span>{person.memoriesCount} memories</span>
                      )}
                      {bdayLabel && (
                        <span>{bdayLabel}</span>
                      )}
                    </div>

                    {/* Heart sticker */}
                    <div className="absolute top-2 right-2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                      <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* Add person — empty printed-photo slot */}
          <Link href="/wrap">
            <div
              className="relative bg-white shadow-sm p-4 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border active:scale-[0.97] transition-transform"
              style={{ transform: "rotate(1.2deg)", borderRadius: 4, minHeight: 180 }}
            >
              <div
                className="w-[88px] h-[88px] bg-[#FFF9F5] border-2 border-dashed border-border/60 flex items-center justify-center"
                style={{ borderRadius: 2 }}
              >
                <Plus className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground text-center">Add someone</p>
            </div>
          </Link>
        </div>
      ) : people && people.length === 0 ? (
        <div className="px-5 mt-12 flex flex-col items-center text-center">
          <DaymarkCharacter character="hearty" pose="idle" size="lg" animation="float" className="mb-5" />
          <h2 className="text-xl font-bold mb-1">Every story begins with someone.</h2>
          <p className="text-sm text-muted-foreground mb-7 max-w-xs">
            Add the people who make your memories worth keeping.
          </p>
          <Link href="/wrap">
            <button className="bg-primary text-white px-8 py-3.5 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] flex items-center gap-2 active:scale-95 transition-all">
              <Plus className="w-5 h-5" /> Add your first person
            </button>
          </Link>
        </div>
      ) : (
        /* Empty search result */
        <div className="px-5 mt-12 text-center">
          <p className="text-muted-foreground font-medium">No one matches "{search}"</p>
        </div>
      )}
    </div>
  );
}
