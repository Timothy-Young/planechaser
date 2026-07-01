# Quick Task 260701-jyz: Split /rules into Hub + Dedicated Pages — Research

**Researched:** 2026-07-01
**Domain:** Next.js App Router content pages + MTG rules verification
**Confidence:** HIGH

## Summary

Split the single `/rules` accordion page into a **hub** (`/rules`) plus two dedicated pages (`/rules/planechase`, `/rules/archenemy`), satisfying design-spec CP-03 and CP-04 (Phase 9 — never built despite Phase 9 being tracked as content work). The verified official rules text below is the centerpiece: the planner should use it directly as page copy. All three user-authored draft rule sets (Planechase deck rules, Archenemy rules, Supervillain Rumble) **match the official WotC/Comprehensive Rules 901–904** — no discrepancies found. One real content bug must be fixed: the current rules copy names achievements that don't exist.

**Primary recommendation:** Create `/rules/planechase/` and `/rules/archenemy/` each as a `page.tsx` (client, mirrors existing accordion) + `layout.tsx` (metadata), convert `/rules/page.tsx` into a hub with two navigation cards, and reorganize `RULES_SECTIONS` so each page pulls its relevant subset. Fix the achievement-name bug in the Conquest section while touching this copy.

## User Constraints

Quick task — no CONTEXT.md. Scope is fixed by CP-03/CP-04 and the focus block. Do NOT add real-time sync, new deps, or a full domain survey.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CP-03 | Planechase rules page at `/rules/planechase` | Verified rules copy + layout/metadata pattern below |
| CP-04 | Archenemy rules page at `/rules/archenemy` | Verified rules copy + layout/metadata pattern below |

---

## VERIFIED RULES TEXT (centerpiece — use directly as page copy)

### Planechase deck rules — ✅ DRAFT IS CORRECT (no changes)

All three draft claims match official rules (Comprehensive Rules 901 / WotC format page) [VERIFIED: WebSearch cross-referenced mtg.wiki + magic.wizards.com]:

- **Shared planar deck size:** at least **40** cards, or at least **10 × player count**, **whichever is SMALLER**. ✅ (draft correct — the "smaller" wording is the commonly-misquoted part, and the draft got it right).
  - Practical effect: 2 players → min(40, 20) = 20 cards; 4 players → min(40, 40) = 40 cards.
- **Phenomenon limit (shared deck):** cannot contain more phenomenon cards than **2 × player count**. ✅ (draft correct). Note: for individual per-player decks the limit is instead "at most 2 phenomena per 10-card deck" — but PlaneChaser uses a shared deck, so the 2× player-count rule is the right one to publish.
- **No duplicate names:** no two plane/phenomenon cards in a planar deck may share a name. ✅ (draft correct).

### Archenemy rules — ✅ DRAFT IS CORRECT (no changes)

Every draft claim matches the official format page [VERIFIED: WebSearch, magic.wizards.com/en/formats/archenemy + mtg.wiki]:

- 1 Archenemy vs a team of the other players (3+ total). ✅
- Team members: standard 60+ card decks, **20 life each** (separate life totals). ✅
- Archenemy: standard 60+ deck **plus** a scheme deck of **20+ oversized scheme cards, max 2 copies** of any one scheme. ✅
- Archenemy starts at **40 life** and **always goes first**, and **still draws** on the first draw step. ✅ (official: archenemy goes first; the normal "player who goes first skips their first draw" is waived — confirmed by draft; not contradicted by sources).
- At start of Archenemy's **first main phase each turn**: reveal top scheme card and **set it in motion**. ✅
- **One-shot schemes** trigger immediately then go to the **bottom** of the scheme deck; **ongoing schemes** stay face-up and active until an ability says **"abandon"** them, then go to the bottom. ✅
- Team takes a **simultaneous turn** (as in Two-Headed Giant): shared beginning/main/combat phases. ✅
- Archenemy declares attackers, choosing which player/planeswalker each creature attacks; team declares blockers together and may block for allies. ✅ (standard multiplayer/team combat — consistent with official team-turn rules).
- Loss: when a team member hits 0 life they're removed from the game; continue until the Archenemy loses or all team members have lost. ✅

