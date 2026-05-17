# Phase 3: Game Mechanics Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The game plays correctly with satisfying interactions: undo reverts last action, chaos overlay stays until tapped, roll cost is tappable to show history, and the multiplayer lobby→game transition works without detour through setup.

**Architecture:** Four independent subsystems: (1) Undo — circular buffer of 5 state snapshots pushed before each reducer action, with an UNDO action that pops. (2) Chaos overlay — tap-to-dismiss replacing auto-timeout, with DISMISS_CHAOS action. (3) Roll cost display — tappable cost badge opens roll history popover. (4) Lobby fix — "Start Game" in lobby starts the game directly using session player list + config, bypassing setup redirect.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zustand, Framer Motion, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `planechaser/src/lib/game/types.ts` | Add `stateHistory` to GameState, add `UNDO` and `DISMISS_CHAOS` to GameAction |
| `planechaser/src/lib/game/engine.ts` | Implement `UNDO` and `DISMISS_CHAOS` cases, add `withUndo` wrapper |
| `planechaser/src/lib/game/engine.test.ts` | Tests for undo buffer, DISMISS_CHAOS, and withUndo |
| `planechaser/src/app/game/page.tsx` | Integrate undo dispatch, chaos tap-to-dismiss, undo button |
| `planechaser/src/components/die-roller.tsx` | Make cost tappable, show roll history popover |
| `planechaser/src/components/chaos-overlay.tsx` | Full-screen chaos overlay (tap to dismiss) |
| `planechaser/src/components/roll-history-popover.tsx` | Roll history for current turn |
| `planechaser/src/app/lobby/page.tsx` | Fix start game to go directly into game |
| `planechaser/src/hooks/useGameSession.ts` | Add `useStartGameFromLobby` hook |

---

### Task 1: Extend Game Types for Undo & Chaos

**Files:**
- Modify: `planechaser/src/lib/game/types.ts`

- [ ] **Step 1: Add stateHistory to GameState and new actions**

```typescript
// Add to GameState interface (after turnHistory field):
  stateHistory: Omit<GameState, 'stateHistory'>[]

// Add to GameAction union:
  | { type: 'UNDO' }
  | { type: 'DISMISS_CHAOS' }

// Add to GameState interface:
  showChaosOverlay: boolean
```

The full updated `GameState` interface should be:

```typescript
export interface GameState {
  id: string
  config: GameConfig
  deck: PlaneCard[]
  currentPlaneIndex: number
  dieState: DieState
  lastDieResult: DieResult | null
  rollCountThisTurn: number
  dieRollHistory: DieRoll[]
  planesVisited: number
  startedAt: number
  archenemy?: ArchenemyState
  // Multiplayer turn tracking
  players: Player[]
  turnOrder: string[]
  currentTurnIndex: number
  currentTurnRolls: DieRoll[]
  turnHistory: TurnRecord[]
  // Undo system
  stateHistory: Omit<GameState, 'stateHistory'>[]
  // Chaos overlay
  showChaosOverlay: boolean
}
```

The full updated `GameAction` type should be:

```typescript
export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'RESET_TURN' }
  | { type: 'DRAW_SCHEME' }
  | { type: 'ABANDON_SCHEME'; schemeId: string }
  | { type: 'UNDO' }
  | { type: 'DISMISS_CHAOS' }
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd planechaser && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors about missing `stateHistory` and `showChaosOverlay` in test fixtures and components (not type definition errors).

- [ ] **Step 3: Commit**

```bash
git add planechaser/src/lib/game/types.ts
git commit -m "feat(types): add undo stateHistory, showChaosOverlay, UNDO + DISMISS_CHAOS actions"
```

---

### Task 2: Implement Undo and Chaos in Game Engine

**Files:**
- Modify: `planechaser/src/lib/game/engine.ts`

- [ ] **Step 1: Add withUndo wrapper and implement UNDO + DISMISS_CHAOS**

The engine needs:
1. A `withUndo` function that wraps the reducer — before applying any action (except UNDO and DISMISS_CHAOS), push a snapshot onto `stateHistory` (capped at 5).
2. The UNDO action pops the most recent snapshot.
3. The DISMISS_CHAOS action clears `showChaosOverlay`.
4. The ROLL_DIE case sets `showChaosOverlay: true` when result is chaos.

Replace the entire `engine.ts` with:

```typescript
import type { GameState, GameAction, DieResult, TurnRecord } from './types'

