/**
 * Public shared memory page — /m/:token
 *
 * Accessible without authentication.
 * Shows only owner-approved fields returned by the API.
 * Never exposes userId, email, participants, or private content.
 */
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { MapPin, Calendar, Gift } from "lucide-react";

interface SharedMemory {
  title: string;
  date: string;
  story: string | null;
  category: string;
  giftColor: string;
  photoUrls: string[];
  mood: string | null;
  location: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  everyday: "Everyday",
  travel: "Travel ✈️",
  food: "Food 🍜",
  people: "People 💜",
  nature: "Nature 🌿",
  celebration: "Celebration 🎉",
};

export default function SharedMemoryPage() {
  const [, params] = useRoute("/m/:token");
  const token = params?.token ?? "";

  const [memory, setMemory] = useState<SharedMemory | null>(null);
  const [error, setError] = useState<"not_found" | "expired" | "revoked" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/m/${token}`)
      .then(async (r) => {
        if (r.status === 410) {
          const d = await r.json();
          setError(d.error === "revoked" ? "revoked" : "expired");
          return;
        }
        if (!r.ok) { setError("not_found"); return; }
        const d = await r.json();
        setMemory(d.memory);
      })
      .catch(() => setError("not_found"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center px-4 py-10">
      {/* Daymark brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">D</div>
        <span className="font-bold text-lg tracking-tight">Daymark</span>
      </div>

      <div className="w-full max-w-[400px]">
        {loading && (
          <div className="flex justify-center pt-12">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}

        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">{error === "revoked" ? "🚫" : error === "expired" ? "⏰" : "💜"}</div>
            <h1 className="text-xl font-extrabold mb-2">
              {error === "revoked" ? "Link revoked" : error === "expired" ? "Link expired" : "Memory not found"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {error === "revoked"
                ? "The person who shared this memory has removed the link."
                : error === "expired"
                ? "This share link has expired. Ask the owner to share a new link."
                : "We couldn't find this shared memory."}
            </p>
          </motion.div>
        )}

        {!loading && memory && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Memory card — scrapbook feel */}
            <div
              className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] relative"
              style={{ transform: "rotate(-0.5deg)", borderRadius: 4 }}
            >
              {/* Tape strip */}
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 rounded-sm"
                style={{ background: "rgba(234,227,255,0.7)", transform: "rotate(-1deg) translateX(-50%) translateY(0)" }}
              />

              {/* Photos */}
              {memory.photoUrls.length > 0 && (
                <div className="p-3 pb-0">
                  <img
                    src={memory.photoUrls[0]}
                    alt={memory.title}
                    className="w-full object-cover rounded-sm"
                    style={{ maxHeight: 320 }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-5 pt-4">
                {/* Gift color dot + category */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: memory.giftColor }} />
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[memory.category] ?? memory.category}
                  </span>
                </div>

                <h1 className="text-xl font-extrabold text-foreground mb-1">{memory.title}</h1>

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(memory.date), "MMMM d, yyyy")}
                  </span>
                  {memory.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {memory.location}
                    </span>
                  )}
                </div>

                {memory.story && (
                  <p className="text-sm text-foreground italic leading-relaxed border-t border-dashed border-border/50 pt-3"
                    style={{ fontFamily: "cursive" }}>
                    "{memory.story}"
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Save your own memories as beautiful gifts
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(104,71,245,0.3)] hover:opacity-95 transition-all"
              >
                <Gift className="w-4 h-4" />
                Start your Daymark
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
