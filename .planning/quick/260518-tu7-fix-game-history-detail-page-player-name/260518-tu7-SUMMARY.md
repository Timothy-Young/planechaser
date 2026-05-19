---
status: complete
quick_id: 260518-tu7
---

# Quick Task 260518-tu7: Fix game history detail page

## Changes

### planechaser/src/app/games/[id]/page.tsx
- Fixed `playersSnapshot` type: `name` → `display_name` to match stored data shape
- Fixed player chip render: `player.name` → `player.display_name`
- Updated planeswalk banner: now reads "Planeswalked to {plane}" with clickable plane name that opens card preview

### planechaser/src/lib/game/engine.ts
- Changed `??` to `||` for playerName fallback in END_TURN TurnRecord (catches empty strings)

### planechaser/src/app/game/page.tsx
- Changed `??` to `||` for playerName fallback in handleEndGame final turn flush (catches empty strings)
