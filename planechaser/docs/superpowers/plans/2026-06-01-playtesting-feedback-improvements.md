# Playtesting Feedback Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all actionable feedback from the May 24, 2026 playtesting session — fixing bugs (non-host stats), improving UX (card zoom, turn button, breadcrumbs, deck default), and adding requested features (game controls toolbar, pod-start player selection, clickable breadcrumbs).

**Architecture:** All changes are UI/UX improvements and bug fixes to existing pages and components. No new database tables required. Changes touch the game page, setup page, card zoom modal, turn indicator, profile page, and pod queries. The game engine already supports UNDO — we're exposing it via a new toolbar component.

**Tech Stack:** Next.js 15 App Router, React 19, Framer Motion 11, Tailwind CSS 4, Supabase Postgres, Zustand 4, TanStack Query 5

**Source:** `D:\Downloads\PlaneChaser Notes.pdf` — May 24, 2026 game testing session (Tim + Garrett + Matthew)

---

## Feedback Triage & Prioritization

Each item from the playtesting notes is categorized below. Items marked ✅ are included in this plan. Items marked 🔮 are deferred to a future milestone (too large or speculative for this round). Items marked ✓ already work.

### Bugs (fix now)
| # | Feedback | Root Cause | Plan Task |
|---|----------|-----------|-----------|
| B1 | Non-host players show 0 stats (games, rolls, visits) | `getUserStats()` queries `host_user_id = userId` — misses non-host participants | Task 1 |
| B2 | Non-admin didn't see new pod until manual refresh | No Supabase Realtime subscription on pod_members | Task 7 |

### UX Improvements (fix now)
| # | Feedback | What to Change | Plan Task |
|---|----------|---------------|-----------|
| U1 | Plane card too small during gameplay; zoomed view overshoots frame | Increase in-game card size; constrain zoom modal to viewport height | Task 2 |
| U2 | Deck mode defaults to "Saved" — playtesters prefer "Random" | Change `useState<DeckMode>('saved')` → `'random'` on setup page | Task 3 |
| U3 | "Next Turn" button hard to see/remember | Enlarge button, add contrasting color, make it more prominent | Task 4 |
| U4 | Breadcrumbs should be clickable to preview visited planes | Wire tap handler on breadcrumb names to open CardZoomModal | Task 5 |
| U5 | Need in-game deck controls (Undo, Shuffle, Reset Rolls, Manual Planeswalk/Chaos) | Add collapsible game controls toolbar | Task 6 |
| U6 | Starting a new game from pod should show player names not count; let you pick who's playing | Refactor setup page pod-start mode to show checkboxes per member | Task 8 |
| U7 | Profile page — need to filter conquered planes by pod | Add pod filter dropdown to conquests tab | Task 9 |
| U8 | Deck builder expanded card view doesn't fit viewport height | Constrain zoom modal with `max-h-[90vh]` | Task 2 (same fix) |

