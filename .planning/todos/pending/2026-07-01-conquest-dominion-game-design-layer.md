---
created: 2026-07-01T21:44:11.544Z
title: Conquest/Dominion game-design layer (deferred)
area: general
files:
  - planechaser/src/lib/achievements/definitions.ts
  - supabase/migrations
---

## Problem

Tim has a large, well-drafted game-design spec (his notes, Section 3d "Conquest / Planar Dominion Rules") describing a much deeper campaign layer than what's currently built. As of the 2026-07-01 codebase audit, NONE of it is implemented — the current conquest system is just an append-only "who conquered what" event log with no campaign-level win condition. Specifically missing:

- **51%-ownership campaign win condition** — no "you won the campaign" state exists at all today.
- **Three-state plane model** (Unowned / Owned / Conquered) — today it's binary: conquered or not-conquered.
- **Archenemy sub-game tied to % ownership** — today Archenemy triggers on a flat per-pod plane-count threshold, not ownership percentage, and there's no mechanic for allies to contribute planes to a shared pool when Archenemy triggers, nor for the Archenemy to take/allies to return planes per the drafted win/loss consequences.
- **Missile tokens** — a proposed spendable resource (free roll/chaos/planeswalk/archenemy-card-draw) — doesn't exist.
- **Revised achievement tiers** — proposed: Rising Power (25%), Dominator (51%), Conqueror Supreme (75%), Multiverse Sovereign (all), Archenemy Vanquished, Untouchable, Completionist. Current actual tiers (`src/lib/achievements/definitions.ts`): First Conquest, Conqueror (5), Dominator (15), Overlord (25), Planar Dominion (all 185) — different names and thresholds entirely.

This is a genuine engine + schema change, not a content/copy fix — it touches the game state model, the conquest event log, achievement evaluation, and Archenemy trigger logic.

**Explicitly deferred per Tim's decision on 2026-07-01** — not to be started without him initiating it first.

## Solution

TBD — do not start without a fresh discussion/planning pass when Tim decides to pick this up. Recommended entry point: `/gsd-discuss-phase` (or `/gsd-new-milestone` if it's scoped as its own milestone rather than a phase) to resolve the many `[PROPOSED]`/`[ALT]`/`[OPEN]` branch points in Tim's original notes before any implementation — his notes doc explicitly marks several of these as not-yet-decided (e.g. whether the planar deck for standard conquest games draws from unowned-only vs. all-non-conquered planes, whether allies share one roll counter or each has their own, whether the Archenemy chooses which plane to take from each ally vs. random).

Full detail lives in Claude's persistent memory file `user_notes_status.md` and in Tim's original notes document (not committed to this repo — he pasted it directly into a chat session on 2026-07-01).