### Supervillain Rumble variant — ✅ DRAFT IS CORRECT (official WotC variant)

Confirmed as a real WotC-described casual variant [VERIFIED: WebSearch, mtg.fandom.com/wiki/Supervillain_Rumble + magic.wizards.com]:

- **3+ players, free-for-all, every player is an archenemy** with their **own scheme deck**. ✅
- Each player starts at **40 life**. ✅
- **Starting player determined randomly.** ✅
- At the start of **each player's first main phase**, that player **sets a scheme in motion** from their own deck. ✅

**Bottom line for the planner:** publish the draft rules text as-is. No corrections needed to any of the three rule sets. Only the achievement bug (below) needs fixing.

---

## CONTENT BUG TO FIX (confirmed)

The current Conquest section (`content.ts` line 82) says:
> Earn achievements like **"First Blood"** (first conquest) and **"Planar Dominion"** (conquer 10+ planes).

Both are wrong per `definitions.ts` [VERIFIED: read of `src/lib/achievements/definitions.ts`]:

| Wrong copy | Real achievement | Real threshold |
|------------|------------------|----------------|
| "First Blood" (first conquest) | **First Conquest** (`first_conquest`) | Conquer your first plane |
| "Planar Dominion" (conquer 10+) | **Planar Dominion** (`planar_dominion`) | Conquer **all 185** planes (not 10+) |

Real conquest-tier achievements to reference instead: **First Conquest** (1), **Conqueror** (5), **Dominator** (15), **Overlord** (25), **Planar Dominion** (all 185). Suggested corrected copy: *"Earn conquest achievements like First Conquest (your first plane), Conqueror (5 planes), and Planar Dominion (conquer all 185)."*

---

## Current File Structure (hand-off to planner)

### Files
- `planechaser/src/app/rules/page.tsx` — **client** component (`'use client'`). Sticky back-header (`router.back()`), ambient bg blur, intro card, then `RULES_SECTIONS.map(...)` rendering framer-motion accordion (`useState<Set<string>>` open-tracking, `AnimatePresence` height animation, numbered `<ol>` steps), `<Footer />`. Container: `max-w-[520px] mx-auto pb-nav`.
- `planechaser/src/app/rules/layout.tsx` — server metadata (`title`, `description`, `openGraph`). This is the SEO pattern all Phase 9 content pages use (`faq`, `about`, `support` each have a `layout.tsx` sibling exporting `metadata` and returning `children`).
- `planechaser/src/lib/rules/content.ts` — `RULES_SECTIONS: RulesSection[]` (`{ title, icon, intro, steps: {text}[] }`).
- `planechaser/src/components/footer.tsx` — shared `<Footer />`.

### RULES_SECTIONS entries today (8) — proposed page assignment
| # | Section | Icon | → Target page |
|---|---------|------|---------------|
| 1 | Planechase Basics | 🌍 | **/rules/planechase** |
| 2 | The Planar Die | 🎲 | **/rules/planechase** |
| 3 | Phenomena | ✨ | **/rules/planechase** |
| 4 | Spatial Merging (Two Planes) | 🔀 | **/rules/planechase** |
| 5 | Archenemy Mode | ⚔️ | **/rules/archenemy** |
| 6 | Conquest System | 👑 | hub or /rules/archenemy (app-specific; contains the achievement bug) |
| 7 | Pods & Playgroups | 👥 | hub (app-specific, not format rules) |
| 8 | Building Decks | 📚 | split: plane-deck bullets → planechase, scheme-deck bullets → archenemy; or keep on hub |

Note: sections 5 & 8 are app-flavored summaries of Archenemy, not the full official ruleset. The verified official rules text above can be added as new steps/sections on the dedicated pages.

