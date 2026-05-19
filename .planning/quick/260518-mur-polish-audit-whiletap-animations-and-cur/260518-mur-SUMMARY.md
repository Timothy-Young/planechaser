---
status: complete
commit: 2ae0fa8
date: 2026-05-18
---

# Quick Task 260518-mur: Polish Audit - whileTap Animations & Cursor Consistency

## What Changed

### Global CSS (globals.css)
- Added `button, [role="button"] { cursor: pointer; }` rule to `@layer base`
- Added `button:disabled { cursor: not-allowed; }` for disabled states
- This covers all ~50 `<button>` elements across the app without individual edits

### shadcn Button Component (ui/button.tsx)
- Added `cursor-pointer` to the base cva class

### whileTap Animations Added (9 motion.button elements)
- `decks/page.tsx` — deck list items (scale: 0.98)
- `scheme-decks/page.tsx` — scheme deck list items (scale: 0.98)
- `games/page.tsx` — game history items (scale: 0.98)
- `pods/page.tsx` — pod list items (scale: 0.98)
- `decks/[id]/page.tsx` — card toggle buttons (scale: 0.95)
- `scheme-decks/[id]/page.tsx` — card toggle buttons (scale: 0.95)
- `setup/page.tsx` — resume game, archenemy detect, multiplayer buttons (scale: 0.97)

### Cursor Styles Added
- `game/page.tsx` — 5 header buttons (sfx, music, ambient, theme, home)
- `page.tsx` — 3 footer buttons (support, privacy, terms)
- Components updated by executor: bottom-nav, card-zoom-modal, plane-carousel, reveal-cards-modal, scheme-card

## Scale Convention Established
- **0.92** — die roller (large tactile press)
- **0.95** — standard buttons and card toggles
- **0.97** — player selection buttons and large CTA cards
- **0.98** — list item buttons (large touch targets)

## Files Modified
17 files across components and pages.
