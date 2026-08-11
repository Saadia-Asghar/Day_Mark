import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  discoverableByUsername: boolean;
  discoverableByEmail: boolean;
  allowConnectionRequests: boolean;
  birthdayVisibility: "nobody" | "connections" | "public_badge";
  allowBirthdayWishesFromConnections: boolean;
  allowBirthdayWishesFromGlobe: boolean;
  defaultMemoryVisibility: "private" | "connections" | "public";
  defaultGlobeIdentity: "anonymous" | "username";
  defaultGlobeLocation: "city" | "region" | "country" | "hidden";
  showPublicProfile: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  discoverableByUsername: true,
  discoverableByEmail: false,
  allowConnectionRequests: true,
  birthdayVisibility: "nobody",
  allowBirthdayWishesFromConnections: true,
  allowBirthdayWishesFromGlobe: false,
  defaultMemoryVisibility: "private",
  defaultGlobeIdentity: "anonymous",
  defaultGlobeLocation: "city",
  showPublicProfile: false,
};

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
          const u = d.user;
          setSettings((prev) => ({
            ...prev,
            discoverableByUsername: u.discoverableByUsername ?? prev.discoverableByUsername,
            discoverableByEmail: u.discoverableByEmail ?? prev.discoverableByEmail,
            allowConnectionRequests: u.allowConnectionRequests ?? prev.allowConnectionRequests,
            birthdayVisibility: (u.birthdayVisibility as PrivacySettings["birthdayVisibility"]) ?? prev.birthdayVisibility,
            allowBirthdayWishesFromConnections: u.allowBirthdayWishesFromConnections ?? prev.allowBirthdayWishesFromConnections,
            allowBirthdayWishesFromGlobe: u.allowBirthdayWishesFromGlobe ?? prev.allowBirthdayWishesFromGlobe,
            defaultMemoryVisibility: (u.defaultMemoryVisibility as PrivacySettings["defaultMemoryVisibility"]) ?? prev.defaultMemoryVisibility,
            defaultGlobeIdentity: (u.defaultGlobeIdentity as PrivacySettings["defaultGlobeIdentity"]) ?? prev.defaultGlobeIdentity,
            defaultGlobeLocation: (u.defaultGlobeLocation as PrivacySettings["defaultGlobeLocation"]) ?? prev.defaultGlobeLocation,
            showPublicProfile: u.showPublicProfile ?? prev.showPublicProfile,
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
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Server error");
      toast({ title: "Privacy settings saved" });
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
        <div className="flex justify-center pt-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-5 pt-6 space-y-4">
          {/* Discoverability */}
          <Section title="Who can find you">
            <SettingRow label="Find by username" description="Let people search your @handle to send a connection request">
              <Toggle value={settings.discoverableByUsername} onChange={(v) => update("discoverableByUsername", v)} />
            </SettingRow>
            <SettingRow label="Find by email" description="Let people find you if they know your email address">
              <Toggle value={settings.discoverableByEmail} onChange={(v) => update("discoverableByEmail", v)} />
            </SettingRow>
            <SettingRow label="Accept connection requests" description="New people can ask to connect with you">
              <Toggle value={settings.allowConnectionRequests} onChange={(v) => update("allowConnectionRequests", v)} />
            </SettingRow>
            <SettingRow label="Show public profile" description="Your username and bio are visible on share links and the Globe">
              <Toggle value={settings.showPublicProfile} onChange={(v) => update("showPublicProfile", v)} />
            </SettingRow>
          </Section>

          {/* Birthday */}
          <Section title="Your birthday">
            <SettingRow label="Birthday visibility" description="Controls who sees your birthday in Daymark">
              <div className="w-[200px]">
                <SegmentedControl
                  options={[
                    { value: "nobody", label: "Private" },
                    { value: "connections", label: "Friends" },
                    { value: "public_badge", label: "Globe" },
                  ]}
                  value={settings.birthdayVisibility}
                  onChange={(v) => update("birthdayVisibility", v)}
                />
              </div>
            </SettingRow>
            <SettingRow label="Birthday wishes from connections" description="Friends can send you a wish on your birthday">
              <Toggle value={settings.allowBirthdayWishesFromConnections} onChange={(v) => update("allowBirthdayWishesFromConnections", v)} />
            </SettingRow>
            <SettingRow label="Birthday wishes from Globe" description="Globe visitors can send a predefined birthday wish">
              <Toggle value={settings.allowBirthdayWishesFromGlobe} onChange={(v) => update("allowBirthdayWishesFromGlobe", v)} />
            </SettingRow>
          </Section>

          {/* Memory defaults */}
          <Section title="New memory defaults">
            <SettingRow label="Default memory visibility" description="Who sees memories you add (can be changed per memory)">
              <div className="w-[200px]">
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
            </SettingRow>
          </Section>

          {/* Globe defaults */}
          <Section title="Globe defaults">
            <SettingRow label="Globe identity" description="How your name appears on the Globe">
              <div className="w-[160px]">
                <SegmentedControl
                  options={[
                    { value: "anonymous", label: "Anonymous" },
                    { value: "username", label: "@username" },
                  ]}
                  value={settings.defaultGlobeIdentity}
                  onChange={(v) => update("defaultGlobeIdentity", v)}
                />
              </div>
            </SettingRow>
            <SettingRow label="Globe location detail" description="How precisely your location appears on the Globe">
              <div className="w-[200px]">
                <SegmentedControl
                  options={[
                    { value: "city", label: "City" },
                    { value: "region", label: "Region" },
                    { value: "country", label: "Country" },
                    { value: "hidden", label: "Hidden" },
                  ]}
                  value={settings.defaultGlobeLocation}
                  onChange={(v) => update("defaultGlobeLocation", v)}
                />
              </div>
            </SettingRow>
          </Section>

          <div className="bg-[#EAE3FF]/50 rounded-2xl p-4 text-xs text-primary font-medium leading-relaxed">
            Daymark defaults favor privacy. Your memories and personal details are never shared without your explicit action.
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
    <div className="flex items-start justify-between gap-4 pt-3 first:pt-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
