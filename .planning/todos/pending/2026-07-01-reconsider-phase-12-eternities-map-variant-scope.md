---
created: 2026-07-01T21:44:11.544Z
title: Reconsider Phase 12 Eternities Map Variant scope
area: planning
files:
  - planechaser/src/app/map/page.tsx
---

## Problem

Phase 12 ("Eternities Map Variant") is the only phase from the v2 design spec that hasn't been started. On 2026-07-01 review, its original scope looks largely redundant: Phase 8's `/map` page already delivers conquest-status visualization with filtering (all/mine/unclaimed/podmate), which was the core functional need.

The one open thread worth keeping: Tim's original notes asked "Planar map vs. Eternities map — what's the distinction?" and floated "an organized nodal map with plane groupings and ownership display" as a desired future feature. That's a genuinely different visualization (constellation/nodal layout grouped by set or relationship) rather than a second grid — if this gets revisited, that's the actual gap, not a duplicate of the existing map.

**Naming collision — must resolve before any work starts:** "Eternities" is now the name of the app's purple UI color theme (Blind Eternities, shipped June 2026, quick tasks 260611-w6e/260612-94j). A feature literally called "Eternities Map" would collide with that unrelated, already-shipped name and confuse users. Rename before scoping (e.g. "Constellation View," "Multiverse Web").

## Solution

Low priority — the existing Planar Map already satisfies the core need. If revisited:
1. Rename away from "Eternities" to avoid the theme-name collision.
2. Scope it specifically as a nodal/grouped layout variant, not a re-implementation of the existing grid.
3. Run through `/gsd-discuss-phase` or similar before planning, since the actual shape of "grouped by what" (by set? by conquest status? by player?) is still an open question, not decided.

See memory (Claude's persistent memory, not this repo) `project_v2_status.md` and `user_notes_status.md` for full context from the 2026-07-01 audit session.
