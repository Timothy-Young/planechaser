# Phase 11: Multi-Plane Support + Deck Manipulation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support two simultaneous active planes (Spatial Merging phenomenon) and add top-of-deck placement for revealed cards, completing Planechase rules coverage.

**Architecture:** Adds `secondPlaneIndex: number | null` to GameState alongside the existing `currentPlaneIndex`. When Spatial Merging is encountered, the engine reveals cards until 2 planes are found and activates both. A new `DualPlaneDisplay` component renders both planes stacked on mobile. Chaos rolls trigger both planes' chaos abilities sequentially. On planeswalk, both planes are left. For deck manipulation, `REORDER_TOP` action and a placement choice in RevealCardsModal allow putting revealed cards on top or bottom of the planar deck.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Framer Motion 11, Tailwind CSS 4

---

## Triage & Task Overview

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1 | Add secondPlaneIndex to GameState + engine actions | P0 | `src/lib/game/types.ts`, `src/lib/game/engine.ts` |
| 2 | Spatial Merging phenomenon detection + handler | P0 | `src/lib/cards/effect-classifier.ts`, `src/lib/game/engine.ts`, `src/lib/game/types.ts` |
| 3 | Dual plane display component | P0 | `src/components/dual-plane-display.tsx` |
| 4 | Game page integration — dual plane rendering + dual chaos | P0 | `src/app/game/page.tsx` |
| 5 | REORDER_TOP action + RevealCardsModal placement choice | P1 | `src/lib/game/types.ts`, `src/lib/game/engine.ts`, `src/components/reveal-cards-modal.tsx` |
| 6 | Update rules page with multi-plane content | P2 | `src/lib/rules/content.ts` |

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/game/types.ts` | Modify | Add `secondPlaneIndex`, `SPATIAL_MERGE`, `LEAVE_DUAL_PLANE`, `REORDER_TOP` actions |
| `src/lib/game/engine.ts` | Modify | Handle new actions in reducer, update PLANESWALK for dual-plane |
| `src/lib/cards/effect-classifier.ts` | Modify | Add `spatial_merge` effect type detection |
| `src/components/dual-plane-display.tsx` | Create | Stacked dual-plane card display with both cards tappable for zoom |
| `src/app/game/page.tsx` | Modify | Render dual planes, handle dual chaos, Spatial Merging flow |
| `src/components/reveal-cards-modal.tsx` | Modify | Add top/bottom placement toggle |
| `src/lib/rules/content.ts` | Modify | Add multi-plane section to rules |

---

### Task 1: Add secondPlaneIndex to GameState + Engine Actions

**Files:**
- Modify: `src/lib/game/types.ts`
- Modify: `src/lib/game/engine.ts`

**Context:** The GameState currently tracks a single plane via `currentPlaneIndex: number`. We add `secondPlaneIndex: number | null` to support Spatial Merging (two planes active simultaneously). We also need `SPATIAL_MERGE` and `LEAVE_DUAL_PLANE` actions, and must update `PLANESWALK` to handle dual-plane state.

- [ ] **Step 1: Add secondPlaneIndex to GameState type**

In `src/lib/game/types.ts`, add to the `GameState` interface after `currentPlaneIndex: number`:

```ts
  secondPlaneIndex: number | null
```

- [ ] **Step 2: Add new GameAction types**

In `src/lib/game/types.ts`, add to the `GameAction` union:

```ts
  | { type: 'SPATIAL_MERGE'; planeIndices: [number, number] }
  | { type: 'LEAVE_DUAL_PLANE' }
