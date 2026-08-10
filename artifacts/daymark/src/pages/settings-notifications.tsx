import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotifKey =
  | "daylinkReminder"
  | "birthdayReminder"
  | "memoryAnniversaries"
  | "futureGiftReady"
  | "messagesForLater"
  | "connectionRequests"
  | "memoryDrop"
  | "globeReactions";

interface NotifSettings {
  daylinkReminder: boolean;
  birthdayReminder: boolean;
  memoryAnniversaries: boolean;
  futureGiftReady: boolean;
  messagesForLater: boolean;
  connectionRequests: boolean;
  memoryDrop: boolean;
  globeReactions: boolean;
}

const DEFAULT: NotifSettings = {
  daylinkReminder: true,
  birthdayReminder: true,
  memoryAnniversaries: true,
  futureGiftReady: true,
  messagesForLater: true,
  connectionRequests: true,
  memoryDrop: true,
  globeReactions: false,
};

const NOTIF_CONFIG: { key: NotifKey; label: string; description: string; emoji: string }[] = [
  { key: "daylinkReminder", emoji: "🎀", label: "Daylink reminder", description: "One nudge per relationship when you haven't added a moment today" },
  { key: "birthdayReminder", emoji: "🎂", label: "Birthday reminder", description: "Remind me a day before someone's birthday" },
  { key: "memoryAnniversaries", emoji: "✨", label: "Memory anniversaries", description: "When this day matches a memory from the past" },
  { key: "futureGiftReady", emoji: "🎁", label: "Future Gift ready", description: "When a scheduled memory unlocks" },
  { key: "messagesForLater", emoji: "💌", label: "Messages for Later", description: "When a scheduled message arrives" },
  { key: "connectionRequests", emoji: "💜", label: "Connection requests", description: "When someone wants to connect with you" },
  { key: "memoryDrop", emoji: "🫧", label: "Memory Drops", description: "When someone drops you a little moment" },
  { key: "globeReactions", emoji: "🌍", label: "Globe reactions", description: "When someone reacts to your Globe memory" },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      aria-checked={value}
      role="switch"
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const update = (key: NotifKey, val: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    // Stored client-side in localStorage for now (server-side notifications table coming next)
    try {
      localStorage.setItem("daymark_notif_settings", JSON.stringify(settings));
      toast({ title: "Notification preferences saved 🔔" });
    } catch {
      toast({ title: "Couldn't save", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFF9F5]/90 backdrop-blur-md border-b border-border/40 px-5 pt-14 pb-4">
        <Link href="/profile" className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold text-center">Notifications</h1>
      </div>

      <div className="px-5 pt-6 space-y-4">
        <p className="text-sm text-muted-foreground font-medium px-1">
          Choose which moments are worth your attention. Daymark avoids notification spam.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden"
        >
          <div className="divide-y divide-border/40">
            {NOTIF_CONFIG.map(({ key, emoji, label, description }) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </div>
                <Toggle value={settings[key]} onChange={(v) => update(key, v)} />
              </div>
            ))}
          </div>
        </motion.div>

        <div className="bg-[#EAE3FF]/50 rounded-2xl p-4 text-xs text-primary font-medium leading-relaxed">
          🔔 Daylink reminders fire at most once per relationship per day.
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 bg-primary text-white rounded-full font-bold text-sm shadow-[0_0_16px_rgba(104,71,245,0.25)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Preferences</>}
        </button>
      </div>
    </div>
  );
}
