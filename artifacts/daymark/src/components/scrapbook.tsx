/**
 * Daymark — Shared Scrapbook Components
 * Physical, memory-shelf visual language for the whole app.
 */
import { useReducedMotion, motion, AnimatePresence } from "framer-motion";
import { MapPin, Image as ImageIcon } from "lucide-react";
import markyWaving from "@assets/generated_images/marky_waving.png";
import markyCelebrating from "@assets/generated_images/marky_celebrating.png";
import { Link } from "wouter";

// ── TapeStrip ─────────────────────────────────────────────────────────────
interface TapeStripProps {
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}
export function TapeStrip({ rotate = -3, className = "", style }: TapeStripProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute w-10 h-[18px] rounded-[3px] z-20 ${className}`}
      style={{
        background: "rgba(253,241,200,0.9)",
        border: "1px solid rgba(210,170,50,0.25)",
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        ...style,
      }}
    />
  );
}

// ── DateStamp ─────────────────────────────────────────────────────────────
export function DateStamp({ date, className = "" }: { date: string; className?: string }) {
  return (
    <span
      className={`inline-block bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] font-mono text-white ${className}`}
    >
      {date}
    </span>
  );
}

// ── LocationStamp ─────────────────────────────────────────────────────────
export function LocationStamp({ location, className = "" }: { location: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm ${className}`}
    >
      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
      <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]">{location}</span>
    </div>
  );
}

// ── GiftTag ───────────────────────────────────────────────────────────────
const GIFT_TAG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  friends:      { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-300" },
  family:       { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-300" },
  travel:       { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-300" },
  college:      { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-300" },
  achievements: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-300" },
  everyday:     { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-300" },
};
export function GiftTag({ category }: { category: string }) {
  const s = GIFT_TAG_COLORS[category.toLowerCase()] ?? GIFT_TAG_COLORS.everyday;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      <div className={`w-2 h-2 rounded-full ${s.dot}`} />
      {category}
    </div>
  );
}

// ── MoodSticker ───────────────────────────────────────────────────────────
const MOOD_EMOJI: Record<string, string> = {
  Happy: "☀️", Emotional: "🥹", Peaceful: "🌿",
  Chaotic: "😂", Proud: "✨", Grateful: "💜", Nostalgic: "🌙",
};
export function MoodSticker({ mood, className = "" }: { mood: string; className?: string }) {
  return (
    <div className={`w-9 h-9 rounded-full bg-white shadow-sm border border-border flex items-center justify-center text-lg ${className}`}>
      {MOOD_EMOJI[mood] ?? "✨"}
    </div>
  );
}

// ── ScrapbookPortrait ─────────────────────────────────────────────────────
interface ScrapbookPortraitProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  rotate?: number;
  memoriesCount?: number;
  href?: string;
}
export function ScrapbookPortrait({ name, avatarUrl, size = 64, rotate = 0, memoriesCount, href }: ScrapbookPortraitProps) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size + 16 }}>
      <div
        className="bg-white shadow-md border border-white/50"
        style={{
          padding: 5,
          borderRadius: "50%",
          transform: `rotate(${rotate}deg)`,
        }}
      >
        <div
          className="rounded-full bg-[#EAE3FF] flex items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="font-bold text-primary" style={{ fontSize: size * 0.35 }}>
              {name.charAt(0)}
            </span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-bold text-center truncate" style={{ maxWidth: size + 16 }}>{name}</span>
      {memoriesCount != null && (
        <span className="text-[10px] text-muted-foreground font-semibold -mt-1">{memoriesCount}m</span>
      )}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ── StoryLetter ───────────────────────────────────────────────────────────