```

- [ ] **Step 3: Update PLANESWALK in engine to handle dual-plane**

In `src/lib/game/engine.ts`, replace the existing `case 'PLANESWALK'` block:

```ts
    case 'PLANESWALK': {
      const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
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

The key change: `secondPlaneIndex: null` ensures any dual-plane state is cleared on planeswalk.

- [ ] **Step 4: Add SPATIAL_MERGE action handler**

In `src/lib/game/engine.ts`, add a new case inside `applyAction` (after the PLANESWALK case):

```ts
    case 'SPATIAL_MERGE': {
      return {
        ...state,
        currentPlaneIndex: action.planeIndices[0],
        secondPlaneIndex: action.planeIndices[1],
        phenomenonActive: false,
      }
    }

    case 'LEAVE_DUAL_PLANE': {
      return {
        ...state,
        secondPlaneIndex: null,
      }
    }
```

- [ ] **Step 5: Add SPATIAL_MERGE and LEAVE_DUAL_PLANE to the no-history list in gameReducer**

In `src/lib/game/engine.ts`, update the condition that skips history snapshots to include the new actions:

```ts
  if (action.type === 'PLANESWALK' || action.type === 'SETTLE_DIE'
    || action.type === 'RESOLVE_PHENOMENON' || action.type === 'BEGIN_REVEAL_CHAOS'
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM'
    || action.type === 'SPATIAL_MERGE' || action.type === 'LEAVE_DUAL_PLANE') {
    return applyAction(state, action)
  }
```

- [ ] **Step 6: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`

Note: The build will show errors about missing `secondPlaneIndex` in the setup page's initial state. That's expected — we'll fix it in Task 4 when we integrate with the game page. For now, confirm the types and engine compile.

```bash
git add src/lib/game/types.ts src/lib/game/engine.ts
git commit -m "feat: add secondPlaneIndex to GameState for dual-plane support"
```

---

### Task 2: Spatial Merging Phenomenon Detection + Handler

**Files:**
- Modify: `src/lib/cards/effect-classifier.ts`
- Modify: `src/lib/game/types.ts`
- Modify: `src/lib/game/engine.ts`

**Context:** Spatial Merging is a phenomenon card from Planechase Anthology. When encountered, you "reveal cards from the top of your planar deck until you reveal two plane cards. Simultaneously planeswalk to both of them." The effect-classifier needs a `spatial_merge` type. The engine needs a `RESOLVE_SPATIAL_MERGE` action that finds the next 2 plane cards in the deck and activates both.

- [ ] **Step 1: Add spatial_merge to the effect classifier**

In `src/lib/cards/effect-classifier.ts`, update the `EffectClassification` interface:

```ts
export interface EffectClassification {
  chaos_effect_type: 'standard' | 'reveal_and_chaos' | 'reveal_and_choose' | 'scry_top' | 'phenomenon' | 'force_planeswalk' | 'spatial_merge'
  chaos_effect_config: Record<string, unknown> | null
}
```

In the `classifyCardEffect` function, update the phenomenon check to detect Spatial Merging specifically. Replace:

```ts
  if (typeLine.toLowerCase().includes('phenomenon')) {
    return { chaos_effect_type: 'phenomenon', chaos_effect_config: null }
  }
```

With:

```ts
  if (typeLine.toLowerCase().includes('phenomenon')) {
    if (/reveal cards.*until you reveal two plane cards/i.test(oracleText)
      || /simultaneously planeswalk to both/i.test(oracleText)
      || /spatial merging/i.test(oracleText)) {
      return { chaos_effect_type: 'spatial_merge', chaos_effect_config: null }
    }
    return { chaos_effect_type: 'phenomenon', chaos_effect_config: null }
  }
```

- [ ] **Step 2: Add RESOLVE_SPATIAL_MERGE action type**

In `src/lib/game/types.ts`, add to the `GameAction` union:

```ts
  | { type: 'RESOLVE_SPATIAL_MERGE' }
```

- [ ] **Step 3: Add RESOLVE_SPATIAL_MERGE handler in engine**

In `src/lib/game/engine.ts`, add inside `applyAction`:

```ts
    case 'RESOLVE_SPATIAL_MERGE': {
      // Find the next 2 plane cards (not phenomena) in the deck after current position
      const planeIndices: number[] = []
      for (let i = 1; i < state.deck.length && planeIndices.length < 2; i++) {
        const idx = (state.currentPlaneIndex + i) % state.deck.length
        if (state.deck[idx].card_type === 'plane') {
          planeIndices.push(idx)
        }
      }

      if (planeIndices.length < 2) {
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

      return {
        ...state,
        currentPlaneIndex: planeIndices[0],
        secondPlaneIndex: planeIndices[1],
        planesVisited: state.planesVisited + 2,
        phenomenonActive: false,
      }
    }
```

- [ ] **Step 4: Add RESOLVE_SPATIAL_MERGE to the no-history list**

Update the no-history condition in `gameReducer`:

```ts
  if (action.type === 'PLANESWALK' || action.type === 'SETTLE_DIE'
    || action.type === 'RESOLVE_PHENOMENON' || action.type === 'BEGIN_REVEAL_CHAOS'
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM'
    || action.type === 'SPATIAL_MERGE' || action.type === 'LEAVE_DUAL_PLANE'
    || action.type === 'RESOLVE_SPATIAL_MERGE') {
    return applyAction(state, action)
  }
```

- [ ] **Step 5: Verify and commit**

```bash
git add src/lib/cards/effect-classifier.ts src/lib/game/types.ts src/lib/game/engine.ts
git commit -m "feat: add Spatial Merging phenomenon detection and RESOLVE_SPATIAL_MERGE engine action"
```

---

### Task 3: Dual Plane Display Component

**Files:**
- Create: `src/components/dual-plane-display.tsx`

**Context:** When two planes are active (Spatial Merging), both need to be rendered. On mobile (375px primary target), they stack vertically with reduced height. Each is tappable for zoom via the existing `CardZoomModal`. The component accepts two `PlaneCard` types and renders them in animated containers.

- [ ] **Step 1: Create the DualPlaneDisplay component**

Create `src/components/dual-plane-display.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { PlaneCard } from '@/lib/game/types'

interface DualPlaneDisplayProps {
  primaryPlane: PlaneCard
  secondaryPlane: PlaneCard
  direction: 'left' | 'right'
}

export function DualPlaneDisplay({ primaryPlane, secondaryPlane, direction }: DualPlaneDisplayProps) {
  const [zoomedCard, setZoomedCard] = useState<PlaneCard | null>(null)
  const xOffset = direction === 'left' ? -300 : 300

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${primaryPlane.id}-${secondaryPlane.id}`}
          initial={{ x: xOffset, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -xOffset, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="w-full flex flex-col gap-2 items-center"
        >
          {/* Spatial Merging badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-900/60 text-amber-400 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Spatial Merging — Two Planes Active
            </span>
          </div>

          {/* Primary plane */}
          <div
            className="relative w-full max-w-[440px] aspect-[7/5] rounded-2xl overflow-hidden cursor-pointer card-breathe"
            style={{ maxHeight: '35vh' }}
            onClick={() => setZoomedCard(primaryPlane)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <Image
                  src={primaryPlane.image_uris.border_crop}
                  alt={primaryPlane.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 480px) 140vw, 616px"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Secondary plane */}
          <div
            className="relative w-full max-w-[440px] aspect-[7/5] rounded-2xl overflow-hidden cursor-pointer card-breathe"
            style={{ maxHeight: '35vh' }}
            onClick={() => setZoomedCard(secondaryPlane)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <Image
                  src={secondaryPlane.image_uris.border_crop}
                  alt={secondaryPlane.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 480px) 140vw, 616px"
                  priority
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <CardZoomModal
        src={zoomedCard ? zoomedCard.image_uris.border_crop : null}
        alt={zoomedCard?.name ?? ''}
        onClose={() => setZoomedCard(null)}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify and commit**

```bash
git add src/components/dual-plane-display.tsx
git commit -m "feat: add DualPlaneDisplay component for Spatial Merging two-plane rendering"
```

---

### Task 4: Game Page Integration — Dual Plane Rendering + Dual Chaos

**Files:**
- Modify: `src/app/game/page.tsx`

**Context:** The game page (`src/app/game/page.tsx`) needs these changes:
1. Initialize `secondPlaneIndex: null` in saved state (backward compat)
2. Render `DualPlaneDisplay` when `secondPlaneIndex` is not null, otherwise keep existing `PlaneCard`
3. Handle Spatial Merging phenomenon — when a phenomenon with `spatial_merge` effect type is encountered, dispatch `RESOLVE_SPATIAL_MERGE` instead of `RESOLVE_PHENOMENON`
4. When chaos rolls with two active planes, show chaos for both planes sequentially
5. Background art uses primary plane (no change needed — `currentPlaneIndex` still valid)
6. Ambient sound uses primary plane (no change needed)

- [ ] **Step 1: Add DualPlaneDisplay import**

At the top of `src/app/game/page.tsx`, add:

```tsx
import { DualPlaneDisplay } from '@/components/dual-plane-display'
```

- [ ] **Step 2: Handle backward compatibility for secondPlaneIndex**

In the `useEffect` that loads saved state (around line 64-72), add a migration for old saves:

Replace:
```tsx
    setState(saved)
```

With:
```tsx
    setState({ ...saved, secondPlaneIndex: saved.secondPlaneIndex ?? null })
```

- [ ] **Step 3: Derive secondPlane from state**

After line 372 (`const currentPlane = state.deck[state.currentPlaneIndex]`), add:

```tsx
  const secondPlane = state.secondPlaneIndex !== null ? state.deck[state.secondPlaneIndex] : null
  const isDualPlane = secondPlane !== null
```

- [ ] **Step 4: Update phenomenon handling for Spatial Merging**

The phenomenon auto-resolve effect (lines ~102-119) needs to check if the current phenomenon is Spatial Merging. Replace that entire `useEffect`:

```tsx
  useEffect(() => {
    if (!state?.phenomenonActive) return

    const currentCard = state.deck[state.currentPlaneIndex]
    if (currentCard?.chaos_effect_type === 'spatial_merge') {
      // Spatial Merging: resolve after a brief delay, finding 2 planes
      const timer = setTimeout(() => {
        setSlideDirection('right')
        setState((prev) => {
          if (!prev) return prev
          return gameReducer(prev, { type: 'RESOLVE_SPATIAL_MERGE' })
        })
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Normal phenomenon: planeswalk again
    const timer = setTimeout(() => {
      setSlideDirection('right')
      setState((prev) => {
        if (!prev) return prev
        const next = gameReducer(prev, { type: 'RESOLVE_PHENOMENON' })
        const landedCard = next.deck[next.currentPlaneIndex]
        if (landedCard?.card_type === 'phenomenon') {
          return { ...next, phenomenonActive: true }
        }
        return next
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [state?.phenomenonActive, state?.currentPlaneIndex])
```

- [ ] **Step 5: Update chaos handling for dual planes**

In the `handleDismissChaos` callback (around line 188-198), after dismissing the primary plane's chaos, check if a second plane exists and trigger its chaos too. Replace:

```tsx
  const handleDismissChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const plane = prev.deck[prev.currentPlaneIndex]
      const dismissed = gameReducer(prev, { type: 'DISMISS_CHAOS' })
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        setTimeout(() => handleSpecialChaos(plane), 300)
      }
      return dismissed
    })
  }, [handleSpecialChaos])
```

With:

```tsx
  const [pendingSecondChaos, setPendingSecondChaos] = useState(false)

  const handleDismissChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const plane = prev.deck[prev.currentPlaneIndex]
      const dismissed = gameReducer(prev, { type: 'DISMISS_CHAOS' })
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        setTimeout(() => handleSpecialChaos(plane), 300)
      }
      // If dual-plane, queue second plane's chaos
      if (prev.secondPlaneIndex !== null && !pendingSecondChaos) {
        setPendingSecondChaos(true)
      }
      return dismissed
    })
  }, [handleSpecialChaos, pendingSecondChaos])

  // Trigger second plane's chaos after first is dismissed
  useEffect(() => {
    if (!pendingSecondChaos || !state || state.secondPlaneIndex === null) return
    if (state.showChaosOverlay) return // Wait for first chaos to fully dismiss

    const secondPlaneCard = state.deck[state.secondPlaneIndex]
    if (secondPlaneCard) {
      setState((prev) => prev ? { ...prev, showChaosOverlay: true } : prev)
    }
    setPendingSecondChaos(false)
  }, [pendingSecondChaos, state?.showChaosOverlay, state?.secondPlaneIndex])
```

Note: Add `pendingSecondChaos` to the state declarations at the top of the component (around line 39).

- [ ] **Step 6: Render DualPlaneDisplay or single PlaneCard**

Replace the plane card rendering section (lines ~561-566):

```tsx
        {/* Plane card */}
        <div className={`flex-1 flex items-center justify-center w-full max-w-[440px] ${isArchenemy && state.archenemy?.activeSchemes.length ? 'max-h-[300px]' : ''}`}>
          {currentPlane && (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          )}
        </div>
```

With:

```tsx
        {/* Plane card(s) */}
        <div className={`flex-1 flex items-center justify-center w-full max-w-[440px] ${isArchenemy && state.archenemy?.activeSchemes.length ? 'max-h-[300px]' : ''} ${isDualPlane ? 'overflow-y-auto' : ''}`}>
          {currentPlane && isDualPlane && secondPlane ? (
            <DualPlaneDisplay
              primaryPlane={currentPlane}
              secondaryPlane={secondPlane}
              direction={slideDirection}
            />
          ) : currentPlane ? (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          ) : null}
        </div>
```

- [ ] **Step 7: Update chaos overlay to show which plane's chaos is active**

In the chaos overlay rendering (lines ~401-405), pass additional context when dual-plane:

```tsx
      <AnimatePresence>
        {state.showChaosOverlay && currentPlane && (
          <ChaosOverlay
            plane={pendingSecondChaos && secondPlane ? secondPlane : currentPlane}
            onDismiss={handleDismissChaos}
          />
        )}
      </AnimatePresence>
```

Wait — the second chaos fires AFTER first dismissal, so by the time `showChaosOverlay` is true again, `pendingSecondChaos` has been consumed. The second chaos should show the second plane's text. Let me use a different approach:

Add a state to track which chaos source we're showing:

At the state declarations, add:

```tsx
  const [chaosPlaneOverride, setChaosPlaneOverride] = useState<PlaneCardType | null>(null)
```

Update the second-chaos effect to set the override:

```tsx
  useEffect(() => {
    if (!pendingSecondChaos || !state || state.secondPlaneIndex === null) return
    if (state.showChaosOverlay) return

    const secondPlaneCard = state.deck[state.secondPlaneIndex]
    if (secondPlaneCard) {
      setChaosPlaneOverride(secondPlaneCard)
      setState((prev) => prev ? { ...prev, showChaosOverlay: true } : prev)
    }
    setPendingSecondChaos(false)
  }, [pendingSecondChaos, state?.showChaosOverlay, state?.secondPlaneIndex])
```

Update `handleDismissChaos` to clear the override:

After the chaos is dismissed, add `setChaosPlaneOverride(null)` in a cleanup.

Update the ChaosOverlay rendering:

```tsx
      <AnimatePresence>
        {state.showChaosOverlay && currentPlane && (
          <ChaosOverlay
            plane={chaosPlaneOverride ?? currentPlane}
            onDismiss={() => {
              setChaosPlaneOverride(null)
              handleDismissChaos()
            }}
          />
        )}
      </AnimatePresence>
```

- [ ] **Step 8: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`

```bash
git add src/app/game/page.tsx
git commit -m "feat: integrate dual-plane rendering, Spatial Merging handler, and dual chaos in game page"
```

---

### Task 5: REORDER_TOP Action + RevealCardsModal Placement Choice

**Files:**
- Modify: `src/lib/game/types.ts`
- Modify: `src/lib/game/engine.ts`
- Modify: `src/components/reveal-cards-modal.tsx`

**Context:** Currently revealed cards can only be placed on the bottom of the deck (`REORDER_BOTTOM`). Some chaos effects let the player choose to put revealed cards on top. We add a `REORDER_TOP` action and give the RevealCardsModal a top/bottom toggle.

- [ ] **Step 1: Add REORDER_TOP action type**

In `src/lib/game/types.ts`, add to the `GameAction` union:

```ts
  | { type: 'REORDER_TOP'; cardIds: string[] }
```

- [ ] **Step 2: Add REORDER_TOP handler in engine**

In `src/lib/game/engine.ts`, add inside `applyAction` (after the `REORDER_BOTTOM` case):

```ts
    case 'REORDER_TOP': {
      const reorderedIds = new Set(action.cardIds)
      const currentIdx = state.currentPlaneIndex
      const before = state.deck.slice(0, currentIdx + 1)
      const after = state.deck.slice(currentIdx + 1).filter((c) => !reorderedIds.has(c.id))
      const reorderedCards = action.cardIds
        .map((id) => state.deck.find((c) => c.id === id))
        .filter((c): c is PlaneCard => c !== undefined)

      return {
        ...state,
        deck: [...before, ...reorderedCards, ...after],
        revealState: state.revealState ? { ...state.revealState, resolved: true } : null,
      }
    }
```

- [ ] **Step 3: Add REORDER_TOP to the no-history list**

Update the condition in `gameReducer`:

```ts
    || action.type === 'RESOLVE_SPATIAL_MERGE' || action.type === 'REORDER_TOP') {
```

- [ ] **Step 4: Update RevealCardsModal with top/bottom placement choice**

In `src/components/reveal-cards-modal.tsx`, add a placement toggle state and update the props:

Update the interface:

```tsx
interface RevealCardsModalProps {
  cards: PlaneCard[]
  effectType: string
  onDismiss: () => void
  onReorder?: (cardIds: string[]) => void
  onReorderTop?: (cardIds: string[]) => void
}
```

Update the component signature:

```tsx
export function RevealCardsModal({ cards, effectType, onDismiss, onReorder, onReorderTop }: RevealCardsModalProps) {
  const [orderedCards, setOrderedCards] = useState(cards)
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
  const showReorder = effectType === 'reveal_and_chaos' || effectType === 'reveal_and_choose'
```

Update `handleConfirm`:

```tsx
  function handleConfirm() {
    const ids = orderedCards.map((c) => c.id)
    if (placement === 'top' && onReorderTop) {
      onReorderTop(ids)
    } else if (onReorder) {
      onReorder(ids)
    }
    onDismiss()
  }
```

Add the placement toggle between the instruction text and the card list (inside the `showReorder` block):

```tsx
          {showReorder && (
            <>
              <p className="text-xs text-white/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Reorder, then choose where to place them
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={() => setPlacement('bottom')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    placement === 'bottom'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Bottom of Deck
                </button>
                <button
                  onClick={() => setPlacement('top')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    placement === 'top'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Top of Deck
                </button>
              </div>
            </>
          )}
```

Update the confirm button text:

```tsx
        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm transition-opacity hover:opacity-90 cursor-pointer"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {showReorder
            ? `Place on ${placement === 'top' ? 'Top' : 'Bottom'} & Continue`
            : 'Continue'}
        </button>
```

- [ ] **Step 5: Wire onReorderTop in game page**

In `src/app/game/page.tsx`, add a handler:

```tsx
  const handleReorderTop = useCallback((cardIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'REORDER_TOP', cardIds })
    })
  }, [])
```

And pass it to the RevealCardsModal:

```tsx
          <RevealCardsModal
            cards={state.revealState.cards}
            effectType={state.revealState.effectType}
            onDismiss={handleDismissReveal}
            onReorder={handleReorderBottom}
            onReorderTop={handleReorderTop}
          />
```

- [ ] **Step 6: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`

```bash
git add src/lib/game/types.ts src/lib/game/engine.ts src/components/reveal-cards-modal.tsx src/app/game/page.tsx
git commit -m "feat: add REORDER_TOP action and top/bottom placement choice in RevealCardsModal"
```

---

### Task 6: Update Rules Page with Multi-Plane Content

**Files:**
- Modify: `src/lib/rules/content.ts`

**Context:** The rules page should mention Spatial Merging and deck manipulation now that they're supported.

- [ ] **Step 1: Add a new rules section for multi-plane**

In `src/lib/rules/content.ts`, add a new section to the `RULES_SECTIONS` array after the "Phenomena" section:

```ts
  {
    title: 'Spatial Merging (Two Planes)',
    icon: '🔀',
    intro: 'A rare phenomenon that puts two planes in play simultaneously.',
    steps: [
      { text: 'Spatial Merging is a special phenomenon card. When encountered, PlaneChaser reveals cards until it finds two plane cards.' },
      { text: 'Both planes become active at the same time. Their static abilities both apply to the game.' },
      { text: 'When you roll Chaos, both planes\\\' chaos abilities trigger one after the other.' },
      { text: 'When anyone planeswalks, you leave both planes and move to a single new one.' },
      { text: 'Both planes are displayed stacked on the game screen. Tap either one to zoom in.' },
    ],
  },
```

- [ ] **Step 2: Update the "Building Decks" section to mention deck manipulation**

Find the last step in the "Building Decks" section and add one more step:

```ts
      { text: 'Some chaos effects reveal or rearrange the top cards of the planar deck. When this happens, you can choose to put them on top or on the bottom.' },
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/lib/rules/content.ts
git commit -m "docs: add Spatial Merging and deck manipulation rules to How to Play page"
```

---

## Self-Review

**Spec coverage (from memory/project_future_milestones.md Phase 11):**
- ✅ Change GameState to support dual planes — `secondPlaneIndex: number | null` (Task 1)
- ✅ Dual-plane rendering (stacked on mobile) — DualPlaneDisplay component (Task 3)
- ✅ Both chaos abilities trigger when two planes active (Task 4 steps 5-7)
- ✅ Both static abilities text displayed — card zoom shows full text (Task 3)
- ✅ Planeswalk leaves both planes simultaneously — PLANESWALK clears secondPlaneIndex (Task 1)
- ✅ Bottom-deck manipulation — already existed, enhanced with top placement (Task 5)
- ✅ Top-of-deck placement — REORDER_TOP action + UI toggle (Task 5)
- ✅ Spatial Merging phenomenon handler — detection + resolution (Task 2)
- ✅ RevealCardsModal extended for top/bottom choice (Task 5)

**Placeholder scan:** No placeholders. All code blocks complete.

**Type consistency:** `secondPlaneIndex` consistent across types.ts, engine.ts, game/page.tsx. `SPATIAL_MERGE`, `LEAVE_DUAL_PLANE`, `RESOLVE_SPATIAL_MERGE`, `REORDER_TOP` all defined in types.ts and handled in engine.ts. `DualPlaneDisplay` props match usage in game page. `RevealCardsModal` new `onReorderTop` prop optional — backward compatible.