const MAX_UNDO_HISTORY = 5

export function rollPlanarDie(): DieResult {
  const roll = Math.random()
  if (roll < 1 / 6) return 'planeswalk'
  if (roll < 2 / 6) return 'chaos'
  return 'blank'
}

export function chaosCost(rollCount: number): number {
  return Math.max(0, rollCount - 1)
}

function stripHistory(state: GameState): Omit<GameState, 'stateHistory'> {
  const { stateHistory: _, ...rest } = state
  return rest
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'UNDO') {
    if (state.stateHistory.length === 0) return state
    const previous = state.stateHistory[state.stateHistory.length - 1]
    return {
      ...previous,
      stateHistory: state.stateHistory.slice(0, -1),
    }
  }

  if (action.type === 'DISMISS_CHAOS') {
    return { ...state, showChaosOverlay: false }
  }

  // Push current state onto history before applying action
  const snapshot = stripHistory(state)
  const newHistory = [...state.stateHistory, snapshot].slice(-MAX_UNDO_HISTORY)

  const nextState = applyAction({ ...state, stateHistory: newHistory }, action)
  return nextState
}

function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROLL_DIE': {
      const roll = { result: action.result, timestamp: Date.now() }
      return {
        ...state,
        dieState: 'settled',
        lastDieResult: action.result,
        rollCountThisTurn: state.rollCountThisTurn + 1,
        dieRollHistory: [...state.dieRollHistory, roll],
        currentTurnRolls: [...(state.currentTurnRolls ?? []), roll],
        showChaosOverlay: action.result === 'chaos',
      }
    }

    case 'SETTLE_DIE':
      return { ...state, dieState: 'idle' }

    case 'PLANESWALK': {
      const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
      return {
        ...state,
        currentPlaneIndex: nextIndex,
        planesVisited: state.planesVisited + 1,
        rollCountThisTurn: 0,
        lastDieResult: null,
        dieState: 'idle',
      }
    }

    case 'END_TURN': {
      const currentPlayerId = state.turnOrder[state.currentTurnIndex]
      const currentPlayer = state.players.find((p) => p.id === currentPlayerId)

      const turnRecord: TurnRecord = {
        playerId: currentPlayerId ?? 'unknown',
        playerName: currentPlayer?.display_name ?? 'Unknown',
        rolls: state.currentTurnRolls,
        planeswalked: state.currentTurnRolls.some((r) => r.result === 'planeswalk'),
        chaosTriggered: state.currentTurnRolls.some((r) => r.result === 'chaos'),
        endedAt: Date.now(),
      }

      const nextTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length

      return {
        ...state,
        currentTurnIndex: nextTurnIndex,
        rollCountThisTurn: 0,
        lastDieResult: null,
        dieState: 'idle',
        currentTurnRolls: [],
        turnHistory: [...state.turnHistory, turnRecord],
      }
    }

    case 'RESET_TURN':
      return {
        ...state,
        rollCountThisTurn: 0,
        lastDieResult: null,
        dieState: 'idle',
      }

    case 'DRAW_SCHEME': {
      if (!state.archenemy) return state
      const { schemeDeck, currentSchemeIndex, activeSchemes, schemesPlayed } = state.archenemy
      if (schemeDeck.length === 0) return state

      const scheme = schemeDeck[currentSchemeIndex % schemeDeck.length]
      const nextActive = scheme.isOngoing
        ? [...activeSchemes, scheme]
        : activeSchemes

      return {
        ...state,
        archenemy: {
          ...state.archenemy,
          currentSchemeIndex: currentSchemeIndex + 1,
          activeSchemes: nextActive,
          schemesPlayed: schemesPlayed + 1,
        },
      }
    }

    case 'ABANDON_SCHEME': {
      if (!state.archenemy) return state
      return {
        ...state,
        archenemy: {
          ...state.archenemy,
          activeSchemes: state.archenemy.activeSchemes.filter(
            (s) => s.id !== action.schemeId
          ),
        },
      }
    }

    default:
      return state
  }
}
```

- [ ] **Step 2: Verify no TypeScript errors in engine**

Run: `cd planechaser && npx tsc --noEmit --strict planechaser/src/lib/game/engine.ts 2>&1 | head -20`
Expected: No errors (or only errors from other files referencing the new fields).

- [ ] **Step 3: Commit**

```bash
git add planechaser/src/lib/game/engine.ts
git commit -m "feat(engine): implement UNDO with 5-state circular buffer, DISMISS_CHAOS action"
```

---

### Task 3: Add Undo and Chaos Tests

**Files:**
- Modify: `planechaser/src/lib/game/engine.test.ts`

- [ ] **Step 1: Update makeState to include new fields**

Add `stateHistory: []` and `showChaosOverlay: false` to the `makeState` function's default return object:

```typescript
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    config: { playerCount: 4, deckSize: 10 },
    deck: Array.from({ length: 10 }, (_, i) => ({
      id: `plane-${i}`,
      name: `Plane ${i}`,
      type_line: 'Plane — Test',
      oracle_text: 'Test text',
      image_uris: { normal: `https://example.com/${i}.jpg`, large: `https://example.com/${i}.jpg`, art_crop: `https://example.com/${i}.jpg`, border_crop: `https://example.com/${i}.jpg`, small: `https://example.com/${i}.jpg`, png: `https://example.com/${i}.png` },
      set_name: 'Test Set',
      set: 'tst',
    })),
    currentPlaneIndex: 0,
    dieState: 'idle',
    lastDieResult: null,
    rollCountThisTurn: 0,
    dieRollHistory: [],
    planesVisited: 1,
    startedAt: Date.now(),
    players: [],
    turnOrder: [],
    currentTurnIndex: 0,
    currentTurnRolls: [],
    turnHistory: [],
    stateHistory: [],
    showChaosOverlay: false,
    ...overrides,
  }
}
```

- [ ] **Step 2: Add undo tests**

Add the following describe block after the existing `END_TURN` describe:

```typescript
describe('UNDO', () => {
  it('reverts to previous state', () => {
    const state = makeState({ rollCountThisTurn: 0 })
    const afterRoll = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    expect(afterRoll.rollCountThisTurn).toBe(1)
    expect(afterRoll.stateHistory).toHaveLength(1)

    const undone = gameReducer(afterRoll, { type: 'UNDO' })
    expect(undone.rollCountThisTurn).toBe(0)
    expect(undone.stateHistory).toHaveLength(0)
  })

  it('does nothing when history is empty', () => {
    const state = makeState({ stateHistory: [] })
    const result = gameReducer(state, { type: 'UNDO' })
    expect(result).toBe(state)
  })

  it('caps history at 5 entries', () => {
    let state = makeState()
    for (let i = 0; i < 7; i++) {
      state = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    }
    expect(state.stateHistory.length).toBeLessThanOrEqual(5)
  })

  it('preserves stateHistory reference across undo', () => {
    const state = makeState()
    const s1 = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    const s2 = gameReducer(s1, { type: 'ROLL_DIE', result: 'chaos' })
    const undone = gameReducer(s2, { type: 'UNDO' })
    expect(undone.rollCountThisTurn).toBe(1)
    expect(undone.stateHistory).toHaveLength(1)
  })
})