export function StoryLetter({ story, className = "" }: { story: string; className?: string }) {
  return (
    <div className={`relative bg-[#FFFDF7] border border-amber-100 rounded-2xl p-5 shadow-sm ${className}`}>
      {/* Folded corner */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-amber-100 rounded-bl-2xl" aria-hidden="true" />
      {/* Quote mark */}
      <div className="text-[48px] text-primary/15 font-serif leading-none select-none absolute -top-2 left-3">"</div>
      {/* Ruled lines */}
      <div className="space-y-3 relative z-10 pt-2">
        <p
          className="text-sm leading-7 text-foreground whitespace-pre-wrap"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {story}
        </p>
      </div>
    </div>
  );
}

// ── RibbonDivider ─────────────────────────────────────────────────────────
export function RibbonDivider({ color = "#6847F5" }: { color?: string }) {
  return (
    <div className="flex items-center gap-2 my-4" aria-hidden="true">
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${color}60` }} />
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
    </div>
  );
}

// ── SealedGiftCard ────────────────────────────────────────────────────────
interface SealedGiftCardProps {
  title: string;
  recipientName: string;
  unlockDate: string;
  daysLeft: number;
  isReady: boolean;
  isUnlockingSoon: boolean;
  giftColor?: string;
  id?: number;
}
export function SealedGiftCard({
  title,
  recipientName,
  unlockDate,
  daysLeft,
  isReady,
  isUnlockingSoon,
  giftColor = "#6847F5",
  id,
}: SealedGiftCardProps) {
  return (
    <div
      className={`relative bg-white rounded-3xl overflow-hidden border shadow-sm ${
        isReady ? "border-primary shadow-primary/10" : "border-border"
      }`}
    >
      {/* Glow for ready state */}
      {isReady && (
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${giftColor}, transparent 70%)` }}
        />
      )}
      {/* Unlocking-soon soft glow */}
      {isUnlockingSoon && !isReady && (
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none animate-pulse"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${giftColor}, transparent 70%)` }}
        />
      )}

      {/* Top accent stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: giftColor }} />

      <div className="p-5">
        {/* Gift box illustration */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* CSS gift box */}
              <div className="w-12 h-12 relative">
                <div className="absolute bottom-0 left-0 right-0 h-8 rounded-lg" style={{ backgroundColor: giftColor }} />
                <div className="absolute top-2 left-[-2px] right-[-2px] h-3 rounded-lg" style={{ backgroundColor: giftColor, filter: "brightness(0.85)" }} />
                {/* Ribbon */}
                <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-1.5 bg-white/50 rounded-full" />
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-white/40 rounded-full" />
                {/* Bow */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-px">
                  <div className="w-3 h-3 rounded-full bg-white/70" />
                  <div className="w-3 h-3 rounded-full bg-white/70" />
                </div>
                {/* Lock tag */}
                {!isReady && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-border shadow-sm flex items-center justify-center">
                    <span className="text-[9px]">🔒</span>
                  </div>
                )}
                {isReady && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full shadow-sm flex items-center justify-center">
                    <span className="text-[9px]">🎁</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground font-medium">For {recipientName}</p>
            </div>
          </div>
          {/* State badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              isReady
                ? "bg-emerald-100 text-emerald-700"
                : isUnlockingSoon
                ? "bg-amber-100 text-amber-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isReady ? "Open" : isUnlockingSoon ? "Soon" : "Sealed"}
          </div>
        </div>

        {/* Unlock info */}
        <div className="bg-[#FFF9F5] rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              {isReady ? "Ready to open!" : `Opens in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </span>
            <span className="font-bold text-sm text-foreground">{unlockDate}</span>
          </div>
          {isReady && id && (
            <Link href={`/gifts/${id}`}>
              <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm shadow-primary/20 active:scale-95 transition-all">
                Open Gift
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── OnThisDayCard ─────────────────────────────────────────────────────────
interface OnThisDayCardProps {
  id: number;
  title: string;
  date: string;
  giftColor: string;
  photoUrl?: string;
  story?: string | null;
  rotate?: number;
}
export function OnThisDayCard({ id, title, date, giftColor, photoUrl, story, rotate = -1 }: OnThisDayCardProps) {
  return (
    <Link href={`/gifts/${id}`} className="block outline-none">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)]"
        style={{ transform: `rotate(${rotate}deg)`, borderRadius: 4 }}
      >
        {/* Tape */}
        <TapeStrip rotate={-3} className="-top-2 left-5" />

        <div className="p-2.5 pb-0">
          <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
            {photoUrl ? (
              <img src={photoUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div
                className="w-full h-full flex items-end p-3"
                style={{ background: `linear-gradient(135deg, ${giftColor}, ${giftColor}99)` }}
              >
                <span className="text-white font-bold text-sm">{title}</span>
              </div>
            )}
            <DateStamp date={date} className="absolute top-2 right-2" />
          </div>
        </div>
        <div className="px-3 pt-2 pb-4">
          <p className="font-bold text-sm text-foreground leading-snug">{title}</p>
          {story && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic" style={{ fontFamily: "cursive" }}>
              "{story}"
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── GiftFromPastSkeleton ──────────────────────────────────────────────────
export function GiftFromPastSkeleton() {
  return (
    <div className="bg-white shadow-md rounded-sm" style={{ transform: "rotate(-1.3deg)" }}>
      <div className="p-2.5 pb-0">
        <div className="animate-pulse bg-muted" style={{ aspectRatio: "4/3" }} />
      </div>
      <div className="px-3 pt-3 pb-5 space-y-2">
        <div className="h-4 bg-muted rounded-full animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded-full animate-pulse w-1/2" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex -space-x-2">
            {[1, 2].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-muted animate-pulse border-2 border-white" />
            ))}
          </div>
          <div className="h-8 w-32 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── EmptyPastGiftState ────────────────────────────────────────────────────
export function EmptyPastGiftState() {
  return (
    <div className="bg-white rounded-3xl border border-border shadow-sm p-8 text-center flex flex-col items-center">
      <div className="relative mb-4">
        <img src={markyWaving} alt="Marky" className="w-20 h-20" />
        {/* Empty gift box beside Marky */}
        <div className="absolute -right-4 bottom-0 w-10 h-10">
          <div className="absolute bottom-0 left-0 right-0 h-6 rounded-md bg-[#EAE3FF] border border-primary/20" />
          <div className="absolute top-1.5 left-[-1px] right-[-1px] h-2.5 rounded-md bg-[#D4C8FF]" />
        </div>
      </div>
      <h3 className="font-bold text-base text-foreground mb-1">
        Your first gift from the past is still being made.
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-[230px]">
        Save a few moments today and Daymark will bring one back to you later.
      </p>
      <Link
        href="/wrap"
        className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_0_16px_rgba(104,71,245,0.25)] active:scale-95 transition-all"
      >
        Wrap a Memory
      </Link>
    </div>
  );
}

// ── PhysicalGiftAnimation ─────────────────────────────────────────────────
// Deterministic particles — positions computed from index, no Math.random()
const PARTICLES = [
  { x: "10%", y: "20%", color: "#6847F5", size: 8 },
  { x: "25%", y: "15%", color: "#FF719D", size: 6 },
  { x: "50%", y: "8%",  color: "#FFC857", size: 10 },
  { x: "75%", y: "20%", color: "#75C8FF", size: 7 },
  { x: "88%", y: "12%", color: "#9CE2B1", size: 9 },
  { x: "15%", y: "35%", color: "#FFB58A", size: 6 },
  { x: "65%", y: "30%", color: "#6847F5", size: 8 },
  { x: "82%", y: "40%", color: "#FF719D", size: 5 },
];

const RIBBON_COLORS: Record<string, string> = {
  Classic: "#FFFFFF",
  Heart:   "#FF719D",
  Stars:   "#FFC857",
  Minimal: "rgba(255,255,255,0.5)",
};

interface PhysicalGiftAnimationProps {
  giftColor: string;
  ribbon: string;
  photoUrl?: string | null;
  mood?: string;
  successTitle?: string;
  successMessage?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function PhysicalGiftAnimation({
  giftColor,
  ribbon,
  photoUrl,
  successTitle = "It's safe with us. 💜",
  successMessage = "Another little piece of your life, beautifully kept.",
  primaryHref = "/gifts",
  primaryLabel = "View Gifts",
  secondaryHref = "/home",
  secondaryLabel = "Back Home",
}: PhysicalGiftAnimationProps) {
  const reducedMotion = useReducedMotion();
  const rbColor = RIBBON_COLORS[ribbon] ?? "#FFFFFF";

  if (reducedMotion) {
    // Immediately show success state — no animation
    return (
      <div className="flex flex-col items-center justify-center text-center px-5 py-12">
        <div className="mb-6">
          <CSSGiftBox color={giftColor} rbColor={rbColor} photoUrl={photoUrl} />
        </div>
        <h2 className="text-3xl font-bold mb-2">{successTitle}</h2>
        <p className="text-muted-foreground font-medium mb-8 px-4">{successMessage}</p>
        <SuccessButtons primaryHref={primaryHref} primaryLabel={primaryLabel} secondaryHref={secondaryHref} secondaryLabel={secondaryLabel} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#FFF9F5] z-50 flex flex-col items-center justify-center text-center px-5 overflow-hidden">
      {/* Deterministic confetti particles */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: "-5vh", x: p.x, opacity: 1, scale: 0.6 }}
          animate={{ y: "110vh", rotate: 360, opacity: [1, 1, 0] }}
          transition={{ duration: 2.5, delay: 0.9 + i * 0.08, ease: "easeOut" }}
          className="absolute top-0 rounded-full pointer-events-none"
          style={{ backgroundColor: p.color, width: p.size, height: p.size, left: p.x }}
        />
      ))}

      {/* The gift — full animation sequence */}
      <motion.div className="mb-8 relative">
        {/* Step 1: Gift box scales in */}
        <motion.div
          initial={{ scale: 0.4, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.45, duration: 0.7 }}
          className="relative"
        >
          {/* Step 2-4: Photo slides into box from above, lid animation via CSS gift */}
          {photoUrl && (
            <motion.div
              initial={{ y: -60, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.75 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-12 rounded-lg overflow-hidden border-2 border-white shadow-md z-10"
            >
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            </motion.div>
          )}

          <CSSGiftBox
            color={giftColor}
            rbColor={rbColor}
            photoUrl={photoUrl}
            animateLid
          />

          {/* Step 5-6: Ribbons wrap — scale in from center */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.8 }}
            className="absolute top-1/2 left-0 right-0 h-3 -translate-y-1/2 rounded-full opacity-60"
            style={{ backgroundColor: rbColor }}
          />
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.85 }}
            className="absolute left-1/2 top-0 bottom-0 w-3 -translate-x-1/2 rounded-full opacity-60"
            style={{ backgroundColor: rbColor }}
          />

          {/* Step 7: Bow pops in */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.7, duration: 0.35, delay: 0.95 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-0.5"
          >
            <div className="w-6 h-6 rounded-full opacity-80" style={{ backgroundColor: rbColor }} />
            <div className="w-6 h-6 rounded-full opacity-80" style={{ backgroundColor: rbColor }} />
          </motion.div>

          {/* Step 8: Gift tag attaches */}
          <motion.div
            initial={{ y: -20, opacity: 0, rotate: -10 }}
            animate={{ y: 0, opacity: 1, rotate: -5 }}
            transition={{ type: "spring", bounce: 0.5, delay: 1.0, duration: 0.3 }}
            className="absolute -bottom-3 -right-4 bg-white rounded-lg px-2 py-1 shadow-md border border-border text-[9px] font-bold text-muted-foreground"
            style={{ transform: "rotate(-5deg)" }}
          >
            🎁 Memory
          </motion.div>
        </motion.div>

        {/* Step 9: Marky enters from right */}
        <motion.img
          src={markyCelebrating}
          alt="Marky celebrating"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="absolute -bottom-8 -right-10 w-16 h-16 drop-shadow-md pointer-events-none"
        />
      </motion.div>

      {/* Step 10: Success message */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-6"
      >
        <h2 className="text-3xl font-bold mb-2">{successTitle}</h2>
        <p className="text-muted-foreground font-medium mb-10 px-4">{successMessage}</p>
        <SuccessButtons
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          secondaryHref={secondaryHref}
          secondaryLabel={secondaryLabel}
        />
      </motion.div>
    </div>
  );
}

function CSSGiftBox({
  color,
  rbColor,
  photoUrl,
  animateLid = false,
}: {
  color: string;
  rbColor: string;
  photoUrl?: string | null;
  animateLid?: boolean;
}) {
  return (
    <div className="relative w-40 h-48 mx-auto">
      {/* Box body */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 rounded-2xl overflow-hidden"
        style={{ backgroundColor: color, boxShadow: `0 8px 32px ${color}60` }}
      >
        {photoUrl && (
          <div className="absolute inset-0 opacity-30">
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      {/* Lid */}
      <motion.div
        className="absolute top-7 left-[-4px] right-[-4px] h-11 rounded-2xl"
        style={{ backgroundColor: color, filter: "brightness(0.85)", boxShadow: `0 4px 12px ${color}40` }}
        animate={animateLid ? { y: [-8, 0] } : {}}
        transition={{ duration: 0.3, delay: 0.7, ease: "easeOut" }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 opacity-50 rounded-full" style={{ backgroundColor: rbColor }} />
      </motion.div>
    </div>
  );
}

function SuccessButtons({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="w-full max-w-xs mx-auto space-y-3">
      <Link
        href={primaryHref}
        className="flex items-center justify-center w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all"
      >
        {primaryLabel}
      </Link>
      <Link
        href={secondaryHref}
        className="flex items-center justify-center w-full bg-white border border-border text-foreground py-4 rounded-full text-lg font-bold active:scale-95 transition-all"
      >
        {secondaryLabel}
      </Link>
    </div>
  );
}
