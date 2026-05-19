---
phase: quick
plan: 260518-mur
type: execute
wave: 1
depends_on: []
files_modified:
  - planechaser/src/app/**/*.tsx
  - planechaser/src/components/**/*.tsx
autonomous: true
requirements: []
---

<objective>
Audit and fix all interactive elements across the app for consistent button press animations (whileTap) and desktop cursor styles (cursor-pointer, cursor-not-allowed, cursor-grab).

Purpose: Visual polish — every tappable element should depress on tap and show appropriate cursor on desktop.
Output: Updated .tsx files with consistent interaction feedback.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
## Existing patterns (from codebase audit)

**whileTap already present in:**
- archenemy-picker.tsx (scale 0.97 and 0.95)
- die-roller.tsx (scale 0.92)
- end-game-dialog.tsx (scale 0.97 and 0.95)
- plane-picker.tsx (scale 0.97 and 0.95)
- pod-settings-modal.tsx (scale 0.95)

**cursor-pointer already present in:**
- auth/page.tsx (WotC disclaimer)
- plane-card.tsx (card click area)
- die-roller.tsx (roll history button)
- chaos-overlay.tsx (dismiss overlay)
- scheme-card.tsx (card click)
- setup/page.tsx (start game button)
- lobby/page.tsx (share link)
- decks/[id]/page.tsx (filter labels)
- profile/page.tsx (conquest grid items)

**cursor-not-allowed already present in:**
- archenemy-picker.tsx (disabled confirm)
- pod-settings-modal.tsx (disabled save)

## Rules

1. **whileTap:** Add `whileTap={{ scale: 0.95 }}` to all `motion.button` elements that are interactive (clickable) but don't already have whileTap. For `motion.div` elements wrapping buttons as click targets, also add whileTap.
   - Exception: Don't add to container/layout motion.divs that just animate entrance (opacity/y transitions).
   - Exception: Don't add to the die roller's main button (it uses 0.92 for a larger press effect — intentional).

2. **cursor-pointer:** Add `cursor-pointer` class to ALL `<button>` and `motion.button` elements, clickable `<div>`/`motion.div` elements with onClick handlers, and `<a>` links. Skip elements that already have it.
   - Exception: Disabled buttons should NOT get cursor-pointer (they need cursor-not-allowed via disabled:cursor-not-allowed).

3. **cursor-not-allowed:** Add `disabled:cursor-not-allowed` to any button/motion.button with a `disabled` prop that doesn't already have it.

4. **cursor-grab:** Add `cursor-grab` to drag handles (e.g., lobby reorder items with drag-and-drop). Add `active:cursor-grabbing` alongside it.

## Files to audit (all .tsx files with interactive elements)

### Components (planechaser/src/components/):
- bottom-nav.tsx
- chaos-overlay.tsx
- plane-card.tsx
- plane-carousel.tsx
- scheme-card.tsx
- reveal-cards-modal.tsx
- card-zoom-modal.tsx
- die-roller.tsx
- roll-history-popover.tsx
- turn-indicator.tsx
- player-list.tsx
- achievement-toast.tsx
- end-game-dialog.tsx
- archenemy-end-dialog.tsx
- archenemy-picker.tsx
- plane-picker.tsx
- pod-settings-modal.tsx

### Pages (planechaser/src/app/):
- page.tsx (home)
- (auth)/auth/page.tsx
- setup/page.tsx
- game/page.tsx
- lobby/page.tsx
- join/page.tsx
- profile/page.tsx
- decks/page.tsx
- decks/[id]/page.tsx
- scheme-decks/page.tsx
- scheme-decks/[id]/page.tsx
- pods/page.tsx
- pods/[id]/page.tsx
- games/page.tsx
- games/[id]/page.tsx
- spectate/page.tsx
- support/page.tsx
- terms/page.tsx
- privacy/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add whileTap animations and cursor styles to all interactive elements</name>
  <files>
    planechaser/src/components/bottom-nav.tsx
    planechaser/src/components/chaos-overlay.tsx
    planechaser/src/components/plane-card.tsx
    planechaser/src/components/plane-carousel.tsx
    planechaser/src/components/scheme-card.tsx
    planechaser/src/components/reveal-cards-modal.tsx
    planechaser/src/components/card-zoom-modal.tsx
    planechaser/src/components/die-roller.tsx
    planechaser/src/components/roll-history-popover.tsx
    planechaser/src/components/turn-indicator.tsx
    planechaser/src/components/player-list.tsx
    planechaser/src/components/achievement-toast.tsx
    planechaser/src/components/end-game-dialog.tsx
    planechaser/src/components/archenemy-end-dialog.tsx
    planechaser/src/components/archenemy-picker.tsx
    planechaser/src/components/plane-picker.tsx
    planechaser/src/components/pod-settings-modal.tsx
    planechaser/src/app/page.tsx
    planechaser/src/app/(auth)/auth/page.tsx
    planechaser/src/app/setup/page.tsx
    planechaser/src/app/game/page.tsx
    planechaser/src/app/lobby/page.tsx
    planechaser/src/app/join/page.tsx
    planechaser/src/app/profile/page.tsx
    planechaser/src/app/decks/page.tsx
    planechaser/src/app/decks/[id]/page.tsx
    planechaser/src/app/scheme-decks/page.tsx
    planechaser/src/app/scheme-decks/[id]/page.tsx
    planechaser/src/app/pods/page.tsx
    planechaser/src/app/pods/[id]/page.tsx
    planechaser/src/app/games/page.tsx
    planechaser/src/app/games/[id]/page.tsx
    planechaser/src/app/spectate/page.tsx
    planechaser/src/app/support/page.tsx
    planechaser/src/app/terms/page.tsx
    planechaser/src/app/privacy/page.tsx
  </action>
  For EVERY file listed above:
  1. Read the file
  2. Find all interactive elements (button, motion.button, motion.div with onClick, a tags)
  3. For each motion.button / motion.div that is clickable:
     - If missing whileTap, add `whileTap={{ scale: 0.95 }}`
     - If missing cursor-pointer in className, add `cursor-pointer`
  4. For each regular `<button>`:
     - If missing cursor-pointer in className, add `cursor-pointer`
  5. For each element with disabled prop:
     - If missing disabled:cursor-not-allowed in className, add it
  6. For clickable divs with onClick:
     - If missing cursor-pointer, add it
  7. Do NOT add whileTap to non-interactive motion.divs (entrance animations only)
  8. Do NOT change die-roller.tsx's main button whileTap (0.92 is intentional)
  9. Do NOT add cursor-pointer to elements that already have it
  10. Preserve all existing functionality — only add classes/props, never remove

  Work through files systematically. Use Edit tool for each change.
  </action>
  <verify>
    <automated>cd planechaser && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>All interactive elements across all .tsx files have consistent whileTap animations and cursor styles.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. All motion.button elements have whileTap
3. All button/clickable elements have cursor-pointer
4. All disabled buttons have disabled:cursor-not-allowed
5. No regressions — only additions, no removals
</verification>

<success_criteria>
- Every interactive element has appropriate cursor style
- Every tappable motion element has whileTap animation
- TypeScript still compiles
- No functional changes — purely visual polish
</success_criteria>

<output>
After completion, create `.planning/quick/260518-mur-polish-audit-whiletap-animations-and-cur/260518-mur-SUMMARY.md`
</output>