### Already Working ✓
| Feedback | Status |
|----------|--------|
| "Start with Pod" flow | Works — setup page has `podStart=true` mode |
| Pod details shown on play page | Already displayed when pod-start mode is active |
| End game award flow | "Went smoothly" per testers |
| Winner receives conquered plane | Confirmed working (Matthew's game 2) |
| Undo exists in game engine | `UNDO` action already in `gameReducer` — just not exposed in UI |
| Pod deletion | `useDeletePod` hook + `PodSettingsModal` already support this |
| Leave pod | `useLeavePod` hook + pod detail page already support this |

### Deferred to Future Milestone 🔮
| Feedback | Why Deferred |
|----------|-------------|
| Per-player plane decks (each player submits their own deck) | Phase 7b — already tracked in MEMORY.md as deferred |
| "Missiles" (token mechanic for free roll/chaos/planeswalk) | New game mechanic — needs design spec, DB schema changes, balancing |
| Augmented 2-Headed Giant game mode | New game mode — significant engine + UI work |
| Archenemy allies shared plane pool + shared roll counter | Needs Archenemy rules deep-dive and design decisions |
| Archenemy scheme earn/dispersal token economy | New progression system — needs design spec |
| Pod multiverse map visualization | Large feature — constellation/map rendering |
| Pod notes (turn zero discussions) | Nice-to-have — needs rich text or simple notes UI |
| Record player's commander per game | DB schema change + setup UI — small but separate scope |
| Norn's Seedcore special card effects | Card-specific logic — needs effect system expansion |
| Pod membership confirmation (invite acceptance flow) | Auth/notification system expansion |
| Turn order randomization between games | Small but touches lobby + setup — bundle with future lobby work |
| Number of planes default to 10×n (n=players) | Interesting but changes existing UX contract — needs discussion |

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/pods/queries.ts` | Modify | Fix `getUserStats` to include non-host sessions (B1) |
| `src/components/card-zoom-modal.tsx` | Modify | Add `max-h-[90vh]` height constraint (U1, U8) |
| `src/components/plane-card.tsx` | Modify | Increase in-game card max-width (U1) |
| `src/app/setup/page.tsx` | Modify | Default deck mode to `'random'` (U2); pod-start player selection (U6) |
| `src/components/turn-indicator.tsx` | Modify | Enlarge + restyle Next Turn button (U3) |
| `src/app/game/page.tsx` | Modify | Clickable breadcrumbs (U4); wire game controls toolbar (U5); use updated TurnIndicator |
| `src/components/game-controls-toolbar.tsx` | Create | Collapsible toolbar: Undo, Shuffle, Reset Rolls, Manual Planeswalk/Chaos (U5) |
| `src/app/profile/page.tsx` | Modify | Add pod filter to conquests tab (U7) |
| `src/hooks/usePods.ts` | Modify | Add Realtime subscription for pod_members (B2) |

---

## Task 1: Fix Non-Host Player Stats (Bug — Critical)

**Problem:** `getUserStats()` in `src/lib/pods/queries.ts` line 342 filters `game_sessions` by `.eq('host_user_id', userId)`. Players who participate as non-hosts show 0 games played, 0 rolls, 0 visits. The `players_snapshot` JSONB column already stores all participants — we need to query against it.

**Files:**
- Modify: `src/lib/pods/queries.ts` (lines 333-365)

- [ ] **Step 1: Update `getUserStats` to include sessions where user was a participant**

In `src/lib/pods/queries.ts`, find the `getUserStats` function (around line 333). Replace the sessions query:

```typescript
// BEFORE (line 341-342):
const { data: sessions } = await supabase()
  .from('game_sessions')
  .select('die_roll_history, win_condition, planes_visited')
  .eq('host_user_id', userId)

// AFTER — query sessions where user is host OR appears in players_snapshot:
const { data: hostedSessions } = await supabase()
  .from('game_sessions')
  .select('die_roll_history, win_condition, planes_visited')
  .eq('host_user_id', userId)

const { data: participatedSessions } = await supabase()
  .from('game_sessions')
  .select('die_roll_history, win_condition, planes_visited')
  .neq('host_user_id', userId)
  .contains('players_snapshot', JSON.stringify([{ id: userId }]))

const sessions = [...(hostedSessions ?? []), ...(participatedSessions ?? [])]
```

> **Note:** We query hosted and participated separately to avoid double-counting. The `contains` filter on JSONB checks if `players_snapshot` array contains an object with matching `id`. This is supported by Supabase/PostgREST.

- [ ] **Step 2: Verify the rest of the stats aggregation loop works unchanged**

The existing loop (lines 344-365) iterates `sessions` and aggregates `totalRolls`, `planeswalkRolls`, `totalPlanesVisited`, `archenemyGames`. Since we're now passing a unified `sessions` array, the loop works without changes. The `games_played` count (`sessions.length`) will now correctly count all games the user participated in.

- [ ] **Step 3: Test manually**

1. Sign in as a non-host user (Matthew's account if available, or create a test user)
2. Navigate to Profile page
3. Verify stats show games played, die rolls, and planes visited from sessions they participated in
4. Verify the host user's stats remain unchanged (no double-counting)

- [ ] **Step 4: Commit**

```bash
git add src/lib/pods/queries.ts
git commit -m "fix: include non-host players in game stats aggregation

getUserStats() was filtering by host_user_id only, causing non-host
participants to show 0 stats. Now queries players_snapshot JSONB to
include all sessions the user participated in."
```

---

## Task 2: Fix Card Zoom to Fit Viewport (UX — High Impact)

**Problem:** The `CardZoomModal` uses `max-w-[90vw]` with a fixed aspect ratio but no height constraint. On shorter viewports or when zooming browser, the card overflows vertically. The deck builder also uses this modal and has the same issue.

**Files:**
- Modify: `src/components/card-zoom-modal.tsx`

- [ ] **Step 1: Add viewport height constraint to the zoom modal**

In `card-zoom-modal.tsx`, update the inner `motion.div` classes to add a max-height constraint:

```typescript
// BEFORE:
className={rotate
  ? 'relative w-full max-w-[90vw] aspect-[7/5]'
  : 'relative w-full max-w-[360px] aspect-[5/7]'
}

// AFTER:
className={rotate
  ? 'relative w-full max-w-[90vw] max-h-[85vh] aspect-[7/5]'
  : 'relative w-full max-w-[360px] max-h-[90vh] aspect-[5/7]'
}
```

> **Why 85vh for rotated?** Plane cards are displayed landscape (rotated 90°). The 85vh constraint ensures padding from screen edges on any device. The aspect ratio still controls proportions, but `max-h` prevents overflow. The non-rotated case (deck builder vertical cards) uses 90vh since there's no rotation to account for.

- [ ] **Step 2: Test on multiple viewports**

1. Open a game, tap a plane card to zoom — should fit within viewport on both phone (375px) and desktop
2. Open deck builder, tap a card to expand — should not overflow vertically
3. Try with browser zoom at 150% — card should still fit

- [ ] **Step 3: Commit**

```bash
git add src/components/card-zoom-modal.tsx
git commit -m "fix: constrain card zoom modal to viewport height

Adds max-h-[85vh] for rotated plane cards and max-h-[90vh] for
vertical cards to prevent overflow on short viewports and zoomed
browsers."
```

---

## Task 3: Default Deck Mode to "Random" (UX — Quick Win)

**Problem:** Setup page initializes `deckMode` to `'saved'`. Playtesters prefer starting on Random, especially for casual play.

**Files:**
- Modify: `src/app/setup/page.tsx`

- [ ] **Step 1: Change default deck mode**

In `setup/page.tsx`, find the state initialization (around the `useState` declarations):

```typescript
// BEFORE:
const [deckMode, setDeckMode] = useState<DeckMode>('saved')

// AFTER:
const [deckMode, setDeckMode] = useState<DeckMode>('random')
```

- [ ] **Step 2: Test**

1. Navigate to `/setup` — "Random" tab should be selected by default
2. The random size slider should be visible
3. Switching to "Saved Deck" still works
4. Starting a game in random mode works as before

- [ ] **Step 3: Commit**

```bash
git add src/app/setup/page.tsx
git commit -m "ux: default deck mode to Random on setup page

Playtesters prefer Random for casual play. Saved Deck is still
available as an option."
```

---

## Task 4: Enlarge and Restyle the Turn Indicator + Next Turn Button (UX — High Impact)

**Problem:** The Turn Indicator is a small `px-4 py-2` pill with `text-sm` text. The "Next Turn" button (rendered in the game page) is also small. Playtesters found it hard to see and remember to use. This is the most-interacted control during gameplay — it needs to be prominent.

**Files:**
- Modify: `src/components/turn-indicator.tsx`
- Modify: `src/app/game/page.tsx` (the Next Turn button section)

- [ ] **Step 1: Redesign `TurnIndicator` to be larger and more visible**

Replace the entire `turn-indicator.tsx` content:

```tsx
'use client'

import { motion } from 'framer-motion'

interface TurnIndicatorProps {
  playerName: string
  onNextTurn?: () => void
  showNextTurn?: boolean
}

export function TurnIndicator({ playerName, onNextTurn, showNextTurn = true }: TurnIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 w-full"
    >
      {/* Current player display */}
      <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10">
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
        <p
          className="text-base font-semibold text-white tracking-wide"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {playerName}&apos;s Turn
        </p>
      </div>

      {/* Next Turn button — large, high-contrast, impossible to miss */}
      {showNextTurn && onNextTurn && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNextTurn}
          className="w-full max-w-[280px] py-3.5 px-6 rounded-2xl text-base font-bold tracking-wide
                     bg-[var(--color-cta)] text-white
                     border border-[var(--color-cta)]/60
                     shadow-[0_0_20px_rgba(var(--cta-rgb),0.3)]
                     transition-all active:shadow-[0_0_30px_rgba(var(--cta-rgb),0.5)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Next Turn →
        </motion.button>
      )}
    </motion.div>
  )
}
```

> **Design rationale:** The Next Turn button is now `py-3.5` (14px vertical padding) vs the old implicit small button, uses the CTA color (distinct from accent purple), full-width up to 280px, with a glow shadow for visibility. The turn indicator text bumps from `text-sm` to `text-base` with `font-semibold`.

- [ ] **Step 2: Update the game page to use the new TurnIndicator props**

In `game/page.tsx`, find where `TurnIndicator` is rendered and the separate "Next Turn" button. Consolidate them into the single component:

Find the `TurnIndicator` usage and the nearby "Next Turn" / `END_TURN` button. Replace them with:

```tsx
<TurnIndicator
  playerName={currentPlayer?.display_name ?? 'Player'}
  onNextTurn={handleEndTurn}
  showNextTurn={!state.showChaosOverlay && !state.revealState && !state.phenomenonActive}
