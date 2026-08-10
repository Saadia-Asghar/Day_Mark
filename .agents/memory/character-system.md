---
name: DaymarkCharacter v2 system
description: All mascot assets, component API, and pose/animation conventions for the unified character system
---

# DaymarkCharacter v2

## Component location
`artifacts/daymark/src/components/daymark-character.tsx`

## v2 assets (vivid purple palette)
All assets in `attached_assets/characters/v2/`:
- `marky_wave.png` — waving, full body visible
- `marky_idle.png` — neutral standing pose
- `marky_celebrate.png` — jumping with arms raised
- `marky_holding_gift.png` — cradling a gift box
- `marky_thinking.png` — finger on chin, thought bubble
- `marky_envelope.png` — holding sealed envelope
- `marky_peek.png` — peeking from bottom, shy
- `hearty_idle.png` — pink heart mascot, waving
- `cal_idle.png` — sky blue calendar mascot
- `pix_idle.png` — mint camera mascot

**Why:** Previous assets (v1 in `attached_assets/characters/`) were beige/cream-colored and washed out on #FFF9F5 backgrounds. v2 uses vivid purple #7B5CFF body, gold bow #FFC857, pink blush #FF8FB3.

**How to apply:** All pages use `<DaymarkCharacter>`. Do NOT import image files directly from character paths — add to the component's ASSET_MAP instead.

## Marky palette (spec)
- Main body: #7B5CFF
- Shadow: #5B3FE0
- Light lavender: #B9A8FF
- Bow: #FFC857
- Face: #211936
- Blush: #FF8FB3
- Heart accent: #FF719D

## Pose → asset mapping (Marky)
| Pose | Asset |
|------|-------|
| idle, empty, sleep, sleeping | marky_idle |
| wave, peeking, globe | marky_wave |
| holdingGift, catching | marky_holding_gift |
| celebrate | marky_celebrate |
| thinking | marky_thinking |
| envelope | marky_envelope |
| peek | marky_peek |

## Spec-correct poses per screen
- Auth landing: wave
- Sign-up form: holdingGift
- Email verify: envelope
- Sign-in: wave
- Forgot password (enter email): thinking
- Forgot password (code entry): envelope
- Forgot password success: celebrate
- Onboarding: slides use idle/celebrate/hearty
- Home header: wave
- Home gift card: celebrate
- Gifts empty: holdingGift
- Future gifts empty: holdingGift
- People empty: hearty idle
- Scrapbook: idle/celebrate

## Size guide (spec)
- xs (40px): tight UI inline
- sm (64px): compact header/form pairing
- md (96px): standard screen use
- lg (144px): empty states
- hero (192px): auth/onboarding hero

## Animation presets
- float: y[0,-6,0], 3.5s infinite (default idle)
- wave: rotate[0,14,-8,14,0], once on appear
- bounceOnce: y[0,-12,0] once
- peek: y[24→0] opacity[0→1] once
- celebrate: scale+y, once
- sleep: slow float with rotate, infinite
- catch: y+scale, once
- none: static

## Drop shadow
`drop-shadow(0 6px 12px rgba(48,32,96,0.18))` — applied in component, not in pages
