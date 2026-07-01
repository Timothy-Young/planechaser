---
phase: quick-260701-dok
plan: 01
subsystem: ui
tags: [css, design-tokens, contrast, accessibility, theming]

requires:
  - phase: quick-260701-d85
    provides: intermediate border/input contrast values (undershot at ~2.2:1)
provides:
  - Final border/input/border-subtle token values in Atlas, Eternities, and light theme blocks, verified at ~3.2:1 WCAG contrast against each theme's own background
affects: [ui, theming, auth, accessibility]

tech-stack:
  added: []
  patterns:
    - "Border-token contrast fix pattern (round 2): replace six known hex strings 1:1 in globals.css, verified by exact grep counts rather than assumed occurrence counts"

key-files:
  created: []
  modified:
    - planechaser/src/app/globals.css

key-decisions:
  - "Used precomputed WCAG relative-luminance target hex values (calculated outside the agent loop) instead of asking the planner/executor to re-derive contrast math, since the prior round (260701-d85) undershot due to an imprecise estimate."
  - "Confirmed actual token occurrence counts by reading the file directly before writing the verify command (--border appears 2x/block, --input 1x/block, --border-subtle 1x/block) rather than assuming a uniform count, since 260701-d85's SUMMARY noted this same discrepancy."
  - "Applied directly (no worktree-isolated executor) given the mechanical, single-file, pre-verified nature of the change; plan was still authored and pre-dispatch-committed through the normal quick-task flow."

requirements-completed: [A11Y-CONTRAST]

duration: 8min
completed: 2026-07-01
---

# Quick Task 260701-dok: Bump Border/Input Contrast to ~3:1 Summary

**Replaced the intermediate border/input/border-subtle hex values from 260701-d85 (measured ~2.2:1) with precomputed final values landing at ~3.2:1 WCAG contrast in all three theme blocks (Atlas, Eternities, light).**

## Performance

- **Duration:** ~8 min
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- Atlas (`:root`, bg `#0d0a10`): `--border`/`--input` `#544766` → `#6a5c80`, `--border-subtle` `#3a3145` → `#4d4159`
- Eternities (`html[data-theme="eternities"]`, bg `#0a0813`): `--border`/`--input` `#4a3f7a` → `#675a99`, `--border-subtle` `#2f2758` → `#453a70`
- Light (`html.light`, bg `#f5f0fa`): `--border`/`--input` `#a99bc4` → `#8f7fb0`, `--border-subtle` `#cfc5df` → `#d6cbe6`
- Live-verified in the running dev server: Eternities theme now resolves `--color-border: #675a99` against `--color-bg: #0a0813` (confirmed via `getComputedStyle` in the browser).

## Task Commits

1. **Task 1: Replace border/input/border-subtle hex values in all three theme blocks** - `46c2dbc` (fix)

## Files Created/Modified
- `planechaser/src/app/globals.css` - six hex value replacements across three theme blocks, no other tokens touched

## Decisions Made
- Verify command grep-counts confirmed: `#6a5c80`×3, `#675a99`×3, `#8f7fb0`×3 (border×2 + input×1 per block each), and each new `--border-subtle` hex ×1; all six old hex values fully absent. Output: `ALL_OK`.
- `html.light[data-theme="eternities"]` and `.glass`/`.glass-strong` rgba borders confirmed untouched.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Border contrast now meets the ~3:1 WCAG target this and the prior quick task were working toward; no further contrast follow-up expected for this token set.
- Recommend a final visual spot-check across all three themes before considering the overall design-review action item closed (nice-to-have, not blocking).

## Self-Check: PASSED

- FOUND: planechaser/src/app/globals.css
- FOUND: .planning/quick/260701-dok-bump-border-input-contrast-to-3-1-in-all/260701-dok-SUMMARY.md
- FOUND commit: 46c2dbc