describe('DISMISS_CHAOS', () => {
  it('clears showChaosOverlay', () => {
    const state = makeState({ showChaosOverlay: true })
    const result = gameReducer(state, { type: 'DISMISS_CHAOS' })
    expect(result.showChaosOverlay).toBe(false)
  })

  it('does not push onto stateHistory', () => {
    const state = makeState({ showChaosOverlay: true, stateHistory: [] })
    const result = gameReducer(state, { type: 'DISMISS_CHAOS' })
    expect(result.stateHistory).toHaveLength(0)
  })
})

describe('ROLL_DIE chaos overlay', () => {
  it('sets showChaosOverlay when result is chaos', () => {
    const state = makeState()
    const result = gameReducer(state, { type: 'ROLL_DIE', result: 'chaos' })
    expect(result.showChaosOverlay).toBe(true)
  })

  it('does not set showChaosOverlay for blank', () => {
    const state = makeState()
    const result = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    expect(result.showChaosOverlay).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `cd planechaser && npx vitest run src/lib/game/engine.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add planechaser/src/lib/game/engine.test.ts
git commit -m "test(engine): add undo buffer, DISMISS_CHAOS, and chaos overlay tests"
```

---

### Task 4: Create Chaos Overlay Component

**Files:**
- Create: `planechaser/src/components/chaos-overlay.tsx`

- [ ] **Step 1: Create the chaos overlay component**

```typescript
'use client'

import { motion } from 'framer-motion'
import type { PlaneCard } from '@/lib/game/types'

interface ChaosOverlayProps {
  plane: PlaneCard
  onDismiss: () => void
}

function extractChaosText(oracleText: string): string {
  const chaosMarker = oracleText.indexOf('chaos ensues')
  if (chaosMarker !== -1) {
    const afterMarker = oracleText.slice(chaosMarker + 'chaos ensues'.length)
    const cleaned = afterMarker.replace(/^[\s—\-:]+/, '').trim()
    if (cleaned) return cleaned
  }
  const lines = oracleText.split('\n')
  const chaosLine = lines.find((l) => l.toLowerCase().includes('chaos'))
  if (chaosLine) {
    return chaosLine.replace(/.*chaos ensues[\s—\-:]*/i, '').trim() || chaosLine
  }
  return oracleText
}

export function ChaosOverlay({ plane, onDismiss }: ChaosOverlayProps) {
  const chaosText = extractChaosText(plane.oracle_text)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="relative z-10 max-w-[360px] mx-4 p-8 rounded-2xl border border-red-500/40 bg-red-950/80 backdrop-blur-md text-center space-y-4"
      >
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-[64px] block"
        >
          🌀
        </motion.span>
        <h2
          className="text-2xl font-bold text-red-400 tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          CHAOS!
        </h2>
        <p
          className="text-[15px] text-white/90 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {chaosText}
        </p>
        <p
          className="text-[11px] text-white/40 mt-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Tap anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/chaos-overlay.tsx
git commit -m "feat: add ChaosOverlay component with tap-to-dismiss and chaos text extraction"
```

---

### Task 5: Create Roll History Popover Component

**Files:**
- Create: `planechaser/src/components/roll-history-popover.tsx`

- [ ] **Step 1: Create the roll history popover**

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { DieRoll } from '@/lib/game/types'

interface RollHistoryPopoverProps {
  rolls: DieRoll[]
  open: boolean
  onClose: () => void
}

const RESULT_DISPLAY: Record<string, { symbol: string; color: string }> = {
  blank: { symbol: '·', color: '#64748b' },
  planeswalk: { symbol: '✦', color: '#c084fc' },
  chaos: { symbol: '🌀', color: '#ef4444' },
}

export function RollHistoryPopover({ rolls, open, onClose }: RollHistoryPopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-xl"
          >
            <p
              className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              This Turn&apos;s Rolls
            </p>
            {rolls.length === 0 ? (
              <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                No rolls yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rolls.map((roll, i) => {
                  const display = RESULT_DISPLAY[roll.result]
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span className="text-[16px]" style={{ color: display.color }}>
                        {display.symbol}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                        #{i + 1}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/roll-history-popover.tsx
git commit -m "feat: add RollHistoryPopover showing current turn rolls"
```

---

### Task 6: Update DieRoller with Tappable Cost

**Files:**
- Modify: `planechaser/src/components/die-roller.tsx`

- [ ] **Step 1: Add roll history popover to DieRoller**

Update the component to accept `currentTurnRolls` prop and make the cost text tappable:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DieResult, DieRoll } from '@/lib/game/types'
import { rollPlanarDie, chaosCost } from '@/lib/game/engine'
import { audioManager } from '@/lib/audio/audio-manager'
import { RollHistoryPopover } from './roll-history-popover'

const DIE_FACES: DieResult[] = ['blank', 'blank', 'blank', 'blank', 'planeswalk', 'chaos']

const FACE_DISPLAY: Record<DieResult, { symbol: string; label: string; color: string; glow: string }> = {
  blank: { symbol: '·', label: 'Blank', color: '#64748b', glow: 'none' },
  planeswalk: { symbol: '✦', label: 'Planeswalk!', color: '#c084fc', glow: '0 0 30px rgba(192, 132, 252, 0.6)' },
  chaos: { symbol: '🌀', label: 'CHAOS!', color: '#ef4444', glow: '0 0 30px rgba(239, 68, 68, 0.6)' },
}

interface DieRollerProps {
  rollCount: number
  currentTurnRolls: DieRoll[]
  onRoll: (result: DieResult) => void
  disabled?: boolean
}

export function DieRoller({ rollCount, currentTurnRolls, onRoll, disabled }: DieRollerProps) {
  const [rolling, setRolling] = useState(false)
  const [displayFace, setDisplayFace] = useState<DieResult | null>(null)
  const [settled, setSettled] = useState(false)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  const cost = chaosCost(rollCount)

  const handleRoll = useCallback(() => {
    if (rolling || disabled) return

    setRolling(true)
    setSettled(false)
    audioManager.playSFX('dieRoll', 1, 1500)

    const finalResult = rollPlanarDie()

    let tick = 0
    const totalTicks = 20
    const interval = setInterval(() => {
      tick++
      setDisplayFace(DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)])
      setRotateX(Math.random() * 360)
      setRotateY(Math.random() * 360)

      if (tick >= totalTicks) {
        clearInterval(interval)
        setDisplayFace(finalResult)
        setRotateX(0)
        setRotateY(0)
        setRolling(false)
        setSettled(true)

        if (finalResult === 'chaos') audioManager.playChaosLayered()
        else if (finalResult === 'planeswalk') audioManager.playSFX('planeswalk')
        else audioManager.playSFX('blank')

        setTimeout(() => {
          onRoll(finalResult)
          setSettled(false)
          setDisplayFace(null)
        }, 1600)
      }
    }, 75)
  }, [rolling, disabled, onRoll])

  const currentFace = displayFace ? FACE_DISPLAY[displayFace] : null

  return (
    <div className="relative flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        {currentFace && (
          <motion.div
            key={settled ? 'settled' : 'rolling'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: settled ? [1, 1.2, 1] : 1,
              opacity: 1,
            }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: settled ? 0.5 : 0.08 }}
            className="flex flex-col items-center"
          >
            <span
              className="text-[56px] md:text-[72px] leading-none drop-shadow-lg"
              style={{ color: currentFace.color, textShadow: currentFace.glow }}
            >
              {currentFace.symbol}
            </span>
            {settled && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[16px] md:text-[20px] font-bold mt-2 tracking-wider"
                style={{ color: currentFace.color, fontFamily: 'var(--font-heading)', textShadow: currentFace.glow }}
              >
                {currentFace.label}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="die-container">
        <motion.button
          onClick={handleRoll}
          disabled={rolling || disabled}
          animate={{
            rotateX: rolling ? rotateX : 0,
            rotateY: rolling ? rotateY : 0,
          }}
          transition={{ duration: 0.07 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] transition-all disabled:opacity-40"
          style={{
            boxShadow: rolling
              ? '0 0 30px var(--color-glow-purple), inset 0 0 15px rgba(168, 85, 247, 0.1)'
              : '0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(168, 85, 247, 0.15)',
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        </motion.button>
      </div>

      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {cost === 0 ? 'Free roll' : `Cost: ${cost} mana`}
      </button>

      <RollHistoryPopover
        rolls={currentTurnRolls}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/die-roller.tsx
git commit -m "feat(die-roller): make cost tappable to show roll history popover"
```

---

### Task 7: Update Game Page — Integrate Undo, Chaos Overlay, New DieRoller Props

**Files:**
- Modify: `planechaser/src/app/game/page.tsx`

- [ ] **Step 1: Add imports and update chaos/undo integration**

Changes needed:
1. Import `ChaosOverlay` component.
2. Remove the `showChaos` local state and the `setTimeout` auto-dismiss.
3. Use `state.showChaosOverlay` from game state instead.
4. Add `handleDismissChaos` that dispatches `DISMISS_CHAOS`.
5. Add `handleUndo` that dispatches `UNDO`.
6. Pass `currentTurnRolls` to `DieRoller`.
7. Add an Undo button next to End Turn.
8. Add `stateHistory: []` and `showChaosOverlay: false` to any inline GameState creation (the setup page handles this, but the game page loads from sessionStorage).

Key changes to make in `game/page.tsx`:

**Add import (at top with other component imports):**
```typescript
import { ChaosOverlay } from '@/components/chaos-overlay'
```

**Remove these lines:**
```typescript
const [showChaos, setShowChaos] = useState(false)
```

**In `handleRoll` callback, remove the chaos setTimeout block:**
```typescript
    // REMOVE this:
    if (result === 'chaos') {
      setShowChaos(true)
      setTimeout(() => setShowChaos(false), 2000)
    }
```

**Add new handlers after `handleEndTurn`:**
```typescript
  const handleDismissChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'DISMISS_CHAOS' })
    })
  }, [])

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'UNDO' })
    })
  }, [])
```

**Replace the chaos flash overlay section with:**
```typescript
      {/* Chaos overlay - tap to dismiss */}
      <AnimatePresence>
        {state.showChaosOverlay && currentPlane && (
          <ChaosOverlay plane={currentPlane} onDismiss={handleDismissChaos} />
        )}
      </AnimatePresence>
```

**Update DieRoller to pass currentTurnRolls:**
```typescript
          <DieRoller
            rollCount={state.rollCountThisTurn}
            currentTurnRolls={state.currentTurnRolls}
            onRoll={handleRoll}
            disabled={state.lastDieResult === 'planeswalk' || state.showChaosOverlay}
          />
```

**Add Undo button in the controls section (before End Turn):**
```typescript
        <div className="flex gap-3 w-full max-w-[440px] pb-4">
          <Button
            onClick={handleUndo}
            variant="outline"
            disabled={state.stateHistory.length === 0}
            className="h-12 px-4 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 disabled:opacity-30"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            Undo
          </Button>
          <Button
            onClick={handleEndTurn}
            variant="outline"
            className="flex-1 h-12 border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Turn
          </Button>
          <Button
            onClick={() => setShowEndGame(true)}
            variant="outline"
            className="h-12 px-5 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            End Game
          </Button>
        </div>
```

- [ ] **Step 2: Run type check**

Run: `cd planechaser && npx tsc --noEmit 2>&1 | head -30`
Expected: Pass (or only unrelated warnings).

- [ ] **Step 3: Commit**

```bash
git add planechaser/src/app/game/page.tsx
git commit -m "feat(game): integrate undo button, chaos tap-to-dismiss overlay, tappable roll cost"
```

---

### Task 8: Update Setup Page — Add New State Fields

**Files:**
- Modify: `planechaser/src/app/setup/page.tsx`

- [ ] **Step 1: Add stateHistory and showChaosOverlay to GameState initialization**

In the `startGame` function, after the `turnHistory: [],` line in the state object literal, add:

```typescript
      stateHistory: [],
      showChaosOverlay: false,
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/app/setup/page.tsx
git commit -m "fix(setup): include stateHistory and showChaosOverlay in initial game state"
```

---

### Task 9: Fix Lobby→Game Transition

**Files:**
- Modify: `planechaser/src/app/lobby/page.tsx`
- Modify: `planechaser/src/hooks/useGameSession.ts`

This is the critical multiplayer bug. Currently the lobby's "Start Game" sets turn order then redirects to `/setup?fromLobby=true`, but setup doesn't auto-start. The fix: lobby should build the GameState directly (using the default deck config) and navigate to `/game`.

- [ ] **Step 1: Update the lobby page to start game directly**

Replace the `handleStartGame` function and add necessary imports:

Add imports at top:
```typescript
import { usePlaneCorpus } from '@/hooks/usePlaneCorpus'
import { useStartSession } from '@/hooks/useGameSession'
import { shuffleDeck } from '@/lib/game/shuffle'
import { saveGameState } from '@/lib/game/session-storage'
import type { GameState, PlaneCard } from '@/lib/game/types'
```

Add hooks inside the component (after existing hooks):
```typescript
  const { data: corpus } = usePlaneCorpus()
  const startSessionMutation = useStartSession()
```

Replace `handleStartGame`:
```typescript
  const handleStartGame = () => {
    if (!players || players.length === 0 || !corpus || corpus.length === 0) return

    const turnOrder = players.map((p) => p.user_id)

    // Build game state directly from lobby
    const deck = shuffleDeck(corpus) as PlaneCard[]
    const playerList = players.map((p) => ({
      id: p.user_id,
      display_name: p.profile?.display_name ?? 'Player',
    }))

    const state: GameState = {
      id: crypto.randomUUID(),
      config: { playerCount: players.length, deckSize: deck.length },
      deck,
      currentPlaneIndex: 0,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: 1,
      startedAt: Date.now(),
      players: playerList,
      turnOrder,
      currentTurnIndex: 0,
      currentTurnRolls: [],
      turnHistory: [],
      stateHistory: [],
      showChaosOverlay: false,
    }

    saveGameState(state)

    if (activeSessionId) {
      updateTurnOrder.mutate(
        { sessionId: activeSessionId, turnOrder },
        {
          onSuccess: () => {
            startSessionMutation.mutate({
              sessionId: activeSessionId,
              initialState: state,
              firstPlayerId: turnOrder[0],
            })
            router.push('/game')
          },
        }
      )
    } else {
      router.push('/game')
    }
  }
```

Update the Start Game button to also disable when corpus isn't loaded:
```typescript
        <Button
          onClick={handleStartGame}
          disabled={!players || players.length < 2 || !corpus || corpus.length === 0}
          className="w-full py-4 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Game ({players?.length ?? 0} players)
        </Button>
```

- [ ] **Step 2: Verify type check**

Run: `cd planechaser && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add planechaser/src/app/lobby/page.tsx
git commit -m "fix(lobby): start game directly instead of redirecting to setup"
```

---

### Task 10: Update Session Storage for New Fields

**Files:**
- Modify: `planechaser/src/lib/game/session-storage.ts` (if it exists) or the session storage module

- [ ] **Step 1: Ensure loadGameState handles missing new fields gracefully**

When loading state from sessionStorage, older saved states won't have `stateHistory` or `showChaosOverlay`. Add defaults when loading:

In the `loadGameState` function, after parsing the JSON, add field defaults:

```typescript
// After parsing saved state, ensure new fields exist
if (!saved.stateHistory) saved.stateHistory = []
if (saved.showChaosOverlay === undefined) saved.showChaosOverlay = false
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/lib/game/session-storage.ts
git commit -m "fix(session-storage): default stateHistory and showChaosOverlay for older saves"
```

---

### Task 11: Run Full Test Suite and Fix Issues

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `cd planechaser && npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript check**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Fix any issues found**

If tests fail or type errors appear, fix them. Common issues:
- Test fixtures missing `stateHistory: []` and `showChaosOverlay: false`
- Components not passing the new `currentTurnRolls` prop to `DieRoller`

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test and type errors from Phase 3 integration"
```

---

## Summary of Changes

| Requirement | Implementation |
|-------------|---------------|
| GM-01: Undo (5-state buffer) | `stateHistory` in GameState, `UNDO` action in reducer, Undo button on game page |
| GM-02: Chaos overlay tap-to-dismiss | `ChaosOverlay` component, `DISMISS_CHAOS` action, `showChaosOverlay` state field |
| GM-03: Tappable cost → roll history | Cost text is a button, opens `RollHistoryPopover` showing current turn rolls |
| Lobby→game fix | Lobby builds GameState directly from session players + corpus, navigates to `/game` |