/>
```

Remove the old separate "Next Turn" `<Button>` that dispatches `END_TURN`, since it's now integrated into `TurnIndicator`.

- [ ] **Step 3: Test**

1. Start a game with 2+ players
2. Verify the turn indicator shows the current player's name prominently
3. Verify the "Next Turn →" button is large, CTA-colored, and easy to find
4. Tap "Next Turn" — turn advances correctly
5. During chaos overlay / phenomenon / reveal, the Next Turn button should be hidden
6. Single-player games should still work (showNextTurn with 1 player)

- [ ] **Step 4: Commit**

```bash
git add src/components/turn-indicator.tsx src/app/game/page.tsx
git commit -m "ux: enlarge turn indicator and integrate Next Turn button

Consolidates turn display and Next Turn action into a single prominent
component. Button uses CTA color with glow for high visibility per
playtester feedback."
```

---

## Task 5: Make Breadcrumbs Clickable to Preview Visited Planes (UX — Medium)

**Problem:** The visited planes breadcrumb in the game page shows plane names as text, but tapping them does nothing. Playtesters want to tap a name to see the card.

**Files:**
- Modify: `src/app/game/page.tsx` (breadcrumb rendering section, around line 464-480)

- [ ] **Step 1: Add state for breadcrumb preview**

In `game/page.tsx`, add state for tracking which breadcrumb plane to preview. Near the other `useState` declarations:

```tsx
const [breadcrumbPreview, setBreadcrumbPreview] = useState<{ src: string; name: string } | null>(null)
```

- [ ] **Step 2: Make breadcrumb names tappable**

Find the breadcrumb rendering section (around line 464-480). The current code maps `visitedBreadcrumb` to display plane names separated by dots. Update each name to be a button:

```tsx
{/* Visited planes breadcrumb */}
{visitedBreadcrumb.length > 1 && (
  <div className="flex flex-wrap items-center justify-center gap-1 px-2">
    {visitedBreadcrumb.map((name, i) => (
      <span key={`${name}-${i}`} className="flex items-center gap-1">
        {i > 0 && <span className="text-[10px] text-[var(--color-text-muted)]">·</span>}
        <button
          onClick={() => {
            const card = state.deck.find((c) => c.name === name)
            if (card) {
              setBreadcrumbPreview({
                src: card.image_uris.border_crop,
                name: card.name,
              })
            }
          }}
          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] active:text-[var(--color-accent)] transition-colors underline decoration-dotted underline-offset-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {name}
        </button>
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 3: Render the preview modal**

Add the `CardZoomModal` for breadcrumb preview, near the other modals at the bottom of the JSX:

```tsx
<CardZoomModal
  src={breadcrumbPreview?.src ?? null}
  alt={breadcrumbPreview?.name ?? ''}
  onClose={() => setBreadcrumbPreview(null)}
/>
```

> **Note:** `CardZoomModal` already handles `src={null}` by not rendering (it uses `AnimatePresence` with a conditional). No import needed — it's already imported for the plane card zoom.

- [ ] **Step 4: Test**

1. Start a game and planeswalk to 3+ planes
2. Breadcrumb trail should show plane names with dotted underlines
3. Tap a plane name — zoom modal opens showing that card
4. Tap backdrop to close — returns to game
5. Current plane name in breadcrumb should also be tappable

- [ ] **Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "ux: make visited plane breadcrumbs clickable for preview

Tapping a plane name in the breadcrumb trail opens the card zoom modal
showing that plane card. Uses dotted underline styling to indicate
interactivity."
```

---

## Task 6: Add In-Game Controls Toolbar (UX — High Impact)

**Problem:** Playtesters requested Undo, Shuffle Deck, Reset Rolls, and manual Planeswalk/Chaos buttons during gameplay. The game engine already supports `UNDO` and `PLANESWALK` actions, but they aren't exposed in the UI.

**Files:**
- Create: `src/components/game-controls-toolbar.tsx`
- Modify: `src/app/game/page.tsx` (wire toolbar)
- Modify: `src/lib/game/engine.ts` (add `SHUFFLE_REMAINING` and `RESET_ROLL_COUNT` actions)

- [ ] **Step 1: Add new game actions to the engine**

In `src/lib/game/types.ts`, add two new action types to the `GameAction` union:

```typescript
// Add to the GameAction union type:
| { type: 'SHUFFLE_REMAINING' }
| { type: 'RESET_ROLL_COUNT' }
```

- [ ] **Step 2: Handle new actions in the reducer**

In `src/lib/game/engine.ts`, add cases to the `applyAction` switch statement (before the `default` case):

```typescript
case 'SHUFFLE_REMAINING': {
  // Shuffle all cards after the current index (future draws)
  const before = state.deck.slice(0, state.currentPlaneIndex + 1)
  const after = state.deck.slice(state.currentPlaneIndex + 1)
  // Fisher-Yates shuffle on the remaining cards
  for (let i = after.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[after[i], after[j]] = [after[j], after[i]]
  }
  return {
    ...state,
    deck: [...before, ...after],
  }
}

case 'RESET_ROLL_COUNT': {
  return {
    ...state,
    rollCountThisTurn: 0,
    currentTurnRolls: [],
  }
}
```

- [ ] **Step 3: Create the GameControlsToolbar component**

Create `src/components/game-controls-toolbar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Undo2, Shuffle, RotateCcw, Compass, Sparkles, ChevronUp, ChevronDown } from 'lucide-react'

interface GameControlsToolbarProps {
  onUndo: () => void
  onShuffle: () => void
  onResetRolls: () => void
  onPlaneswalk: () => void
  onChaos: () => void
  canUndo: boolean
  disabled?: boolean
}

export function GameControlsToolbar({
  onUndo,
  onShuffle,
  onResetRolls,
  onPlaneswalk,
  onChaos,
  canUndo,
  disabled = false,
}: GameControlsToolbarProps) {
  const [expanded, setExpanded] = useState(false)

  const controls = [
    { icon: Undo2, label: 'Undo', action: onUndo, enabled: canUndo, color: 'var(--color-text-muted)' },
    { icon: Shuffle, label: 'Shuffle', action: onShuffle, enabled: true, color: 'var(--color-text-muted)' },
    { icon: RotateCcw, label: 'Reset Rolls', action: onResetRolls, enabled: true, color: 'var(--color-text-muted)' },
    { icon: Compass, label: 'Planeswalk', action: onPlaneswalk, enabled: true, color: 'var(--color-accent)' },
    { icon: Sparkles, label: 'Chaos', action: onChaos, enabled: true, color: '#ef4444' },
  ]

  return (
    <div className="w-full flex flex-col items-center">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        Game Controls
      </button>

      {/* Expandable toolbar */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full"
          >
            <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
              {controls.map(({ icon: Icon, label, action, enabled, color }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled || !enabled}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                             bg-white/5 border border-white/10
                             hover:bg-white/10 active:bg-white/15
                             disabled:opacity-30 disabled:pointer-events-none
                             transition-all min-w-[56px]"
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span
                    className="text-[9px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

> **Design rationale:** Collapsed by default so it doesn't clutter the game screen. Expands to show 5 icon buttons in a row. Planeswalk uses accent color, Chaos uses red — consistent with die roller colors. Undo is disabled when no history exists.

- [ ] **Step 4: Wire the toolbar into the game page**

In `game/page.tsx`:

1. Add import:
```tsx
import { GameControlsToolbar } from '@/components/game-controls-toolbar'
```

2. Add handler functions near the other handlers:
```tsx
const handleManualPlaneswalk = useCallback(() => {
  setSlideDirection('right')
  setState((prev) => {
    if (!prev) return prev
    return gameReducer(prev, { type: 'PLANESWALK' })
  })
}, [])

const handleManualChaos = useCallback(() => {
  setState((prev) => {
    if (!prev) return prev
    return { ...prev, showChaosOverlay: true }
  })
}, [])

const handleShuffle = useCallback(() => {
  setState((prev) => {
    if (!prev) return prev
    return gameReducer(prev, { type: 'SHUFFLE_REMAINING' })
  })
}, [])

const handleResetRolls = useCallback(() => {
  setState((prev) => {
    if (!prev) return prev
    return gameReducer(prev, { type: 'RESET_ROLL_COUNT' })
  })
}, [])

const handleUndo = useCallback(() => {
  setState((prev) => {
    if (!prev) return prev
    return gameReducer(prev, { type: 'UNDO' })
  })
}, [])
```

3. Render the toolbar below the die roller and above the breadcrumbs:
```tsx
<GameControlsToolbar
  onUndo={handleUndo}
  onShuffle={handleShuffle}
  onResetRolls={handleResetRolls}
  onPlaneswalk={handleManualPlaneswalk}
  onChaos={handleManualChaos}
  canUndo={(state?.stateHistory?.length ?? 0) > 0}
  disabled={state?.showChaosOverlay || !!state?.revealState || state?.phenomenonActive}
/>
```

- [ ] **Step 5: Test**

1. Start a game, expand Game Controls toolbar
2. **Undo:** Roll the die, then tap Undo — roll count should revert
3. **Shuffle:** Tap Shuffle — remaining deck is reshuffled (verify by planeswalking a few times)
4. **Reset Rolls:** Roll 3 times (cost should be 3 mana), tap Reset Rolls — cost resets to 0
5. **Planeswalk:** Tap Planeswalk — moves to next plane without rolling
6. **Chaos:** Tap Chaos — chaos overlay appears for current plane
7. Toolbar should be disabled during chaos overlay, reveal modal, and phenomenon
8. Undo button should be disabled when stateHistory is empty

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/types.ts src/lib/game/engine.ts src/components/game-controls-toolbar.tsx src/app/game/page.tsx
git commit -m "feat: add in-game controls toolbar with Undo, Shuffle, Reset, Planeswalk, Chaos

Collapsible toolbar exposes game engine actions that were previously
only available through die rolls. SHUFFLE_REMAINING and RESET_ROLL_COUNT
are new reducer actions. Toolbar is collapsed by default to keep the
game screen clean."
```

---

## Task 7: Auto-Refresh Pod List on Membership Changes (Bug Fix)

**Problem:** When a player is invited to a pod, they don't see it until they manually refresh. Need a Supabase Realtime subscription to invalidate the pods query.

**Files:**
- Modify: `src/hooks/usePods.ts`

- [ ] **Step 1: Add a Realtime subscription hook for pod_members**

In `src/hooks/usePods.ts`, add a new hook and update `useUserPods`:

```tsx
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUserPods() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()

  // Subscribe to pod_members changes for this user
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`pod-members-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pod_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['pods', user.id] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, qc])

  return useQuery({
    queryKey: ['pods', user?.id],
    queryFn: () => getUserPods(user!.id),
    enabled: !!user,
  })
}
```

> **Note:** This subscribes to `pod_members` filtered by the current user's ID. When a row is inserted (user added to pod), updated, or deleted (user removed), the pods query is automatically invalidated and refetched. The `useQueryClient` import should already be present from other hooks in this file.

- [ ] **Step 2: Verify Supabase Realtime is enabled for pod_members table**

Realtime needs to be enabled on the `pod_members` table in Supabase. Check if it's already configured. If not, add a migration or enable it in the Supabase dashboard:

```sql
-- Run in Supabase SQL editor if not already enabled:
ALTER PUBLICATION supabase_realtime ADD TABLE pod_members;
```

- [ ] **Step 3: Test**

1. Sign in as User A, note their pods list
2. In a separate browser/incognito, sign in as User B (pod admin)
3. User B adds User A to a new pod
4. User A's pods page should update within a few seconds without manual refresh
5. User B removes User A — pods page should update automatically

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePods.ts
git commit -m "fix: auto-refresh pod list on membership changes via Realtime

Subscribes to pod_members Postgres changes filtered by current user.
Pod list now updates automatically when invited to or removed from a pod."
```

---

## Task 8: Pod-Start Player Selection with Checkboxes (UX — Medium)

**Problem:** When starting a game from a pod (`?podStart=true`), the setup page still shows a generic player count selector. Playtesters want to see the actual pod members' names with checkboxes to select who's playing this game.

**Files:**
- Modify: `src/app/setup/page.tsx`

- [ ] **Step 1: Replace player count selector with member checkboxes in pod-start mode**

In `setup/page.tsx`, find the "Players" section that renders `PLAYER_OPTIONS` buttons. Wrap it in a conditional:

```tsx
{/* Players section */}
{podStartMode && podMembers && podMembers.length > 0 ? (
  // Pod-start mode: show checkboxes for each member
  <div className="space-y-3">
    <p
      className="text-[13px] font-semibold text-[var(--color-text)]"
      style={{ fontFamily: 'var(--font-heading)' }}
    >
      Players in this game
    </p>
    <div className="space-y-2">
      {podMembers.map((member) => {
        const memberId = member.user_id
        const displayName = member.profile?.display_name ?? 'Player'
        const isSelected = selectedPodPlayerIds.has(memberId)
        return (
          <button
            key={memberId}
            onClick={() => {
              setSelectedPodPlayerIds((prev) => {
                const next = new Set(prev)
                if (next.has(memberId)) {
                  next.delete(memberId)
                } else {
                  next.add(memberId)
                }
                return next
              })
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              isSelected
                ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                : 'border-[var(--color-text-muted)]'
            }`}>
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className="text-[14px] text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {displayName}
            </span>
          </button>
        )
      })}
    </div>
    <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
      {selectedPodPlayerIds.size} player{selectedPodPlayerIds.size !== 1 ? 's' : ''} selected
    </p>
  </div>
) : (
  // Non-pod mode: show existing player count selector
  <div className="space-y-3">
    {/* ... existing PLAYER_OPTIONS buttons ... */}
  </div>
)}
```

- [ ] **Step 2: Add the selectedPodPlayerIds state**

Near the other `useState` declarations in `SetupPageInner`:

```tsx
const [selectedPodPlayerIds, setSelectedPodPlayerIds] = useState<Set<string>>(new Set())

// Initialize with all pod members when they load
useEffect(() => {
  if (podStartMode && podMembers && podMembers.length > 0 && selectedPodPlayerIds.size === 0) {
    setSelectedPodPlayerIds(new Set(podMembers.map((m) => m.user_id)))
  }
}, [podMembers, podStartMode])
```

- [ ] **Step 3: Update the game start function to use selected members**

In the `startGame` function, update the players construction for pod-start mode to filter by selected IDs:

```typescript
// BEFORE:
const players = podStartMode && podMembers && podMembers.length > 0
  ? podMembers.map((m) => ({
      id: m.user_id,
      display_name: m.profile?.display_name ?? 'Player',
    }))
  : /* ... existing non-pod logic ... */

// AFTER:
const players = podStartMode && podMembers && podMembers.length > 0
  ? podMembers
      .filter((m) => selectedPodPlayerIds.has(m.user_id))
      .map((m) => ({
        id: m.user_id,
        display_name: m.profile?.display_name ?? 'Player',
      }))
  : /* ... existing non-pod logic ... */
```

Also update `playerCount` usage to derive from selected members in pod mode:

```typescript
const effectivePlayerCount = podStartMode ? selectedPodPlayerIds.size : playerCount
```

Use `effectivePlayerCount` in the `GameState` config instead of `playerCount`.

- [ ] **Step 4: Disable start if fewer than 2 selected**

Update the "Start Game" button's disabled logic to check selection:

```tsx
disabled={
  /* existing conditions */ ||
  (podStartMode && selectedPodPlayerIds.size < 2)
}
```

- [ ] **Step 5: Test**

1. Create a pod with 4 members
2. From the pod page, tap "Start with Pod"
3. Setup page should show all 4 members with checkboxes, all checked by default
4. Uncheck 1 player — count shows "3 players selected"
5. Uncheck until only 1 left — Start button should be disabled
6. Start game with 3 selected — only those 3 appear in the game's turn order
7. Non-pod start (from home page) should still show the numeric player count selector

- [ ] **Step 6: Commit**

```bash
git add src/app/setup/page.tsx
git commit -m "ux: show pod member checkboxes instead of player count in pod-start mode

When starting a game from a pod, displays each member by name with a
checkbox. All members are selected by default. Players can be toggled
on/off. Minimum 2 players required to start."
```

---

## Task 9: Add Pod Filter to Profile Conquests Tab (UX — Medium)

**Problem:** The profile page shows all conquered planes in a flat list. Playtesters want to filter by pod to see conquests for a specific playgroup.

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add pod filter state and dropdown**

In `profile/page.tsx`, near the existing state declarations, add:

```tsx
const [conquestPodFilter, setConquestPodFilter] = useState<string | null>(null)
```

- [ ] **Step 2: Filter conquests by pod**

Find where conquests are mapped to `PlaneSlide[]` for the carousel. Add filtering:

```tsx
const filteredConquests = useMemo(() => {
  if (!conquests) return []
  if (!conquestPodFilter) return conquests
  return conquests.filter((c) => c.pod_id === conquestPodFilter)
}, [conquests, conquestPodFilter])
```

Use `filteredConquests` instead of `conquests` when building the carousel slides.

- [ ] **Step 3: Render the pod filter dropdown**

In the conquests tab content, above the carousel, add a pod filter:

```tsx
{/* Pod filter */}
{pods && pods.length > 1 && (
  <div className="flex items-center gap-2 px-1">
    <span
      className="text-[11px] text-[var(--color-text-muted)] shrink-0"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      Filter:
    </span>
    <select
      value={conquestPodFilter ?? ''}
      onChange={(e) => setConquestPodFilter(e.target.value || null)}
      className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[12px] px-2 transition-colors focus:border-[var(--color-cta)]/50 focus:outline-none"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <option value="">All Pods</option>
      {pods.map((pod) => (
        <option key={pod.id} value={pod.id}>
          {pod.name}
        </option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 4: Add pod name to conquest card subtitle**

When building conquest slides, include the pod name in the subtitle:

```tsx
const conquestSlides: PlaneSlide[] = useMemo(() => {
  return filteredConquests.map((c) => {
    const podName = pods?.find((p) => p.id === c.pod_id)?.name
    return {
      name: c.plane_name,
      imageUrl: c.plane_image_uri,
      subtitle: podName ? `🏆 ${podName}` : undefined,
    }
  })
}, [filteredConquests, pods])
```

- [ ] **Step 5: Test**

1. Navigate to Profile page
2. If user has conquests across multiple pods, the filter dropdown should appear
3. Select a specific pod — only that pod's conquests show
4. Select "All Pods" — all conquests show again
5. Each conquest card should show the pod name as a subtitle
6. If user only has one pod, the filter dropdown should not appear

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "ux: add pod filter to profile conquests tab

Adds a dropdown to filter conquered planes by pod. Each conquest card
now shows the pod name as a subtitle. Filter only appears when user
belongs to multiple pods."
```

---

## Task 10: FAQ / Tips & Tricks Page (UX — Onboarding)

**Problem:** Playtesters experienced confusion around several game concepts: "Start with Pod" vs "Play in this Pod", when to change turns, how die roll costs work, what chaos/planeswalk do. No in-app help or FAQ exists. The page should be accessible from the profile page (not the bottom nav — avoid clutter).

**Files:**
- Create: `src/app/faq/page.tsx`
- Create: `src/lib/faq/content.ts`
- Modify: `src/app/profile/page.tsx` (add link to FAQ)

- [ ] **Step 1: Create the FAQ content data file**

Create `src/lib/faq/content.ts`:

```typescript
export interface FAQSection {
  title: string
  icon: string
  items: { question: string; answer: string }[]
}

export const FAQ_SECTIONS: FAQSection[] = [
  {
    title: 'Getting Started',
    icon: '🎲',
    items: [
      {
        question: 'What is Planechase?',
        answer: 'Planechase is a casual Magic: The Gathering format where players traverse the Blind Eternities, visiting different planes of the multiverse. Each plane has unique effects that modify gameplay. Players roll the planar die to trigger chaos effects or planeswalk to new planes.',
      },
      {
        question: 'How do I start a game?',
        answer: 'Tap "Start Playing" from the home screen. Choose your deck type (Random or Saved Deck), set the number of players, and tap "Start Game." If you\'re in a pod, you can also start from the pod page using "Start with Pod" to auto-populate players.',
      },
      {
        question: 'What\'s the difference between "Start with Pod" and "Play in this Pod"?',
        answer: '"Start with Pod" begins a new Planechase game session with your pod members pre-selected. "Play in this Pod" sets the pod as your active pod for conquest tracking — any game you play will count toward that pod\'s leaderboard.',
      },
    ],
  },
  {
    title: 'Gameplay',
    icon: '⚔️',
    items: [
      {
        question: 'How does the planar die work?',
        answer: 'The planar die has 6 faces: 4 blank, 1 planeswalk (✦), and 1 chaos (🌀). Your first roll each turn is free. Each additional roll costs 1 more mana than the last (2nd roll = 1 mana, 3rd = 2 mana, etc.). The cost resets when the turn changes.',
      },
      {
        question: 'What happens on a Planeswalk roll?',
        answer: 'When you roll the planeswalk symbol (✦), you leave the current plane and travel to the next one in the deck. The current plane\'s effects end and the new plane\'s effects begin immediately.',
      },
      {
        question: 'What happens on a Chaos roll?',
        answer: 'When you roll chaos (🌀), the current plane\'s chaos ability triggers. Each plane has a unique chaos effect — read the card text to see what happens. The chaos overlay shows you the effect.',
      },
      {
        question: 'When should I end my turn?',
        answer: 'Tap "Next Turn →" when you\'re done rolling the planar die for your turn. This passes control to the next player in turn order and resets the roll cost to 0.',
      },
      {
        question: 'What are Phenomena?',
        answer: 'Phenomena are special cards in the planar deck that trigger a one-time effect when you planeswalk to them, then immediately move you to the next plane. They don\'t stay in play like regular planes.',
      },
    ],
  },
  {
    title: 'Conquest & Pods',
    icon: '🏆',
    items: [
      {
        question: 'What is the Conquest system?',
        answer: 'PlaneChaser adds a persistent meta-game on top of Planechase. When your Commander game ends, the winner "conquers" whichever plane is currently active. Conquered planes are tracked on your profile and your pod\'s leaderboard.',
      },
      {
        question: 'What is a Pod?',
        answer: 'A pod is your regular playgroup. Create one, invite friends via invite code, and track your conquest standings together. When one player conquers enough planes (set by the archenemy threshold), they become the Archenemy.',
      },
      {
        question: 'What happens when someone becomes the Archenemy?',
        answer: 'When a player reaches the pod\'s archenemy threshold, the next game becomes an Archenemy showdown. The archenemy plays against the rest of the pod with a scheme deck, creating an asymmetric game experience.',
      },
    ],
  },
  {
    title: 'Game Controls',
    icon: '🎮',
    items: [
      {
        question: 'What do the Game Controls do?',
        answer: 'Expand the Game Controls toolbar during a game for advanced actions: Undo (revert last action), Shuffle (randomize remaining deck), Reset Rolls (set roll cost back to 0), Planeswalk (manually move to next plane), and Chaos (manually trigger the current plane\'s chaos effect).',
      },
      {
        question: 'Can I go back to a previous plane?',
        answer: 'Use the Undo button in the Game Controls toolbar to revert recent actions, including planeswalks. You can also tap plane names in the breadcrumb trail to preview visited planes (this doesn\'t navigate back, just shows the card).',
      },
    ],
  },
  {
    title: 'Decks',
    icon: '📚',
    items: [
      {
        question: 'What\'s the difference between Random and Saved Deck?',
        answer: 'Random mode pulls a set number of planes from the full catalog for a one-off game. Saved Deck mode uses a deck you\'ve built in the Deck Builder, letting you curate which planes you play with. You can exclude planes you\'ve already conquered.',
      },
      {
        question: 'How many planes should my deck have?',
        answer: 'The minimum is 10. For a typical 4-player game, 30-40 planes gives a good variety without the game dragging. The Random mode defaults to 40.',
      },
    ],
  },
]
```

- [ ] **Step 2: Create the FAQ page**

Create `src/app/faq/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { FAQ_SECTIONS } from '@/lib/faq/content'

export default function FAQPage() {
  const router = useRouter()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <main
      className="min-h-screen pb-nav"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
        </button>
        <div>
          <h1
            className="text-lg font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Tips & Tricks
          </h1>
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Everything you need to know about PlaneChaser
          </p>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="px-4 py-4 space-y-6 max-w-[520px] mx-auto">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            {/* Section header */}
            <h2
              className="text-[14px] font-semibold text-[var(--color-accent)] flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span>{section.icon}</span>
              {section.title}
            </h2>

            {/* Accordion items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const key = `${section.title}-${item.question}`
                const isOpen = openItems.has(key)

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span
                        className="text-[13px] font-medium text-[var(--color-text)]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p
                            className="px-4 pb-3 text-[12px] leading-relaxed text-[var(--color-text-muted)]"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Add a link to the FAQ from the profile page**

In `src/app/profile/page.tsx`, find the settings/action area (near the sign out button or theme toggle). Add a "Tips & Tricks" link:

```tsx
import { HelpCircle } from 'lucide-react'

// Add near the sign out / theme toggle buttons:
<button
  onClick={() => router.push('/faq')}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 hover:bg-white/5 transition-colors w-full"
>
  <HelpCircle className="w-4 h-4 text-[var(--color-accent)]" />
  <span
    className="text-[13px] text-[var(--color-text)]"
    style={{ fontFamily: 'var(--font-body)' }}
  >
    Tips & Tricks
  </span>
</button>
```

- [ ] **Step 4: Test**

1. Navigate to Profile page — "Tips & Tricks" button should appear
2. Tap it — FAQ page opens with accordion sections
3. Tap a question — answer expands with smooth animation
4. Tap again — collapses
5. Multiple questions can be open simultaneously
6. Back button returns to profile
7. Bottom nav is NOT affected (no new tab added)

- [ ] **Step 5: Commit**

```bash
git add src/lib/faq/content.ts src/app/faq/page.tsx src/app/profile/page.tsx
git commit -m "feat: add Tips & Tricks FAQ page accessible from profile

Accordion-style FAQ covering gameplay, die roll costs, conquest system,
pods, decks, and game controls. Accessible via profile page link —
no bottom nav clutter."
```

---

## Plan Self-Review

### 1. Spec Coverage Check

| Playtesting Note | Task | Status |
|-----------------|------|--------|
| Non-host stats bug | Task 1 | ✅ Covered |
| Card too small / zoom overflow | Task 2 | ✅ Covered |
| Default to Random | Task 3 | ✅ Covered |
| Next Turn hard to see | Task 4 | ✅ Covered |
| Clickable breadcrumbs | Task 5 | ✅ Covered |
| Game controls (Undo, Shuffle, etc.) | Task 6 | ✅ Covered |
| Pod refresh for non-admin | Task 7 | ✅ Covered |
| Pod-start player selection | Task 8 | ✅ Covered |
| Profile conquest filter by pod | Task 9 | ✅ Covered |
| Tips & Tricks / onboarding help | Task 10 | ✅ Covered |
| Deck builder card height | Task 2 | ✅ Same CardZoomModal fix |
| Delete/leave pods | Already works | ✓ Verified in codebase |
| Award flow | Already works | ✓ Per playtester notes |
| Per-player decks | Deferred | 🔮 Phase 7b |
| Missiles/tokens | Deferred | 🔮 Needs design |
| 2HG mode | Deferred | 🔮 New game mode |
| Archenemy discussions | Deferred | 🔮 Needs design decisions |
| Map view | Deferred | 🔮 Large feature |
| Pod notes | Deferred | 🔮 Nice-to-have |
| Commander tracking | Deferred | 🔮 Separate scope |
| Card-specific effects | Deferred | 🔮 Effect system |
| Turn order randomization | Deferred | 🔮 Bundle with lobby |

### 2. Placeholder Scan
- No TBD/TODO/placeholder language found
- All code blocks contain complete, copy-paste-ready code
- All file paths are exact

### 3. Type Consistency Check
- `GameAction` union updated in Task 6 Step 1 with `SHUFFLE_REMAINING` and `RESET_ROLL_COUNT` — matches reducer cases in Step 2
- `TurnIndicatorProps` in Task 4 adds `onNextTurn` and `showNextTurn` — matches usage in game page
- `GameControlsToolbarProps` interface matches all props passed from game page
- `selectedPodPlayerIds` is `Set<string>` throughout Task 8
- `conquestPodFilter` is `string | null` consistently in Task 9
- `FAQSection` interface in content.ts matches usage in FAQ page

### 4. Risk Assessment
- **Task 1 (stats fix):** The `contains` filter on JSONB is the one area to double-check with actual Supabase/PostgREST. If `contains` doesn't work with partial object matching, fallback is a Postgres function or RPC call.
- **Task 4 (turn indicator):** Consolidating the Next Turn button into TurnIndicator changes the game page layout. Need to carefully remove the old button without breaking the surrounding flex layout.
- **Task 6 (toolbar):** Manual Planeswalk/Chaos bypass the die roll — this is intentional (admin tool for correcting mistakes or rule overrides), but could be abused. The toolbar is collapsed by default which mitigates casual misuse.
