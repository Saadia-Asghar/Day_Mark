/**
 * DaymarkCharacter — the single source of truth for all mascot rendering.
 *
 * Usage:
 *   <DaymarkCharacter character="marky" pose="wave" size="md" animation="float" />
 */

import { motion, useReducedMotion, type Variants, type Transition } from "framer-motion";

// ─── v2 assets (vivid purple palette) ────────────────────────────────────────
import markyWave        from "@assets/characters/v2/marky_wave.png";
import markyIdle        from "@assets/characters/v2/marky_idle.png";
import markyCelebrate   from "@assets/characters/v2/marky_celebrate.png";
import markyHoldingGift from "@assets/characters/v2/marky_holding_gift.png";
import markyThinking    from "@assets/characters/v2/marky_thinking.png";
import markyEnvelope    from "@assets/characters/v2/marky_envelope.png";
import markyPeek        from "@assets/characters/v2/marky_peek.png";
import heartyIdle       from "@assets/characters/v2/hearty_idle.png";
import calIdle          from "@assets/characters/v2/cal_idle.png";
import pixIdle          from "@assets/characters/v2/pix_idle.png";

// ─── Types ────────────────────────────────────────────────────────────────────
export type DaymarkCharacterName = "marky" | "hearty" | "cal" | "pix" | "stella";

export type DaymarkPose =
  | "idle"
  | "wave"
  | "holdingGift"
  | "peek"
  | "celebrate"
  | "sleep"
  | "thinking"
  | "envelope"
  | "globe"
  | "empty"
  | "catching"
  | "peeking"
  | "sleeping";

export type DaymarkSize = "xs" | "sm" | "md" | "lg" | "hero";

export type DaymarkAnimation =
  | "none"
  | "float"
  | "wave"
  | "bounceOnce"
  | "peek"
  | "celebrate"
  | "sleep"
  | "catch";

// ─── Asset map ───────────────────────────────────────────────────────────────
const ASSET_MAP: Record<DaymarkCharacterName, Partial<Record<DaymarkPose, string>>> = {
  marky: {
    idle:        markyIdle,
    wave:        markyWave,
    holdingGift: markyHoldingGift,
    celebrate:   markyCelebrate,
    catching:    markyCelebrate,
    thinking:    markyThinking,
    envelope:    markyEnvelope,
    peek:        markyPeek,
    peeking:     markyPeek,
    globe:       markyWave,
    sleep:       markyIdle,
    sleeping:    markyIdle,
    empty:       markyIdle,
  },
  hearty: {
    idle:    heartyIdle,
    wave:    heartyIdle,
    empty:   heartyIdle,
    sleep:   heartyIdle,
    peek:    heartyIdle,
    peeking: heartyIdle,
  },
  cal: {
    idle:    calIdle,
    wave:    calIdle,
    empty:   calIdle,
    sleep:   calIdle,
  },
  pix: {
    idle:    pixIdle,
    wave:    pixIdle,
    empty:   pixIdle,
    sleep:   pixIdle,
  },
  stella: {
    // stella not yet generated — fallback to marky wave
    idle:    markyWave,
    wave:    markyWave,
    empty:   markyIdle,
  },
};

// ─── Size map ─────────────────────────────────────────────────────────────────
const SIZE_MAP: Record<DaymarkSize, string> = {
  xs:   "w-10 h-10",    //  40px
  sm:   "w-16 h-16",    //  64px
  md:   "w-24 h-24",    //  96px
  lg:   "w-36 h-36",    // 144px
  hero: "w-48 h-48",    // 192px
};

// ─── Animation presets ───────────────────────────────────────────────────────
type MotionTarget = Parameters<typeof motion.div>[0]["animate"];
type MotionInitial = Parameters<typeof motion.div>[0]["initial"];

interface AnimPreset {
  animate: MotionTarget;
  transition: Transition;
  initial?: MotionInitial;
}

const float    : AnimPreset = { animate: { y: [0, -6, 0] },                         transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } };
const waveAnim : AnimPreset = { animate: { rotate: [0, 14, -8, 14, 0] },            transition: { duration: 1.2, ease: "easeInOut" } };
const bounce   : AnimPreset = { animate: { y: [0, -12, 0] },                        transition: { duration: 0.6, ease: "easeOut" } };
const peekAnim : AnimPreset = { initial: { y: 24, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.5, ease: "easeOut" } };
const celebrate: AnimPreset = { animate: { scale: [1, 1.1, 1], y: [0, -12, 0] },   transition: { duration: 0.75, ease: "easeInOut" } };
const sleep    : AnimPreset = { animate: { y: [0, -3, 0], rotate: [0, 2, 0] },     transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } };
const catchAnim: AnimPreset = { animate: { y: [0, -16, 0], scale: [1, 1.08, 1] },  transition: { duration: 0.8, ease: "easeOut" } };

const ANIMS: Record<DaymarkAnimation, AnimPreset | null> = {
  none: null,
  float:      float,
  wave:       waveAnim,
  bounceOnce: bounce,
  peek:       peekAnim,
  celebrate:  celebrate,
  sleep:      sleep,
  catch:      catchAnim,
};

// ─── Component ───────────────────────────────────────────────────────────────
interface DaymarkCharacterProps {
  character?: DaymarkCharacterName;
  pose?: DaymarkPose;
  size?: DaymarkSize;
  animation?: DaymarkAnimation;
  className?: string;
  onTap?: () => void;
  alt?: string;
}

export function DaymarkCharacter({
  character = "marky",
  pose = "idle",
  size = "md",
  animation = "float",
  className = "",
  onTap,
  alt,
}: DaymarkCharacterProps) {
  const reduced = useReducedMotion() ?? false;
  const src = ASSET_MAP[character]?.[pose] ?? ASSET_MAP[character]?.idle ?? markyIdle;
  const sizeClass = SIZE_MAP[size];

  const preset = !reduced && animation !== "none" ? ANIMS[animation] : null;

  return (
    <motion.div
      className={`inline-flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}
      style={{ filter: "drop-shadow(0 6px 12px rgba(48,32,96,0.18))" }}
      initial={preset?.initial}
      animate={preset?.animate}
      transition={preset?.transition}
      whileTap={!reduced && onTap ? { scale: 1.1, rotate: 5 } : undefined}
      onClick={onTap}
    >
      <img
        src={src}
        alt={alt ?? `${character} ${pose}`}
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
        loading="lazy"
      />
    </motion.div>
  );
}