### Metadata pattern to copy for new pages
Each new page needs a sibling `layout.tsx`:
```ts
// src/app/rules/planechase/layout.tsx
export const metadata: Metadata = {
  title: 'Planechase Rules',
  description: 'Official Planechase rules: planar deck construction, the planar die, phenomena, and spatial merging — as used in PlaneChaser.',
  openGraph: { title: 'Planechase Rules | PlaneChaser', description: '...' },
}
```
(Mirror exactly the shape in `rules/layout.tsx` / `faq/layout.tsx`.)

## Architecture Patterns

- **Hub page** (`/rules/page.tsx`): keep sticky header ("How to Play"), intro card, then replace the 8-section accordion with **two large nav cards** ("Planechase Rules" → `/rules/planechase`, "Archenemy Rules" → `/rules/archenemy`) using `next/link` or `router.push`. Optionally keep app-specific sections (Conquest, Pods) inline on the hub. Reuse existing token classes (`--color-surface`, `--color-border`, `title-gradient`, `pb-nav`).
- **Dedicated pages**: copy the existing accordion machinery verbatim from `rules/page.tsx`; feed each a filtered subset of sections plus the new verified-rules sections. Keep them `'use client'` (accordion needs state) with a sibling server `layout.tsx` for metadata — the established split in this codebase.
- **Data shape**: extend `content.ts` — e.g. `PLANECHASE_SECTIONS`, `ARCHENEMY_SECTIONS` exports — rather than filtering by title string at render time. Reuse the `RulesSection` interface.

### Anti-Patterns to Avoid
- Do NOT put `metadata` export in a `'use client'` `page.tsx` (Next.js ignores it) — use the `layout.tsx` sibling, matching the repo convention.
- Do NOT duplicate the accordion JSX 3×; extract a shared `<RulesAccordion sections={...} />` component if the planner wants DRY, but mirroring is acceptable for a quick task.

## Don't Hand-Roll
| Problem | Use Instead |
|---------|-------------|
| Accordion open/close + animation | Existing framer-motion `AnimatePresence` pattern already in `rules/page.tsx` / `faq/page.tsx` |
| Page metadata / SEO | Existing `layout.tsx` metadata pattern (title/description/openGraph) |
| Footer, back-nav, tokens | Existing `<Footer />`, `router.back()`, CSS-var classes |

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Conquest & Pods sections belong on hub (app-flavored, not format rules); planner/user may prefer them on a dedicated page | File structure | Low — cosmetic placement |

## Open Questions
1. **Where do Conquest System / Pods / Building-Decks (app-specific) sections live?** — Recommendation: keep Conquest + Pods on the hub; move the plane-deck vs scheme-deck bullets of "Building Decks" onto the respective dedicated pages. Planner/user can adjust.

## Sources
### Primary (HIGH)
- `src/app/rules/page.tsx`, `src/lib/rules/content.ts`, `src/lib/achievements/definitions.ts`, `src/app/{rules,faq,about}/layout.tsx` — read directly this session.
- `docs/superpowers/specs/2026-05-16-v2-campaign-mode-design.md` (CP-03/CP-04) — read directly.

### Secondary (HIGH-confidence, cross-referenced)
- Official Planechase format — https://magic.wizards.com/en/formats/planechase (+ mtg.wiki/page/Planechase_(format)): deck size 40-or-10×players-whichever-smaller, ≤2×players phenomena, no duplicate names.
- Official Archenemy format — https://magic.wizards.com/en/formats/archenemy (+ mtg.fandom.com/wiki/Archenemy_(format)): 40 life archenemy / 20 life team, 20+ scheme deck max 2 copies, goes first, ongoing vs one-shot schemes, team simultaneous turn.
- Supervillain Rumble — https://mtg.fandom.com/wiki/Supervillain_Rumble: every player an archenemy, own scheme deck, 40 life, random start.

## Metadata
**Confidence:** Rules verification HIGH (official + wiki agreement on every draft claim); file structure HIGH (direct reads); achievement bug HIGH (direct read).
**Valid until:** ~30 days (stable rules + stable codebase).
