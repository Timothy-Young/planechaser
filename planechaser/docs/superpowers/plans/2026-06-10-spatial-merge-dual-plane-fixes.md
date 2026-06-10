# Spatial Merging / Dual-Plane Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make multi-plane (dual-plane) gameplay actually work: Spatial Merging phenomenon, Norn's Seedcore chaos ("planeswalk to it, except don't planeswalk away from any plane"), correct planeswalk-away semantics, and a non-looping dual-chaos overlay flow.

**Architecture:** Three layers change. (1) The effect classifier (`src/lib/cards/effect-classifier.ts`) gains correct chaos-line extraction and a new `planeswalk_no_leave` type; a DB migration extends the `chaos_effect_type` CHECK constraint and reclassifies the two affected cards. (2) The game engine (`src/lib/game/engine.ts`) gets a rewritten `RESOLVE_SPATIAL_MERGE` (bottoms revealed non-planes, makes merged planes adjacent), a new `PLANESWALK_NO_LEAVE` action, and a `PLANESWALK` that skips the second plane when leaving a dual state. (3) The game page (`src/app/game/page.tsx`) fixes the dual-chaos dismissal infinite loop and dispatches the right plane's special chaos.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, Supabase (Postgres). Tests run with `npm test` from `planechaser/`.

**Invariant established by this plan:** while in a dual-plane state, `secondPlaneIndex === currentPlaneIndex + 1` is NOT guaranteed in all cases (a second Norn's Seedcore trigger can give `currentPlaneIndex + 2`), but `secondPlaneIndex > currentPlaneIndex` always holds, and `PLANESWALK` always advances past `max(currentPlaneIndex, secondPlaneIndex)`.

**Validated background (June 10, 2026 audit):**
- Live DB: Spatial Merging is classified `phenomenon` (stale — DB CHECK constraint in `supabase/migrations/006_cards_table.sql` predates `spatial_merge`), so the dual-plane path has never triggered in production.
- Norn's Seedcore is classified `standard` because `extractChaosSection` picks the *first* line containing "chaos" — its entry trigger line, not the chaos ability.
- Norn's Seedcore is the ONLY plane in the 206-card corpus with the stay-on-plane mechanic (full-corpus audit). Oteclán has the same extraction miss but its chaos ability ("discover 3") is `standard` either way.
- If extraction alone were fixed, the regex `/planeswalk away from/` would misclassify Norn's Seedcore as `force_planeswalk` (matches "**don't** planeswalk away from any plane") — the opposite behavior. Ordering of checks below prevents this.
- Engine actions `SPATIAL_MERGE` and `LEAVE_DUAL_PLANE` are dead code (never dispatched) — removed by this plan.
- Dismissing the second plane's chaos overlay re-queues itself forever (soft-lock) and re-fires the first plane's special chaos.

**Out of scope:** automating Norn's Seedcore's *entry* trigger ("When you planeswalk to Norn's Seedcore, chaos ensues" — players resolve entry triggers manually for all planes today); representing 3+ simultaneous planes (app caps at 2; a new revealed plane replaces the previous second plane); per-player decks; custom plane classification.

---

### Task 1: Classifier — correct chaos-line extraction + `planeswalk_no_leave` type

**Files:**
- Modify: `src/lib/cards/effect-classifier.ts`
- Test: `src/lib/cards/effect-classifier.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('classifyCardEffect', ...)` block in `src/lib/cards/effect-classifier.test.ts`:

```ts
  it('classifies Norn\'s Seedcore as planeswalk_no_leave (extraction skips entry-trigger line)', () => {
    const oracleText = "When you planeswalk to Norn's Seedcore, chaos ensues.\nWhenever chaos ensues, reveal cards from the top of your planar deck until you reveal a plane card. Planeswalk to it, except don't planeswalk away from any plane. Put the rest of the revealed cards on the bottom of your planar deck in any order."
    const result = classifyCardEffect('Plane — New Phyrexia', oracleText)
    expect(result).toEqual({ chaos_effect_type: 'planeswalk_no_leave', chaos_effect_config: null })
  })

  it('uses the chaos ability line, not an entry trigger that mentions chaos (Oteclán)', () => {
    const oracleText = 'When you planeswalk to Oteclán and at the beginning of your upkeep, chaos ensues.\nWhenever chaos ensues, discover 3. (Exile cards from the top of your library until you exile a nonland card with mana value 3 or less. Cast it or put it into your hand.)'
    const result = classifyCardEffect('Plane — Ixalan', oracleText)
    expect(result).toEqual({ chaos_effect_type: 'standard', chaos_effect_config: null })
  })

  it('classifies Spatial Merging phenomenon as spatial_merge', () => {
    const oracleText = 'When you encounter Spatial Merging, reveal cards from the top of your planar deck until you reveal two plane cards. Simultaneously planeswalk to both of them. Put all other cards revealed this way on the bottom of your planar deck in any order.'
    const result = classifyCardEffect('Phenomenon', oracleText)
    expect(result).toEqual({ chaos_effect_type: 'spatial_merge', chaos_effect_config: null })
  })

  it('still classifies "Then planeswalk." chaos as force_planeswalk (Bad Wolf Bay)', () => {
    const oracleText = "At the beginning of combat on your turn, exile up to one target creature. Return it to the battlefield under its owner's control at the beginning of the next end step.\nWhen chaos ensues, cards can't enter from exile this turn. Then planeswalk."
    const result = classifyCardEffect('Plane — Pete\'s World', oracleText)
    expect(result).toEqual({ chaos_effect_type: 'force_planeswalk', chaos_effect_config: null })
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- run src/lib/cards/effect-classifier.test.ts` (from `planechaser/`)
Expected: the Norn's Seedcore test FAILS (gets `standard`); the Spatial Merging and Bad Wolf Bay tests may already pass; Oteclán test should already pass (both lines yield standard) — that's fine, it pins the behavior.

- [ ] **Step 3: Implement classifier changes**

In `src/lib/cards/effect-classifier.ts`:

(a) Extend the type union (line 2):

```ts
export interface EffectClassification {
  chaos_effect_type: 'standard' | 'reveal_and_chaos' | 'reveal_and_choose' | 'scry_top' | 'phenomenon' | 'force_planeswalk' | 'spatial_merge' | 'planeswalk_no_leave'
  chaos_effect_config: Record<string, unknown> | null
}
```

(b) Replace `extractChaosSection` entirely:

```ts
function extractChaosSection(oracleText: string): string | null {
  const lines = oracleText.split('\n')
  // Prefer the actual chaos ability line ("Whenever chaos ensues, ..." or
  // "Whenever you roll {CHAOS}, ...") over lines that merely mention chaos,
  // e.g. entry triggers like "When you planeswalk here, chaos ensues."
  const abilityLine = lines.find(
    (l) => /^\s*(whenever|when) chaos ensues/i.test(l) || /\{CHAOS\}/i.test(l)
  )
  if (abilityLine) return abilityLine
  return lines.find((l) => /chaos/i.test(l)) ?? null
}
```

(c) In `classifyCardEffect`, add the `planeswalk_no_leave` check **immediately BEFORE** the existing `force_planeswalk` check (order matters — Norn's text also matches `/planeswalk away from/`):

```ts
  // "Planeswalk to it, except don't planeswalk away from any plane" (Norn's Seedcore)
  if (/planeswalk to it, except don.t planeswalk away/i.test(chaosSection)) {
    return { chaos_effect_type: 'planeswalk_no_leave', chaos_effect_config: null }
  }
```

(Note: `don.t` deliberately matches both `'` and `’` apostrophes.)

- [ ] **Step 4: Run the full classifier test file**

Run: `npm test -- run src/lib/cards/effect-classifier.test.ts`
Expected: ALL tests PASS (including the 7 pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cards/effect-classifier.ts src/lib/cards/effect-classifier.test.ts
git commit -m "fix(classifier): extract real chaos ability line, add planeswalk_no_leave type"
```

---

### Task 2: Migration 015 — extend CHECK constraint, reclassify Spatial Merging + Norn's Seedcore

**Files:**
- Create: `supabase/migrations/015_chaos_effect_types.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/015_chaos_effect_types.sql`:

```sql
-- Phase 11 added 'spatial_merge' to the effect classifier but never extended
-- the CHECK constraint from migration 006, so re-seeds silently kept stale
-- values. Extend the constraint and reclassify the two affected cards.

ALTER TABLE cards DROP CONSTRAINT cards_chaos_effect_type_check;

ALTER TABLE cards ADD CONSTRAINT cards_chaos_effect_type_check
  CHECK (chaos_effect_type IN (
    'standard', 'reveal_and_chaos', 'reveal_and_choose',
    'scry_top', 'phenomenon', 'force_planeswalk',
    'spatial_merge', 'planeswalk_no_leave'
  ));

UPDATE cards SET chaos_effect_type = 'spatial_merge'
  WHERE name = 'Spatial Merging' AND card_type = 'phenomenon';

UPDATE cards SET chaos_effect_type = 'planeswalk_no_leave'
  WHERE name = 'Norn''s Seedcore' AND card_type = 'plane';
```

- [ ] **Step 2: Apply the migration**

The orchestrator (main session) applies this via the Supabase MCP `apply_migration` tool with name `chaos_effect_types` — subagents should NOT attempt to apply it; just create the file and report back.

- [ ] **Step 3: Verify (orchestrator)**

Run via Supabase MCP `execute_sql`:

```sql
SELECT name, chaos_effect_type FROM cards
WHERE name IN ('Spatial Merging', 'Norn''s Seedcore');
```

Expected: `Spatial Merging → spatial_merge`, `Norn's Seedcore → planeswalk_no_leave`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/015_chaos_effect_types.sql
git commit -m "fix(db): extend chaos_effect_type constraint, reclassify Spatial Merging and Norn's Seedcore"
```

---

### Task 3: Engine — PLANESWALK skips the second plane when leaving a dual state

**Files:**
- Modify: `src/lib/game/engine.ts:42-52` (the `PLANESWALK` case)
- Test: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/engine.test.ts` (uses the existing `makeState` helper):

```ts
describe('PLANESWALK from a dual-plane state', () => {
  it('leaves both planes and advances past the second plane', () => {
    const state = makeState({ currentPlaneIndex: 1, secondPlaneIndex: 2, planesVisited: 3 })
    const next = gameReducer(state, { type: 'PLANESWALK' })
    expect(next.currentPlaneIndex).toBe(3) // not 2 — that plane is already occupied
    expect(next.secondPlaneIndex).toBeNull()
    expect(next.planesVisited).toBe(4)
  })

  it('advances normally from a single-plane state', () => {
    const state = makeState({ currentPlaneIndex: 1, secondPlaneIndex: null, planesVisited: 2 })
    const next = gameReducer(state, { type: 'PLANESWALK' })
    expect(next.currentPlaneIndex).toBe(2)
    expect(next.secondPlaneIndex).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- run src/lib/game/engine.test.ts`
Expected: FAIL — `currentPlaneIndex` is `2` (lands on the plane the player was already on).

- [ ] **Step 3: Implement**

Replace the `PLANESWALK` case in `src/lib/game/engine.ts`:

```ts
    case 'PLANESWALK': {
      // When on two planes, planeswalking leaves both — advance past the
      // furthest-forward occupied plane, never onto a plane already occupied.
      const base = state.secondPlaneIndex !== null
        ? Math.max(state.currentPlaneIndex, state.secondPlaneIndex)
        : state.currentPlaneIndex
      const nextIndex = (base + 1) % state.deck.length
      return {
        ...state,
        currentPlaneIndex: nextIndex,
        secondPlaneIndex: null,
        planesVisited: state.planesVisited + 1,
        lastDieResult: null,
        dieState: 'idle',
      }
    }
```

- [ ] **Step 4: Run tests**

Run: `npm test -- run src/lib/game/engine.test.ts`
Expected: PASS (all, including pre-existing PLANESWALK tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/engine.ts src/lib/game/engine.test.ts
git commit -m "fix(engine): planeswalk from dual state skips the second occupied plane"
```

---

### Task 4: Engine — rewrite RESOLVE_SPATIAL_MERGE (bottom revealed non-planes, adjacency)

**Files:**
- Modify: `src/lib/game/engine.ts:70-99` (the `RESOLVE_SPATIAL_MERGE` case)
- Test: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/game/engine.test.ts`. First add this helper near `makeState` (top of file):

```ts
function withPhenomenonAt(state: GameState, ...indices: number[]): GameState {
  const deck = [...state.deck]
  for (const idx of indices) {
    deck[idx] = { ...deck[idx], card_type: 'phenomenon' as const, type_line: 'Phenomenon' }
  }
  return { ...state, deck }
}
```

Then the tests:

```ts
describe('RESOLVE_SPATIAL_MERGE', () => {
  it('merges onto the next two planes, adjacent after the phenomenon', () => {
    // deck[0] is the Spatial Merging phenomenon; deck[1] and deck[2] are planes
    const state = withPhenomenonAt(makeState({ phenomenonActive: true }), 0)
    const next = gameReducer(state, { type: 'RESOLVE_SPATIAL_MERGE' })
    expect(next.currentPlaneIndex).toBe(1)
    expect(next.secondPlaneIndex).toBe(2)
    expect(next.planesVisited).toBe(3) // started at 1, +2
    expect(next.phenomenonActive).toBe(false)
    expect(next.deck.map((c) => c.id)).toEqual(state.deck.map((c) => c.id)) // no reorder needed
  })

  it('bottoms a revealed phenomenon that sits between the two planes', () => {
    // deck[0] = Spatial Merging (current), deck[2] = another phenomenon.
    // Revealing finds planes at original indices 1 and 3; the phenomenon at 2
    // goes to the bottom of the deck.
    const state = withPhenomenonAt(makeState({ phenomenonActive: true }), 0, 2)
    const next = gameReducer(state, { type: 'RESOLVE_SPATIAL_MERGE' })
    expect(next.currentPlaneIndex).toBe(1)
    expect(next.secondPlaneIndex).toBe(2)
    expect(next.deck[1].id).toBe('plane-1')
    expect(next.deck[2].id).toBe('plane-3') // plane moved up into adjacency
    expect(next.deck[next.deck.length - 1].id).toBe('plane-2') // phenomenon bottomed
    expect(next.deck).toHaveLength(state.deck.length)
  })

  it('falls back to a simple planeswalk when fewer than two planes remain ahead', () => {
    const base = makeState({ phenomenonActive: true, currentPlaneIndex: 7 })
    const state = withPhenomenonAt(base, 7, 8, 9) // only phenomena ahead of index 7
    const next = gameReducer(state, { type: 'RESOLVE_SPATIAL_MERGE' })
    expect(next.secondPlaneIndex).toBeNull()
    expect(next.currentPlaneIndex).toBe(8)
    expect(next.phenomenonActive).toBe(false)
  })
})
```

(Note: `makeState` decks have ids `plane-0` … `plane-9`; `withPhenomenonAt` changes `card_type` but keeps the id, so bottomed cards are identifiable.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- run src/lib/game/engine.test.ts`
Expected: the "bottoms a revealed phenomenon" test FAILS (old code leaves the phenomenon in place and sets `secondPlaneIndex` to 3). The first test may pass incidentally — fine.

- [ ] **Step 3: Implement**

Replace the entire `RESOLVE_SPATIAL_MERGE` case in `src/lib/game/engine.ts`:

```ts
    case 'RESOLVE_SPATIAL_MERGE': {
      // Spatial Merging: reveal until two plane cards; simultaneously
      // planeswalk to both. Revealed non-plane cards go to the bottom of the
      // planar deck, so the two planes end up adjacent right after the
      // phenomenon. The deck is treated linearly (same assumption as
      // SHUFFLE_REMAINING / REORDER_TOP): cards before currentPlaneIndex are
      // the visited pile.
      const before = state.deck.slice(0, state.currentPlaneIndex + 1)
      const ahead = state.deck.slice(state.currentPlaneIndex + 1)

      const planes: PlaneCard[] = []
      const skipped: PlaneCard[] = []
      let consumed = 0
      for (const card of ahead) {
        consumed++
        if (card.card_type === 'plane') {
          planes.push(card)
          if (planes.length === 2) break
        } else {
          skipped.push(card)
        }
      }

      if (planes.length < 2) {
        // Not enough planes — just planeswalk to whatever is next
        const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
        return {
          ...state,
          currentPlaneIndex: nextIndex,
          secondPlaneIndex: null,
          planesVisited: state.planesVisited + 1,
          phenomenonActive: false,
        }
      }

      const rest = ahead.slice(consumed)
      return {
        ...state,
        deck: [...before, ...planes, ...rest, ...skipped],
        currentPlaneIndex: state.currentPlaneIndex + 1,
        secondPlaneIndex: state.currentPlaneIndex + 2,
        planesVisited: state.planesVisited + 2,
        phenomenonActive: false,
      }
    }
```

(`PlaneCard` is already imported as a type in `engine.ts` line 1.)

- [ ] **Step 4: Run tests**

Run: `npm test -- run src/lib/game/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/engine.ts src/lib/game/engine.test.ts
git commit -m "fix(engine): spatial merge bottoms revealed non-planes and keeps merged planes adjacent"
```

---

### Task 5: Engine — new PLANESWALK_NO_LEAVE action; remove dead SPATIAL_MERGE / LEAVE_DUAL_PLANE

**Files:**
- Modify: `src/lib/game/types.ts:101-124` (GameAction union)
- Modify: `src/lib/game/engine.ts` (new case; delete `SPATIAL_MERGE` and `LEAVE_DUAL_PLANE` cases at lines 54-68; update the no-history list at lines 344-349)
- Test: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe('PLANESWALK_NO_LEAVE (Norn\'s Seedcore chaos)', () => {
  it('adds the next plane as second plane without leaving the current one', () => {
    const state = makeState({ currentPlaneIndex: 3, planesVisited: 4 })
    const next = gameReducer(state, { type: 'PLANESWALK_NO_LEAVE' })
    expect(next.currentPlaneIndex).toBe(3) // didn't leave
    expect(next.secondPlaneIndex).toBe(4)
    expect(next.planesVisited).toBe(5)
  })

  it('bottoms revealed phenomena before the revealed plane', () => {
    // deck[4] is a phenomenon; reveal should skip it to plane-5 and bottom plane-4
    const state = withPhenomenonAt(makeState({ currentPlaneIndex: 3, planesVisited: 4 }), 4)
    const next = gameReducer(state, { type: 'PLANESWALK_NO_LEAVE' })
    expect(next.currentPlaneIndex).toBe(3)
    expect(next.secondPlaneIndex).toBe(4)
    expect(next.deck[4].id).toBe('plane-5') // revealed plane moved adjacent
    expect(next.deck[next.deck.length - 1].id).toBe('plane-4') // phenomenon bottomed
  })

  it('replaces the second plane when already on two planes (app caps at 2)', () => {
    const state = makeState({ currentPlaneIndex: 3, secondPlaneIndex: 4, planesVisited: 5 })
    const next = gameReducer(state, { type: 'PLANESWALK_NO_LEAVE' })
    expect(next.currentPlaneIndex).toBe(3)
    expect(next.secondPlaneIndex).toBe(5)
    // a later planeswalk leaves everything behind
    const after = gameReducer(next, { type: 'PLANESWALK' })
    expect(after.currentPlaneIndex).toBe(6)
    expect(after.secondPlaneIndex).toBeNull()
  })

  it('is a no-op when no plane card remains ahead', () => {
    const state = withPhenomenonAt(makeState({ currentPlaneIndex: 7 }), 8, 9)
    const next = gameReducer(state, { type: 'PLANESWALK_NO_LEAVE' })
    expect(next).toEqual(state)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- run src/lib/game/engine.test.ts`
Expected: FAIL — TypeScript error (`PLANESWALK_NO_LEAVE` not in the action union) or unknown-action fallthrough.

- [ ] **Step 3: Implement**

(a) In `src/lib/game/types.ts`, in the `GameAction` union, **delete** these two lines:

```ts
  | { type: 'SPATIAL_MERGE'; planeIndices: [number, number] }
  | { type: 'LEAVE_DUAL_PLANE' }
```

and **add**:

```ts
  | { type: 'PLANESWALK_NO_LEAVE' }
```

(b) In `src/lib/game/engine.ts`, **delete** the `SPATIAL_MERGE` and `LEAVE_DUAL_PLANE` cases (lines 54-68) and add in their place:

```ts
    case 'PLANESWALK_NO_LEAVE': {
      // Norn's Seedcore chaos: reveal until a plane card, planeswalk to it
      // WITHOUT leaving the current plane(s). Revealed non-planes go to the
      // bottom. The app caps at two simultaneous planes: a newly revealed
      // plane becomes the second plane, replacing any prior second plane
      // (which stays behind in the visited pile).
      const anchor = state.secondPlaneIndex !== null
        ? Math.max(state.currentPlaneIndex, state.secondPlaneIndex)
        : state.currentPlaneIndex
      const before = state.deck.slice(0, anchor + 1)
      const ahead = state.deck.slice(anchor + 1)

      let revealedPlane: PlaneCard | null = null
      const skipped: PlaneCard[] = []
      let consumed = 0
      for (const card of ahead) {
        consumed++
        if (card.card_type === 'plane') {
          revealedPlane = card
          break
        }
        skipped.push(card)
      }

      if (!revealedPlane) return state

      const rest = ahead.slice(consumed)
      return {
        ...state,
        deck: [...before, revealedPlane, ...rest, ...skipped],
        secondPlaneIndex: anchor + 1,
        planesVisited: state.planesVisited + 1,
      }
    }
```

(c) In `gameReducer` (engine.ts lines 344-349), update the no-history (automatic consequence) list: remove `'SPATIAL_MERGE'` and `'LEAVE_DUAL_PLANE'`, add `'PLANESWALK_NO_LEAVE'`:

```ts
  if (action.type === 'PLANESWALK' || action.type === 'SETTLE_DIE'
    || action.type === 'RESOLVE_PHENOMENON' || action.type === 'BEGIN_REVEAL_CHAOS'
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM'
    || action.type === 'PLANESWALK_NO_LEAVE'
    || action.type === 'RESOLVE_SPATIAL_MERGE' || action.type === 'REORDER_TOP'
    || action.type === 'ADD_ROLL' || action.type === 'REMOVE_ROLL') {
    return applyAction(state, action)
  }
```

(d) Grep for any other references to the removed actions before finishing:

Run: `grep -rn "SPATIAL_MERGE'\|LEAVE_DUAL_PLANE" src/` — the only remaining hit should be `'RESOLVE_SPATIAL_MERGE'` occurrences. If anything else references the deleted actions, fix it.

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- run src/lib/game/engine.test.ts` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/types.ts src/lib/game/engine.ts src/lib/game/engine.test.ts
git commit -m "feat(engine): PLANESWALK_NO_LEAVE action for Norn's Seedcore; drop dead dual-plane actions"
```

---

### Task 6: Game page — fix dual-chaos dismissal loop; wire planeswalk_no_leave; phenomenon-landing helper

**Files:**
- Modify: `src/app/game/page.tsx` (functions `handleRoll` ~line 130, `handleSpecialChaos` ~line 153, `handleDismissChaos` ~line 204, `handleManualPlaneswalk` ~line 234)

No new unit test file — this is React component wiring; behavior is verified by the engine tests above plus the manual checklist in Task 7. Keep changes minimal and exactly as specified.

- [ ] **Step 1: Add a shared planeswalk helper**

`page.tsx` already imports `gameReducer` from `@/lib/game/engine`. Ensure `GameState` is imported as a type (add to the existing type import from `@/lib/game/types`, which currently imports `DieResult` and `PlaneCard as PlaneCardType` — check the actual import line and extend it):

```ts
import type { GameState } from '@/lib/game/types'
```

Add at **module scope** (outside the component, e.g. just above the component function) — it only uses its argument, so this avoids any `react-hooks/exhaustive-deps` churn in the callbacks that use it:

```ts
function planeswalkAndCheckPhenomenon(prev: GameState): GameState {
  const next = gameReducer(prev, { type: 'PLANESWALK' })
  const landedCard = next.deck[next.currentPlaneIndex]
  if (landedCard?.card_type === 'phenomenon') {
    return { ...next, phenomenonActive: true }
  }
  return next
}
```

- [ ] **Step 2: Use the helper in all three planeswalk paths**

(a) In `handleRoll` (the `result === 'planeswalk'` branch), replace the inline body of the inner `setState` with:

```ts
        setState((prev) => {
          if (!prev) return prev
          return planeswalkAndCheckPhenomenon(prev)
        })
```

(b) In `handleSpecialChaos`, replace the `force_planeswalk` branch body's `setState` callback the same way (the old code dispatched `PLANESWALK` without checking for a phenomenon landing — a forced planeswalk onto a phenomenon previously left the game stuck showing a phenomenon with no resolution timer):

```ts
    } else if (plane.chaos_effect_type === 'force_planeswalk') {
      setSlideDirection('right')
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return planeswalkAndCheckPhenomenon(prev)
        })
      }, 1200)
    }
```

(c) In `handleManualPlaneswalk`, same replacement:

```ts
  const handleManualPlaneswalk = useCallback(() => {
    setSlideDirection('right')
    setState((prev) => {
      if (!prev) return prev
      return planeswalkAndCheckPhenomenon(prev)
    })
  }, [])
```

(Because the helper is module-scoped, the existing `useCallback` dependency arrays stay exactly as they are.)

- [ ] **Step 3: Add the planeswalk_no_leave branch to handleSpecialChaos**

Append a new branch after the `force_planeswalk` branch:

```ts
    } else if (plane.chaos_effect_type === 'planeswalk_no_leave') {
      // Norn's Seedcore: planeswalk to the next plane without leaving this one
      setSlideDirection('right')
      audioManager.playPlaneswalkLayered()
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return gameReducer(prev, { type: 'PLANESWALK_NO_LEAVE' })
        })
      }, 1200)
    }
```

(`audioManager` is already imported in this file — verify the import exists; it is used in `handleRoll`.)

- [ ] **Step 4: Fix the dual-chaos dismissal state machine**

Replace `handleDismissChaos` entirely:

```ts
  const handleDismissChaos = useCallback(() => {
    // Capture which plane's overlay is actually being dismissed: the override
    // (second plane of a dual state) or the primary plane.
    const shownOverride = chaosPlaneOverride
    setState((prev) => {
      if (!prev) return prev
      const plane = shownOverride ?? prev.deck[prev.currentPlaneIndex]
      const dismissed = gameReducer(prev, { type: 'DISMISS_CHAOS' })
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        setTimeout(() => handleSpecialChaos(plane), 300)
      }
      // Queue the second plane's chaos only when dismissing the PRIMARY
      // overlay — dismissing the second plane's overlay must not re-queue it.
      if (shownOverride === null && prev.secondPlaneIndex !== null) {
        setPendingSecondChaos(true)
      }
      return dismissed
    })
    setChaosPlaneOverride(null)
  }, [handleSpecialChaos, chaosPlaneOverride])
```

Three bugs this fixes:
1. **Infinite loop / soft-lock:** old guard `!pendingSecondChaos` was false again by the time the second overlay was dismissed, so it re-queued forever.
2. **Wrong plane's special chaos:** old code always read `deck[currentPlaneIndex]`, so the first plane's special effect fired twice and the second plane's never fired.
3. The second plane's special chaos (e.g. if the second plane is Pools of Becoming) now triggers correctly via `handleSpecialChaos(plane)` with the shown plane.

- [ ] **Step 5: Typecheck, lint, and full test suite**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no new errors (the `react-hooks/exhaustive-deps` rule: `chaosPlaneOverride` is now correctly in the deps array).
Run: `npm test -- run` — Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "fix(game): dual-chaos dismissal loop, second-plane special chaos, Norn's Seedcore planeswalk-no-leave"
```

---

### Task 7: Final verification + build

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test -- run`
Expected: all test files pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Manual smoke checklist (orchestrator with user, or dev-server check)**

1. Start a game whose deck includes Spatial Merging and Norn's Seedcore (deck builder → search by name).
2. Planeswalk onto Spatial Merging → after the 3s phenomenon pause, two planes display side by side (DualPlaneDisplay); planeswalking away lands on a plane that is NOT one of the two merged planes.
3. While on two planes, roll chaos → first plane's overlay shows; dismiss → second plane's overlay shows; dismiss → **no third overlay appears** and the die roller is enabled again.
4. On Norn's Seedcore (single plane), roll chaos → after dismissing the overlay, a second plane appears alongside Norn's Seedcore (stays on Norn's Seedcore).
5. Planeswalk away from the Norn's Seedcore pair → both planes left behind, single new plane shown.

- [ ] **Step 4: Update memory**

Update `memory/project_spatial_merge_findings.md` (in the Claude projects memory dir, not the repo): mark all four defects as FIXED with the branch/PR reference.
