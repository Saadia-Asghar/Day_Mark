---
name: Scrapbook component library
description: Where shared scrapbook/Memory Shelf visual components live and what they provide
---

## Location
`artifacts/daymark/src/components/scrapbook.tsx`

## Exported components
- `TapeStrip` — amber translucent tape strip with rotation
- `DateStamp` — black pill date overlay
- `LocationStamp` — white pill with MapPin icon
- `GiftTag` — colored category tag with dot
- `MoodSticker` — emoji in white circle
- `ScrapbookPortrait` — circular photo in white mat with rotation, optional href
- `StoryLetter` — folded-letter style story quote with ruled lines
- `RibbonDivider` — decorative horizontal divider with dots
- `SealedGiftCard` — sealed future gift card with locked/soon/ready states
- `OnThisDayCard` — polaroid-style card with tape strip
- `GiftFromPastSkeleton` — loading skeleton for the home giftFromPast section
- `EmptyPastGiftState` — warm empty state with Marky for no past gifts (correct text: "Your first gift from the past is still being made.")
- `PhysicalGiftAnimation` — full success animation (step-7 wrap, future gift seal); uses deterministic PARTICLES array (no Math.random during render); respects `useReducedMotion()`

## PhysicalGiftAnimation props
```ts
{
  giftColor: string;        // box color hex
  ribbon: string;           // "Classic" | "Heart" | "Stars" | "Minimal"
  photoUrl?: string | null;
  successTitle?: string;
  successMessage?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}
```

**Why:** All scrapbook visual language is centralized here to avoid duplication across the 6+ screens that use the Memory Shelf design.
