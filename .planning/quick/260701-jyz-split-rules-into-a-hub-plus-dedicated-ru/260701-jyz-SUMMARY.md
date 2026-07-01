---
phase: quick-260701-jyz
plan: 01
subsystem: ui
tags: [nextjs, app-router, content-pages, rules, metadata]

requires:
  - phase: none
    provides: n/a (standalone quick task)
provides:
  - "PLANECHASE_SECTIONS, ARCHENEMY_SECTIONS, HUB_SECTIONS exports from src/lib/rules/content.ts"
  - "/rules/planechase dedicated rules page (CP-03)"
  - "/rules/archenemy dedicated rules page (CP-04)"
  - "/rules hub page with two nav cards + retained app-specific sections"
  - "Fixed Conquest System achievement copy (First Conquest/Conqueror/Planar Dominion)"
affects: [content-pages, rules, seo]

tech-stack:
  added: []
  patterns:
    - "Dedicated content route = page.tsx ('use client', accordion) + layout.tsx (server, export const metadata) sibling — metadata never lives in a client page"
    - "Per-page RulesSection[] exports (PLANECHASE_SECTIONS/ARCHENEMY_SECTIONS/HUB_SECTIONS) replace one monolithic RULES_SECTIONS array"

key-files:
  created:
    - planechaser/src/app/rules/planechase/page.tsx
    - planechaser/src/app/rules/planechase/layout.tsx
    - planechaser/src/app/rules/archenemy/page.tsx
    - planechaser/src/app/rules/archenemy/layout.tsx
  modified:
    - planechaser/src/lib/rules/content.ts
    - planechaser/src/app/rules/page.tsx

key-decisions:
  - "Mirrored accordion machinery verbatim across all three pages instead of extracting a shared component, per plan/research explicit guidance for a quick task"
  - "Kept Conquest System + Pods & Playgroups on the hub as app-specific sections (not official format rules)"

patterns-established:
  - "Content-page split pattern: hub with nav cards -> dedicated page.tsx/layout.tsx pairs, each importing its own section-data export from lib/rules/content.ts"

requirements-completed: [CP-03, CP-04]

duration: 25min
completed: 2026-07-01
---

# Quick Task 260701-jyz: Split /rules into Hub + Dedicated Pages Summary

**Split the monolithic `/rules` accordion into a hub plus `/rules/planechase` and `/rules/archenemy` dedicated pages, published verified official Planechase/Archenemy/Supervillain-Rumble rules text, and fixed a real achievement-name content bug.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-01T21:14:00Z
- **Completed:** 2026-07-01T21:39:00Z
- **Tasks:** 3 completed
- **Files modified:** 6 (1 restructured, 1 rewritten, 4 created)

