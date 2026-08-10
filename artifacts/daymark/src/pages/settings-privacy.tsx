import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  discoverableByUsername: boolean;
  discoverableByEmail: boolean;
  allowConnectionRequests: boolean;
  birthdayVisibility: "nobody" | "connections" | "all";
  defaultMemoryVisibility: "private" | "connections" | "public";
  defaultGlobeIdentity: "username" | "anonymous";
  defaultGlobeLocation: "city" | "region" | "country" | "hidden";
}

const DEFAULT_SETTINGS: PrivacySettings = {
  discoverableByUsername: true,
  discoverableByEmail: false,
  allowConnectionRequests: true,
  birthdayVisibility: "connections",
  defaultMemoryVisibility: "private",
  defaultGlobeIdentity: "anonymous",
  defaultGlobeLocation: "city",
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      aria-checked={value}
      role="switch"
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-muted/60 rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${value === o.value ? "bg-white shadow text-primary" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setSettings((prev) => ({
            ...prev,
            discoverableByUsername: d.user.discoverableByUsername ?? prev.discoverableByUsername,
            discoverableByEmail: d.user.discoverableByEmail ?? prev.discoverableByEmail,
          }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const update = <K extends keyof PrivacySettings>(key: K, val: PrivacySettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          discoverableByUsername: settings.discoverableByUsername,
          discoverableByEmail: settings.discoverableByEmail,
        }),
      });
      toast({ title: "Privacy settings saved 🛡️" });
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
        <h1 className="text-xl font-extrabold text-center">Privacy</h1>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center pt-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="px-5 pt-6 space-y-4">
          {/* Discoverability */}
          <Section title="Discoverability">
            <SettingRow label="Find me by @username" description="Others can search and find you">
              <Toggle value={settings.discoverableByUsername} onChange={(v) => update("discoverableByUsername", v)} />
            </SettingRow>
            <SettingRow label="Find me by email" description="Daymark contacts can find you">
              <Toggle value={settings.discoverableByEmail} onChange={(v) => update("discoverableByEmail", v)} />
            </SettingRow>
            <SettingRow label="Allow connection requests" description="People can send you connection requests">
              <Toggle value={settings.allowConnectionRequests} onChange={(v) => update("allowConnectionRequests", v)} />
            </SettingRow>
          </Section>

          {/* Birthday */}
          <Section title="Birthday visibility">
            <div className="px-1">
              <SegmentedControl
                options={[
                  { value: "nobody", label: "Nobody" },
                  { value: "connections", label: "Connections" },
                  { value: "all", label: "Everyone" },
                ]}
                value={settings.birthdayVisibility}
                onChange={(v) => update("birthdayVisibility", v)}
              />
            </div>
          </Section>

          {/* Memory defaults */}
          <Section title="Memory defaults">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2">Default memory visibility</p>
                <SegmentedControl
                  options={[
                    { value: "private", label: "Private" },
                    { value: "connections", label: "Friends" },
                    { value: "public", label: "Public" },
                  ]}
                  value={settings.defaultMemoryVisibility}
                  onChange={(v) => update("defaultMemoryVisibility", v)}
                />
              </div>
            </div>
          </Section>

          {/* Globe defaults */}
          <Section title="Memory Globe defaults">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2">Identity</p>
                <SegmentedControl
                  options={[
                    { value: "username", label: "@username" },
                    { value: "anonymous", label: "Anonymous" },
                  ]}
                  value={settings.defaultGlobeIdentity}
                  onChange={(v) => update("defaultGlobeIdentity", v)}
                />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Location precision</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["city", "region", "country", "hidden"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => update("defaultGlobeLocation", l)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${settings.defaultGlobeLocation === l ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <div className="bg-[#EAE3FF]/50 rounded-2xl p-4 text-xs text-primary font-medium leading-relaxed">
            🛡️ Daymark defaults favor privacy. Your memories and personal details are never shared without your explicit action.
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full h-12 bg-primary text-white rounded-full font-bold text-sm shadow-[0_0_16px_rgba(104,71,245,0.25)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Privacy Settings</>}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden"
    >
      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="px-5 pb-4 pt-2 space-y-4 divide-y divide-border/40">
        {children}
      </div>
    </motion.div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 pt-3 first:pt-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