## Accomplishments
- `/rules/planechase` (CP-03): Planechase Basics, The Planar Die, Phenomena, Spatial Merging, new verified Deck Building Rules section, and an Individual Deck "Coming Soon" callout.
- `/rules/archenemy` (CP-04): expanded Archenemy Mode ruleset (team life totals, scheme deck construction/size, turn structure, one-shot vs ongoing schemes, combat, loss condition) plus a new Supervillain Rumble Variant section.
- `/rules` hub: two large nav cards linking to the dedicated pages, retaining the Conquest System (bug-fixed) and Pods & Playgroups accordion sections.
- Fixed a real content bug: Conquest System no longer references the non-existent "First Blood" achievement or "conquer 10+ planes" — now correctly cites First Conquest, Conqueror (5), and Planar Dominion (all 185), matching `src/lib/achievements/definitions.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure content.ts into per-page section exports + publish verified rules + fix achievement bug** - `8371686` (feat)
2. **Task 2: Create /rules/planechase and /rules/archenemy pages + metadata layouts** - `c3f759a` (feat)
3. **Task 3: Convert /rules into a hub with two nav cards + app-specific sections** - `cdc4cca` (feat)

**Plan metadata:** pending (orchestrator commits SUMMARY.md/STATE.md separately)

## Files Created/Modified
- `planechaser/src/lib/rules/content.ts` - Replaced single `RULES_SECTIONS` with `PLANECHASE_SECTIONS`, `ARCHENEMY_SECTIONS`, `HUB_SECTIONS`; added verified Deck Building Rules and Supervillain Rumble sections; expanded Archenemy Mode; fixed Conquest achievement copy.
- `planechaser/src/app/rules/planechase/page.tsx` - New client accordion page for Planechase rules, imports `PLANECHASE_SECTIONS`.
- `planechaser/src/app/rules/planechase/layout.tsx` - New server layout exporting `metadata` (title/description/openGraph) for the Planechase rules route.
- `planechaser/src/app/rules/archenemy/page.tsx` - New client accordion page for Archenemy rules, imports `ARCHENEMY_SECTIONS`.
- `planechaser/src/app/rules/archenemy/layout.tsx` - New server layout exporting `metadata` for the Archenemy rules route.
- `planechaser/src/app/rules/page.tsx` - Rewritten as hub: intro card, two `next/link` nav cards (`/rules/planechase`, `/rules/archenemy`), then accordion fed by `HUB_SECTIONS` (Conquest System + Pods & Playgroups). Removed stale `RULES_SECTIONS` import.

## Decisions Made
- Mirrored the accordion JSX verbatim in all three pages (hub, planechase, archenemy) rather than extracting a shared `<RulesAccordion>` component — matches the plan's explicit instruction and the research's noted anti-pattern guidance ("mirroring is acceptable for a quick task").
- Placed Conquest System and Pods & Playgroups on the hub rather than splitting them onto the dedicated pages, since they're app-specific (not official format rules) — consistent with the plan and research's Assumption A1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing `node_modules` in worktree**
- **Found during:** Task 2 verification (`npx tsc --noEmit` returned npx's "not the tsc command" fallback message instead of running the compiler)
- **Issue:** This worktree had no `node_modules` directory at all — dependencies had never been installed here, so `npx tsc`/`npx next build` could not resolve local TypeScript/Next.js binaries.
- **Fix:** Ran `npm install` in `planechaser/` (726 packages added). This is a pre-existing environment gap unrelated to any single task's code changes; installing was required to run any of the plan's verification commands.
- **Files modified:** None tracked (node_modules is gitignored; no package.json/package-lock.json changes were needed since `typescript` was already a listed devDependency).
- **Verification:** `npx tsc --noEmit -p tsconfig.json` and `npx next build` both ran successfully afterward.
- **Committed in:** N/A (no trackable file changes — node_modules is gitignored)

---

**Total deviations:** 1 auto-fixed (1 blocking — environment setup)
**Impact on plan:** No scope creep. Required purely to execute the plan's own verification commands; no application code was affected by this fix.

## Issues Encountered
- `npx tsc --noEmit` (Task 2/3 verify commands) surfaces 2 pre-existing, unrelated TypeScript errors in `tests/multiplayer-session.spec.ts` (missing `secondPlaneIndex`/`eliminatedPlayerIds` on a test fixture's `GameState` literal). These predate this plan, are not in any file this plan touches, and are out of scope per the deviation rules' scope boundary — left unfixed and not committed. No `content.ts`, `rules/page.tsx`, `rules/planechase/*`, or `rules/archenemy/*` errors are present.
- `next build` printed a non-fatal `ReferenceError: location is not defined` during static-page generation (unrelated worker warning); the build still completed successfully with all 31/31 routes generated, including `/rules`, `/rules/planechase`, and `/rules/archenemy` as static (○) routes.

## User Setup Required

None - no external service configuration required. This is a client-side/server-static content change with no new environment variables, dependencies, or database changes.

## Next Phase Readiness
- CP-03 and CP-04 are satisfied: `/rules/planechase` and `/rules/archenemy` exist with verified official rules text and correct metadata split (server `layout.tsx` sibling, no `metadata` export in `'use client'` pages).
- `/rules` hub links to both dedicated pages and retains the app-specific Conquest/Pods sections with the achievement-name bug fixed.
- Project typechecks clean for all plan-touched files and builds successfully; new routes confirmed present in `next build` output.
- No blockers for future content-page work (e.g., a possible future `/rules/individual-deck-planechase` page when that variant ships — the current page has a "Coming Soon" callout pointing at it).

---
*Phase: quick-260701-jyz*
*Completed: 2026-07-01*

## Self-Check: PASSED

All 6 created/modified source files verified present on disk. All 3 task commit hashes (8371686, c3f759a, cdc4cca) verified present in git log.
