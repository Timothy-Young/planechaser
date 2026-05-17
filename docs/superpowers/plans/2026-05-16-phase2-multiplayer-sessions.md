# Phase 2: Multiplayer Session & Turns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multiplayer game sessions where a host creates a game, players join via code, turn order is tracked, and spectators observe in real-time via Supabase Realtime.

**Architecture:** Host device writes game state to a Supabase `active_game_sessions` table on every action. Spectator devices subscribe to row-level changes via Supabase Realtime. The existing game reducer is extended with turn tracking (`END_TURN` action, `currentTurnIndex`, `turnOrder`). A lobby page handles session creation and player join flow before the game starts.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Realtime), React 19, TypeScript, TanStack Query v5, Zustand, Framer Motion, Tailwind v4

---

## File Structure

### New Files
| Path | Responsibility |
|------|---------------|
| `planechaser/supabase/migrations/004_game_sessions_multiplayer.sql` | DB migration: `active_game_sessions`, `game_session_players` tables + RLS |
| `planechaser/src/lib/game/session-types.ts` | TypeScript types for multiplayer session (distinct from game state types) |
| `planechaser/src/lib/game/session-queries.ts` | Supabase CRUD for game sessions (create, join, update state, end) |
| `planechaser/src/lib/game/session-code.ts` | Generate and validate 6-char session codes |
| `planechaser/src/hooks/useGameSession.ts` | TanStack Query hooks + Realtime subscription for game sessions |
| `planechaser/src/app/lobby/page.tsx` | Host lobby: shows session code, joined players, start button |
| `planechaser/src/app/join/page.tsx` | Player join page: enter session code, see confirmation |
| `planechaser/src/app/spectate/page.tsx` | Spectator view: read-only game state display |
| `planechaser/src/components/player-list.tsx` | Reusable player list with turn indicator |
| `planechaser/src/components/turn-indicator.tsx` | "Player X's Turn" banner component |
| `planechaser/src/lib/game/session-sync.ts` | Supabase Realtime subscription manager for game state |

### Modified Files
| Path | Changes |
|------|---------|
| `planechaser/src/lib/game/types.ts` | Add `players`, `turnOrder`, `currentTurnIndex`, `currentTurnRolls`, `turnHistory` to `GameState`; add `END_TURN` action; add `TurnRecord` type |
| `planechaser/src/lib/game/engine.ts` | Implement `END_TURN` action in reducer |
| `planechaser/src/app/setup/page.tsx` | Add "Create Multiplayer Game" flow that redirects to lobby |
| `planechaser/src/app/game/page.tsx` | Sync state to Supabase on change; show turn indicator; use `END_TURN` instead of `RESET_TURN` |
| `planechaser/src/store/app-store.ts` | Add `activeSessionId` and `isHost` to store |
| `planechaser/src/lib/game/session-storage.ts` | Also persist `activeSessionId` for reconnect |

---

## Task 1: Database Migration

**Files:**
- Create: `planechaser/supabase/migrations/004_game_sessions_multiplayer.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Active multiplayer game sessions
CREATE TABLE IF NOT EXISTS active_game_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id               UUID REFERENCES pods,
  host_user_id         UUID NOT NULL REFERENCES auth.users,
  session_code         TEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'lobby'
                       CHECK (status IN ('lobby', 'active', 'ended')),
  game_type            TEXT NOT NULL DEFAULT 'planechase'
                       CHECK (game_type IN ('planechase', 'archenemy')),
  game_state           JSONB,
  turn_order           UUID[] NOT NULL DEFAULT '{}',
  current_turn_user_id UUID REFERENCES auth.users,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players joined to a session
CREATE TABLE IF NOT EXISTS game_session_players (
  session_id  UUID NOT NULL REFERENCES active_game_sessions ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deck_id     UUID,  -- for future Phase 7 (Archenemy per-player decks)
  PRIMARY KEY (session_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_code ON active_game_sessions (session_code);
CREATE INDEX IF NOT EXISTS idx_active_sessions_host ON active_game_sessions (host_user_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user ON game_session_players (user_id);

-- RLS: active_game_sessions
ALTER TABLE active_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions viewable by participants"
  ON active_game_sessions FOR SELECT TO authenticated
  USING (
    host_user_id = auth.uid()
    OR id IN (SELECT session_id FROM game_session_players WHERE user_id = auth.uid())
  );

CREATE POLICY "Host can create sessions"
  ON active_game_sessions FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can update own sessions"
  ON active_game_sessions FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid());

CREATE POLICY "Host can delete own sessions"
  ON active_game_sessions FOR DELETE TO authenticated
  USING (host_user_id = auth.uid());

-- RLS: game_session_players
ALTER TABLE game_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session players viewable by session participants"
  ON game_session_players FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM active_game_sessions
      WHERE host_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join sessions"
  ON game_session_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave sessions"
  ON game_session_players FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable Realtime on active_game_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE active_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_session_players;
```

- [ ] **Step 2: Apply migration to Supabase**

Run the SQL in Supabase Dashboard → SQL Editor, or via CLI:
```bash
cd planechaser
npx supabase db push
```

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm `active_game_sessions` and `game_session_players` appear with correct columns.

- [ ] **Step 4: Commit**

```bash
git add planechaser/supabase/migrations/004_game_sessions_multiplayer.sql
git commit -m "feat(db): add active_game_sessions and game_session_players tables"
```

---

## Task 2: Session Code Generator

**Files:**
- Create: `planechaser/src/lib/game/session-code.ts`
- Test: `planechaser/src/lib/game/session-code.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// planechaser/src/lib/game/session-code.test.ts
import { describe, it, expect } from 'vitest'
import { generateSessionCode, isValidSessionCode } from './session-code'

describe('generateSessionCode', () => {
  it('produces a 6-character alphanumeric string', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('produces unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSessionCode()))
    expect(codes.size).toBe(100)
  })
})

describe('isValidSessionCode', () => {
  it('accepts valid 6-char uppercase alphanumeric', () => {
    expect(isValidSessionCode('ABC123')).toBe(true)
    expect(isValidSessionCode('Z9X8Y7')).toBe(true)
  })

  it('rejects invalid codes', () => {
    expect(isValidSessionCode('')).toBe(false)
    expect(isValidSessionCode('abc123')).toBe(false)
    expect(isValidSessionCode('AB12')).toBe(false)
    expect(isValidSessionCode('ABC-123')).toBe(false)
    expect(isValidSessionCode('ABCDEFG')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd planechaser && npx vitest run src/lib/game/session-code.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// planechaser/src/lib/game/session-code.ts
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion

export function generateSessionCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join('')
}

export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd planechaser && npx vitest run src/lib/game/session-code.test.ts
```
Expected: PASS (2 suites, all green)

- [ ] **Step 5: Commit**

```bash
git add planechaser/src/lib/game/session-code.ts planechaser/src/lib/game/session-code.test.ts
git commit -m "feat: add session code generator with validation"
```

---

## Task 3: Extend Game Types for Turn Tracking

**Files:**
- Modify: `planechaser/src/lib/game/types.ts`

- [ ] **Step 1: Add TurnRecord and updated types**

Add to the end of `planechaser/src/lib/game/types.ts`:

```typescript
export interface TurnRecord {
  playerId: string
  playerName: string
  rolls: DieRoll[]
  planeswalked: boolean
  chaosTriggered: boolean
  endedAt: number
}
```

- [ ] **Step 2: Update GameState interface**

Replace the existing `GameState` interface with:

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
}
```

- [ ] **Step 3: Update GameAction union**

Replace the existing `GameAction` type with:

```typescript
export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'RESET_TURN' }  // keep for backward compat during transition
  | { type: 'DRAW_SCHEME' }
  | { type: 'ABANDON_SCHEME'; schemeId: string }
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd planechaser && npx vitest run src/lib/game/engine.test.ts
```
Expected: PASS (existing tests use RESET_TURN which is still present)

- [ ] **Step 5: Commit**

```bash
git add planechaser/src/lib/game/types.ts
git commit -m "feat(types): add turn tracking fields to GameState"
```

---

## Task 4: Implement END_TURN in Game Engine

**Files:**
- Modify: `planechaser/src/lib/game/engine.ts`
- Modify: `planechaser/src/lib/game/engine.test.ts`

- [ ] **Step 1: Write failing test for END_TURN**

Add to `planechaser/src/lib/game/engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { gameReducer, rollPlanarDie, chaosCost } from './engine'
import type { GameState } from './types'

function makeTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    config: { playerCount: 3, deckSize: 10 },
    deck: [],
    currentPlaneIndex: 0,
    dieState: 'idle',
    lastDieResult: null,
    rollCountThisTurn: 2,
    dieRollHistory: [],
    planesVisited: 1,
    startedAt: Date.now(),
    players: [
      { id: 'p1', display_name: 'Alice' },
      { id: 'p2', display_name: 'Bob' },
      { id: 'p3', display_name: 'Charlie' },
    ],
    turnOrder: ['p1', 'p2', 'p3'],
    currentTurnIndex: 0,
    currentTurnRolls: [
      { result: 'blank', timestamp: 1000 },
      { result: 'chaos', timestamp: 2000 },
    ],
    turnHistory: [],
    ...overrides,
  }
}

describe('END_TURN', () => {
  it('advances currentTurnIndex to next player', () => {
    const state = makeTestState({ currentTurnIndex: 0 })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.currentTurnIndex).toBe(1)
  })

  it('wraps around to first player after last', () => {
    const state = makeTestState({ currentTurnIndex: 2 })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.currentTurnIndex).toBe(0)
  })

  it('resets rollCountThisTurn to 0', () => {
    const state = makeTestState({ rollCountThisTurn: 3 })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.rollCountThisTurn).toBe(0)
  })

  it('clears lastDieResult and resets dieState', () => {
    const state = makeTestState({ lastDieResult: 'chaos', dieState: 'settled' })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.lastDieResult).toBeNull()
    expect(next.dieState).toBe('idle')
  })

  it('saves completed turn to turnHistory', () => {
    const state = makeTestState({
      currentTurnRolls: [
        { result: 'blank', timestamp: 1000 },
        { result: 'chaos', timestamp: 2000 },
      ],
    })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.turnHistory).toHaveLength(1)
    expect(next.turnHistory[0].playerId).toBe('p1')
    expect(next.turnHistory[0].playerName).toBe('Alice')
    expect(next.turnHistory[0].rolls).toHaveLength(2)
    expect(next.turnHistory[0].chaosTriggered).toBe(true)
    expect(next.turnHistory[0].planeswalked).toBe(false)
  })

  it('clears currentTurnRolls for next player', () => {
    const state = makeTestState({
      currentTurnRolls: [{ result: 'blank', timestamp: 1000 }],
    })
    const next = gameReducer(state, { type: 'END_TURN' })
    expect(next.currentTurnRolls).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd planechaser && npx vitest run src/lib/game/engine.test.ts
```
Expected: FAIL — `END_TURN` case not handled, or test state shape mismatch

- [ ] **Step 3: Implement END_TURN in reducer**

Add to the `switch` block in `gameReducer` in `planechaser/src/lib/game/engine.ts`:

```typescript
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
```

Also add the import at the top of engine.ts:
```typescript
import type { GameState, GameAction, DieResult, TurnRecord } from './types'
```

- [ ] **Step 4: Update ROLL_DIE to also push to currentTurnRolls**

Modify the `ROLL_DIE` case to also track per-turn rolls:

```typescript
    case 'ROLL_DIE': {
      const roll = { result: action.result, timestamp: Date.now() }
      return {
        ...state,
        dieState: 'settled',
        lastDieResult: action.result,
        rollCountThisTurn: state.rollCountThisTurn + 1,
        dieRollHistory: [...state.dieRollHistory, roll],
        currentTurnRolls: [...(state.currentTurnRolls ?? []), roll],
      }
    }
```

- [ ] **Step 5: Run tests to verify all pass**

```bash
cd planechaser && npx vitest run src/lib/game/engine.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add planechaser/src/lib/game/engine.ts planechaser/src/lib/game/engine.test.ts
git commit -m "feat(engine): implement END_TURN action with turn history tracking"
```

---

## Task 5: Session Types

**Files:**
- Create: `planechaser/src/lib/game/session-types.ts`

- [ ] **Step 1: Write session types**

```typescript
// planechaser/src/lib/game/session-types.ts
import type { GameState } from './types'

export type SessionStatus = 'lobby' | 'active' | 'ended'
export type GameType = 'planechase' | 'archenemy'

export interface GameSession {
  id: string
  pod_id: string | null
  host_user_id: string
  session_code: string
  status: SessionStatus
  game_type: GameType
  game_state: GameState | null
  turn_order: string[]
  current_turn_user_id: string | null
  created_at: string
  updated_at: string
}

export interface SessionPlayer {
  session_id: string
  user_id: string
  joined_at: string
  deck_id: string | null
  profile?: {
    display_name: string
  }
}

export interface CreateSessionParams {
  hostUserId: string
  podId?: string
  gameType?: GameType
}

export interface JoinSessionParams {
  sessionCode: string
  userId: string
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/lib/game/session-types.ts
git commit -m "feat(types): add multiplayer session types"
```

---

## Task 6: Session Queries (Supabase CRUD)

**Files:**
- Create: `planechaser/src/lib/game/session-queries.ts`

- [ ] **Step 1: Write session query functions**

```typescript
// planechaser/src/lib/game/session-queries.ts
import { createClient } from '@/lib/supabase/client'
import { generateSessionCode } from './session-code'
import type { GameState } from './types'
import type {
  GameSession,
  SessionPlayer,
  CreateSessionParams,
  JoinSessionParams,
  GameType,
} from './session-types'

function supabase() {
  return createClient()
}

export async function createGameSession(params: CreateSessionParams): Promise<GameSession> {
  const sessionCode = generateSessionCode()

  const { data, error } = await supabase()
    .from('active_game_sessions')
    .insert({
      host_user_id: params.hostUserId,
      pod_id: params.podId ?? null,
      session_code: sessionCode,
      game_type: params.gameType ?? 'planechase',
      status: 'lobby',
    })
    .select()
    .single()

  if (error) throw error

  // Host auto-joins as a player
  await supabase()
    .from('game_session_players')
    .insert({ session_id: data.id, user_id: params.hostUserId })

  return data as GameSession
}

export async function joinGameSession(params: JoinSessionParams): Promise<GameSession> {
  const { data: session, error: findError } = await supabase()
    .from('active_game_sessions')
    .select()
    .eq('session_code', params.sessionCode.toUpperCase())
    .eq('status', 'lobby')
    .single()

  if (findError || !session) throw new Error('Session not found or already started')

  const { error: joinError } = await supabase()
    .from('game_session_players')
    .insert({ session_id: session.id, user_id: params.userId })

  if (joinError) {
    if (joinError.code === '23505') throw new Error('Already joined')
    throw joinError
  }

  return session as GameSession
}

export async function getSessionPlayers(sessionId: string): Promise<SessionPlayer[]> {
  const { data, error } = await supabase()
    .from('game_session_players')
    .select('*, profiles(display_name)')
    .eq('session_id', sessionId)
    .order('joined_at')

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: row.profiles as { display_name: string } | undefined,
  })) as SessionPlayer[]
}

export async function updateSessionTurnOrder(
  sessionId: string,
  turnOrder: string[]
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({ turn_order: turnOrder })
    .eq('id', sessionId)

  if (error) throw error
}

export async function startSession(
  sessionId: string,
  initialState: GameState,
  firstPlayerId: string
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({
      status: 'active',
      game_state: initialState as unknown as Record<string, unknown>,
      current_turn_user_id: firstPlayerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function syncGameState(
  sessionId: string,
  state: GameState,
  currentTurnUserId: string
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({
      game_state: state as unknown as Record<string, unknown>,
      current_turn_user_id: currentTurnUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({ status: 'ended', updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw error
}

export async function getSessionByCode(code: string): Promise<GameSession | null> {
  const { data, error } = await supabase()
    .from('active_game_sessions')
    .select()
    .eq('session_code', code.toUpperCase())
    .single()

  if (error) return null
  return data as GameSession
}

export async function getActiveSessionForUser(userId: string): Promise<GameSession | null> {
  const { data, error } = await supabase()
    .from('game_session_players')
    .select('session_id, active_game_sessions(*)')
    .eq('user_id', userId)
    .not('active_game_sessions.status', 'eq', 'ended')
    .limit(1)
    .single()

  if (error || !data) return null
  return (data as Record<string, unknown>).active_game_sessions as GameSession
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/lib/game/session-queries.ts
git commit -m "feat: add Supabase CRUD queries for multiplayer game sessions"
```

---

## Task 7: Realtime Session Sync

**Files:**
- Create: `planechaser/src/lib/game/session-sync.ts`

- [ ] **Step 1: Write the Realtime subscription manager**

```typescript
// planechaser/src/lib/game/session-sync.ts
import { createClient } from '@/lib/supabase/client'
import type { GameSession } from './session-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type SessionChangeHandler = (session: GameSession) => void
type PlayersChangeHandler = () => void

let sessionChannel: RealtimeChannel | null = null
let playersChannel: RealtimeChannel | null = null

export function subscribeToSession(
  sessionId: string,
  onSessionChange: SessionChangeHandler
): () => void {
  const client = createClient()

  sessionChannel = client
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'active_game_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onSessionChange(payload.new as GameSession)
      }
    )
    .subscribe()

  return () => {
    sessionChannel?.unsubscribe()
    sessionChannel = null
  }
}

export function subscribeToSessionPlayers(
  sessionId: string,
  onPlayersChange: PlayersChangeHandler
): () => void {
  const client = createClient()

  playersChannel = client
    .channel(`session-players-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_session_players',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onPlayersChange()
      }
    )
    .subscribe()

  return () => {
    playersChannel?.unsubscribe()
    playersChannel = null
  }
}

export function unsubscribeAll(): void {
  sessionChannel?.unsubscribe()
  playersChannel?.unsubscribe()
  sessionChannel = null
  playersChannel = null
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/lib/game/session-sync.ts
git commit -m "feat: add Supabase Realtime subscription manager for game sessions"
```

---

## Task 8: useGameSession Hook

**Files:**
- Create: `planechaser/src/hooks/useGameSession.ts`

- [ ] **Step 1: Write the hook**

```typescript
// planechaser/src/hooks/useGameSession.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  createGameSession,
  joinGameSession,
  getSessionPlayers,
  updateSessionTurnOrder,
  startSession,
  syncGameState,
  endSession,
  getActiveSessionForUser,
} from '@/lib/game/session-queries'
import { subscribeToSession, subscribeToSessionPlayers } from '@/lib/game/session-sync'
import { useAppStore } from '@/store/app-store'
import type { GameState } from '@/lib/game/types'
import type { GameSession, GameType } from '@/lib/game/session-types'

export function useSessionPlayers(sessionId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['session-players', sessionId],
    queryFn: () => getSessionPlayers(sessionId!),
    enabled: !!sessionId,
    refetchInterval: false,
  })

  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSessionPlayers(sessionId, () => {
      queryClient.invalidateQueries({ queryKey: ['session-players', sessionId] })
    })
    return unsub
  }, [sessionId, queryClient])

  return query
}

export function useCreateSession() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (params: { podId?: string; gameType?: GameType }) =>
      createGameSession({
        hostUserId: user!.id,
        podId: params.podId,
        gameType: params.gameType,
      }),
  })
}

export function useJoinSession() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (sessionCode: string) =>
      joinGameSession({ sessionCode, userId: user!.id }),
  })
}

export function useStartSession() {
  return useMutation({
    mutationFn: (params: { sessionId: string; initialState: GameState; firstPlayerId: string }) =>
      startSession(params.sessionId, params.initialState, params.firstPlayerId),
  })
}

export function useSyncGameState() {
  return useMutation({
    mutationFn: (params: { sessionId: string; state: GameState; currentTurnUserId: string }) =>
      syncGameState(params.sessionId, params.state, params.currentTurnUserId),
  })
}

export function useEndSession() {
  return useMutation({
    mutationFn: (sessionId: string) => endSession(sessionId),
  })
}

export function useUpdateTurnOrder() {
  return useMutation({
    mutationFn: (params: { sessionId: string; turnOrder: string[] }) =>
      updateSessionTurnOrder(params.sessionId, params.turnOrder),
  })
}

export function useActiveSession() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['active-session', user?.id],
    queryFn: () => getActiveSessionForUser(user!.id),
    enabled: !!user,
  })
}

export function useSessionSubscription(
  sessionId: string | undefined,
  onUpdate: (session: GameSession) => void
) {
  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSession(sessionId, onUpdate)
    return unsub
  }, [sessionId, onUpdate])
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/hooks/useGameSession.ts
git commit -m "feat: add useGameSession hooks for multiplayer session management"
```

---

## Task 9: Update App Store

**Files:**
- Modify: `planechaser/src/store/app-store.ts`

- [ ] **Step 1: Add session tracking to store**

Replace the contents of `planechaser/src/store/app-store.ts` with:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void
  activePodId: string | null
  setActivePodId: (podId: string | null) => void
  activeSessionId: string | null
  setActiveSessionId: (sessionId: string | null) => void
  isHost: boolean
  setIsHost: (isHost: boolean) => void
  theme: Theme
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      activePodId: null,
      setActivePodId: (activePodId) => set({ activePodId }),
      activeSessionId: null,
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
      isHost: false,
      setIsHost: (isHost) => set({ isHost }),
      theme: 'dark' as Theme,
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'planechaser-app' }
  )
)

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/store/app-store.ts
git commit -m "feat(store): add activeSessionId and isHost to app store"
```

---

## Task 10: Player List Component

**Files:**
- Create: `planechaser/src/components/player-list.tsx`

- [ ] **Step 1: Write the component**

```typescript
// planechaser/src/components/player-list.tsx
'use client'

import { motion } from 'framer-motion'
import type { SessionPlayer } from '@/lib/game/session-types'

interface PlayerListProps {
  players: SessionPlayer[]
  currentTurnUserId?: string | null
  hostUserId?: string
  showTurnIndicator?: boolean
}

export function PlayerList({
  players,
  currentTurnUserId,
  hostUserId,
  showTurnIndicator = false,
}: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((player) => {
        const isCurrentTurn = showTurnIndicator && player.user_id === currentTurnUserId
        const isHost = player.user_id === hostUserId
        const name = player.profile?.display_name ?? 'Player'

        return (
          <motion.div
            key={player.user_id}
            layout
            className={`
              flex items-center gap-3 rounded-xl px-4 py-3
              ${isCurrentTurn
                ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40'
                : 'bg-white/5 border border-white/10'}
            `}
          >
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isCurrentTurn ? 'bg-[var(--color-accent)] text-white' : 'bg-white/10 text-white/60'}
              `}
            >
              {name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium text-white truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {name}
                {isHost && (
                  <span className="ml-2 text-xs text-[var(--color-accent)]">Host</span>
                )}
              </p>
            </div>
            {isCurrentTurn && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/player-list.tsx
git commit -m "feat: add PlayerList component with turn indicator"
```

---

## Task 11: Turn Indicator Component

**Files:**
- Create: `planechaser/src/components/turn-indicator.tsx`

- [ ] **Step 1: Write the component**

```typescript
// planechaser/src/components/turn-indicator.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TurnIndicatorProps {
  playerName: string
  rollCost: number
}

export function TurnIndicator({ playerName, rollCost }: TurnIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 border border-white/10"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
        <p
          className="text-sm font-medium text-white"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {playerName}&apos;s Turn
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={rollCost}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="text-xs text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Cost: {rollCost} mana
        </motion.p>
      </AnimatePresence>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/turn-indicator.tsx
git commit -m "feat: add TurnIndicator component showing current player and roll cost"
```

---

## Task 12: Lobby Page (Host View)

**Files:**
- Create: `planechaser/src/app/lobby/page.tsx`

- [ ] **Step 1: Write the lobby page**

```typescript
// planechaser/src/app/lobby/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerList } from '@/components/player-list'
import { useSessionPlayers, useUpdateTurnOrder } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'

export default function LobbyPage() {
  const router = useRouter()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const user = useAppStore((s) => s.user)
  const isHost = useAppStore((s) => s.isHost)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: players } = useSessionPlayers(activeSessionId ?? undefined)
  const updateTurnOrder = useUpdateTurnOrder()

  useEffect(() => {
    if (!activeSessionId) {
      router.replace('/setup')
      return
    }
    // Load session code from URL params or store
    const params = new URLSearchParams(window.location.search)
    setSessionCode(params.get('code'))
  }, [activeSessionId, router])

  const handleCopyCode = async () => {
    if (!sessionCode) return
    await navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    if (!players || players.length === 0) return
    const turnOrder = players.map((p) => p.user_id)
    if (activeSessionId) {
      updateTurnOrder.mutate(
        { sessionId: activeSessionId, turnOrder },
        { onSuccess: () => router.push('/setup?fromLobby=true') }
      )
    }
  }

  if (!activeSessionId || !isHost) {
    return null
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] p-6">
      <div className="max-w-md mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Game Lobby
          </h1>
          <p
            className="text-sm text-[var(--color-text-muted)] mt-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Share the code with your pod
          </p>
        </div>

        {/* Session Code */}
        {sessionCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
          >
            <p
              className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Session Code
            </p>
            <p
              className="text-4xl font-bold text-[var(--color-accent)] tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {sessionCode}
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-3 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </motion.div>
        )}

        {/* Players */}
        <div>
          <p
            className="text-sm text-[var(--color-text-muted)] mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Players ({players?.length ?? 0})
          </p>
          {players && players.length > 0 ? (
            <PlayerList
              players={players}
              hostUserId={user?.id}
            />
          ) : (
            <p className="text-sm text-white/40 text-center py-8">
              Waiting for players to join...
            </p>
          )}
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStartGame}
          disabled={!players || players.length < 2}
          className="w-full py-4 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Game ({players?.length ?? 0} players)
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/app/lobby/page.tsx
git commit -m "feat: add lobby page with session code display and player list"
```

---

## Task 13: Join Page (Player View)

**Files:**
- Create: `planechaser/src/app/join/page.tsx`

- [ ] **Step 1: Write the join page**

```typescript
// planechaser/src/app/join/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useJoinSession } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'
import { isValidSessionCode } from '@/lib/game/session-code'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const joinSession = useJoinSession()
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
  const setIsHost = useAppStore((s) => s.setIsHost)

  const handleJoin = () => {
    setError(null)
    const normalized = code.toUpperCase().trim()

    if (!isValidSessionCode(normalized)) {
      setError('Code must be 6 characters (letters and numbers)')
      return
    }

    joinSession.mutate(normalized, {
      onSuccess: (session) => {
        setActiveSessionId(session.id)
        setIsHost(false)
        router.push('/spectate')
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to join')
      },
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full flex flex-col gap-6"
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Join Game
          </h1>
          <p
            className="text-sm text-[var(--color-text-muted)] mt-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Enter the session code from your host
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            className="
              w-full text-center text-3xl font-bold tracking-[0.3em]
              bg-white/5 border border-white/20 rounded-xl
              px-4 py-4 text-white placeholder:text-white/20
              focus:outline-none focus:border-[var(--color-accent)]/60
            "
            style={{ fontFamily: 'var(--font-heading)' }}
            autoFocus
          />

          {error && (
            <p className="text-sm text-[var(--color-destructive)] text-center">
              {error}
            </p>
          )}

          <Button
            onClick={handleJoin}
            disabled={code.length !== 6 || joinSession.isPending}
            className="w-full py-4 text-lg"
          >
            {joinSession.isPending ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </motion.div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/app/join/page.tsx
git commit -m "feat: add join page for entering session codes"
```

---

## Task 14: Spectator Page

**Files:**
- Create: `planechaser/src/app/spectate/page.tsx`

- [ ] **Step 1: Write the spectator page**

```typescript
// planechaser/src/app/spectate/page.tsx
'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Eye } from 'lucide-react'
import { PlayerList } from '@/components/player-list'
import { TurnIndicator } from '@/components/turn-indicator'
import { useSessionPlayers, useSessionSubscription } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'
import { chaosCost } from '@/lib/game/engine'
import type { GameSession } from '@/lib/game/session-types'
import type { GameState } from '@/lib/game/types'

export default function SpectatePage() {
  const router = useRouter()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('lobby')

  const { data: players } = useSessionPlayers(activeSessionId ?? undefined)

  const handleSessionUpdate = useCallback((session: GameSession) => {
    setSessionStatus(session.status)
    if (session.game_state) {
      setGameState(session.game_state as unknown as GameState)
    }
  }, [])

  useSessionSubscription(activeSessionId ?? undefined, handleSessionUpdate)

  if (!activeSessionId) {
    router.replace('/join')
    return null
  }

  // Lobby waiting state
  if (sessionStatus === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center flex flex-col gap-4"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
            <Eye className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Waiting for host to start...
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            You&apos;ll see the game in real-time once it begins
          </p>
          {players && (
            <div className="mt-4 max-w-xs mx-auto w-full">
              <PlayerList players={players} />
            </div>
          )}
        </motion.div>
      </main>
    )
  }

  // Game ended
  if (sessionStatus === 'ended') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Game Over
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            The host has ended the game.
          </p>
        </div>
      </main>
    )
  }

  // Active game — spectator view
  if (!gameState) return null

  const currentPlane = gameState.deck[gameState.currentPlaneIndex]
  const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex]
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId)
  const cost = chaosCost(gameState.rollCountThisTurn)

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] p-4">
      <div className="max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Spectator badge */}
        <div className="flex items-center gap-2 justify-center">
          <Eye className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-accent)] uppercase tracking-wider">
            Spectating
          </span>
        </div>

        {/* Turn indicator */}
        <TurnIndicator
          playerName={currentPlayer?.display_name ?? 'Unknown'}
          rollCost={cost}
        />

        {/* Current plane */}
        {currentPlane && (
          <div className="relative aspect-[5/7] rounded-xl overflow-hidden">
            <Image
              src={currentPlane.image_uris.normal}
              alt={currentPlane.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        )}

        {/* Player list */}
        {players && (
          <PlayerList
            players={players}
            currentTurnUserId={currentPlayerId}
            showTurnIndicator
          />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/app/spectate/page.tsx
git commit -m "feat: add spectator page with real-time game state display"
```

---

## Task 15: Update Setup Page — Create Multiplayer Session

**Files:**
- Modify: `planechaser/src/app/setup/page.tsx`

- [ ] **Step 1: Add multiplayer session creation to setup**

At the top of `SetupPage`, after the existing hooks, add:

```typescript
import { useCreateSession } from '@/hooks/useGameSession'

// Inside the component, add:
const createSession = useCreateSession()
const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
const setIsHost = useAppStore((s) => s.setIsHost)
```

- [ ] **Step 2: Add "Create Multiplayer Game" button**

Add a new button in the setup UI (after the existing "Start Game" section) that creates a session and redirects to lobby:

```typescript
function handleCreateMultiplayerGame() {
  createSession.mutate(
    { podId: activePodId ?? undefined },
    {
      onSuccess: (session) => {
        setActiveSessionId(session.id)
        setIsHost(true)
        router.push(`/lobby?code=${session.session_code}`)
      },
    }
  )
}
```

Add the button to the JSX:

```tsx
<motion.button
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  onClick={handleCreateMultiplayerGame}
  disabled={createSession.isPending}
  className="w-full rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5 text-center transition-all hover:bg-[var(--color-accent)]/10"
>
  <p className="text-[17px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
    {createSession.isPending ? 'Creating...' : 'Create Multiplayer Game'}
  </p>
  <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
    Get a code for friends to join
  </p>
</motion.button>
```

- [ ] **Step 3: Handle fromLobby param**

When the setup page receives `?fromLobby=true`, it means the host is back from the lobby with players joined. The `startGame` function should now also call `startSession` to sync initial state to Supabase:

```typescript
import { useStartSession } from '@/hooks/useGameSession'

// Inside component:
const startSessionMutation = useStartSession()
const activeSessionId = useAppStore((s) => s.activeSessionId)

// In the startGame function, after creating the GameState, add:
if (activeSessionId) {
  startSessionMutation.mutate({
    sessionId: activeSessionId,
    initialState: state,
    firstPlayerId: state.turnOrder[0],
  })
}
```

- [ ] **Step 4: Populate players in GameState from session**

When `fromLobby=true`, fetch session players and set them in the initial GameState:

```typescript
import { useSessionPlayers } from '@/hooks/useGameSession'

// Inside component:
const { data: sessionPlayers } = useSessionPlayers(activeSessionId ?? undefined)

// In startGame, before creating GameState:
const players = sessionPlayers?.map((sp) => ({
  id: sp.user_id,
  display_name: sp.profile?.display_name ?? 'Player',
})) ?? [{ id: user?.id ?? 'host', display_name: 'Host' }]

const turnOrder = players.map((p) => p.id)

// Then in the GameState:
const state: GameState = {
  ...existingFields,
  players,
  turnOrder,
  currentTurnIndex: 0,
  currentTurnRolls: [],
  turnHistory: [],
}
```

- [ ] **Step 5: Commit**

```bash
git add planechaser/src/app/setup/page.tsx
git commit -m "feat(setup): add multiplayer session creation and lobby integration"
```

---

## Task 16: Update Game Page — Sync & Turn Display

**Files:**
- Modify: `planechaser/src/app/game/page.tsx`

- [ ] **Step 1: Add Supabase sync on state change**

Import the sync hook and add sync logic:

```typescript
import { useSyncGameState, useEndSession } from '@/hooks/useGameSession'
import { TurnIndicator } from '@/components/turn-indicator'

// Inside component:
const syncState = useSyncGameState()
const endSessionMutation = useEndSession()
const activeSessionId = useAppStore((s) => s.activeSessionId)
const isHost = useAppStore((s) => s.isHost)
```

Add a `useEffect` that syncs state to Supabase whenever it changes (debounced):

```typescript
useEffect(() => {
  if (!state || !activeSessionId || !isHost) return

  const timeout = setTimeout(() => {
    const currentPlayerId = state.turnOrder[state.currentTurnIndex] ?? ''
    syncState.mutate({
      sessionId: activeSessionId,
      state,
      currentTurnUserId: currentPlayerId,
    })
  }, 100) // 100ms debounce

  return () => clearTimeout(timeout)
}, [state, activeSessionId, isHost])
```

- [ ] **Step 2: Replace RESET_TURN with END_TURN**

Change `handleEndTurn`:

```typescript
const handleEndTurn = useCallback(() => {
  setState((prev) => {
    if (!prev) return prev
    return gameReducer(prev, { type: 'END_TURN' })
  })
}, [])
```

- [ ] **Step 3: Add TurnIndicator to game UI**

In the JSX, above the plane card display, add:

```tsx
{state.players.length > 1 && (
  <TurnIndicator
    playerName={
      state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex])?.display_name ?? 'Player'
    }
    rollCost={chaosCost(state.rollCountThisTurn)}
  />
)}
```

- [ ] **Step 4: End session on game end**

In the `handleEndGame` callback, add session cleanup:

```typescript
if (activeSessionId && isHost) {
  endSessionMutation.mutate(activeSessionId)
}
```

- [ ] **Step 5: Commit**

```bash
git add planechaser/src/app/game/page.tsx
git commit -m "feat(game): sync state to Supabase and show turn indicator"
```

---

## Task 17: Integration Test — Full Multiplayer Flow

**Files:**
- Create: `planechaser/tests/multiplayer-session.spec.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// planechaser/tests/multiplayer-session.spec.ts
import { describe, it, expect } from 'vitest'
import { generateSessionCode, isValidSessionCode } from '../src/lib/game/session-code'
import { gameReducer } from '../src/lib/game/engine'
import type { GameState } from '../src/lib/game/types'

describe('Multiplayer session flow', () => {
  it('generates valid session codes', () => {
    const code = generateSessionCode()
    expect(isValidSessionCode(code)).toBe(true)
    expect(code).toHaveLength(6)
  })

  it('END_TURN cycles through players correctly', () => {
    const state: GameState = {
      id: 'test',
      config: { playerCount: 3, deckSize: 10 },
      deck: [],
      currentPlaneIndex: 0,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 1,
      dieRollHistory: [],
      planesVisited: 1,
      startedAt: Date.now(),
      players: [
        { id: 'p1', display_name: 'Alice' },
        { id: 'p2', display_name: 'Bob' },
        { id: 'p3', display_name: 'Charlie' },
      ],
      turnOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 0,
      currentTurnRolls: [{ result: 'blank', timestamp: 1000 }],
      turnHistory: [],
    }

    // Turn 1 -> Turn 2
    const after1 = gameReducer(state, { type: 'END_TURN' })
    expect(after1.currentTurnIndex).toBe(1)
    expect(after1.rollCountThisTurn).toBe(0)
    expect(after1.turnHistory).toHaveLength(1)
    expect(after1.turnHistory[0].playerId).toBe('p1')

    // Turn 2 -> Turn 3
    const after2 = gameReducer(after1, { type: 'END_TURN' })
    expect(after2.currentTurnIndex).toBe(2)

    // Turn 3 -> wraps to Turn 1
    const after3 = gameReducer(after2, { type: 'END_TURN' })
    expect(after3.currentTurnIndex).toBe(0)
  })

  it('ROLL_DIE tracks per-turn rolls', () => {
    const state: GameState = {
      id: 'test',
      config: { playerCount: 2, deckSize: 10 },
      deck: [],
      currentPlaneIndex: 0,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: 1,
      startedAt: Date.now(),
      players: [
        { id: 'p1', display_name: 'Alice' },
        { id: 'p2', display_name: 'Bob' },
      ],
      turnOrder: ['p1', 'p2'],
      currentTurnIndex: 0,
      currentTurnRolls: [],
      turnHistory: [],
    }

    const afterRoll = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    expect(afterRoll.currentTurnRolls).toHaveLength(1)
    expect(afterRoll.currentTurnRolls[0].result).toBe('blank')
    expect(afterRoll.rollCountThisTurn).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd planechaser && npx vitest run tests/multiplayer-session.spec.ts
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add planechaser/tests/multiplayer-session.spec.ts
git commit -m "test: add multiplayer session integration tests"
```

---

## Task 18: Update Session Storage Fallback

**Files:**
- Modify: `planechaser/src/lib/game/session-storage.ts`

- [ ] **Step 1: Add session ID persistence**

Add to `planechaser/src/lib/game/session-storage.ts`:

```typescript
const SESSION_ID_KEY = 'planechaser_active_session_id'

export function saveActiveSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  } catch {
    // Ignore
  }
}

export function loadActiveSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ID_KEY)
  } catch {
    return null
  }
}

export function clearActiveSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_ID_KEY)
  } catch {
    // Ignore
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/lib/game/session-storage.ts
git commit -m "feat(storage): add session ID persistence for reconnect fallback"
```

---

## Task 19: Add "Join Game" Link to Navigation

**Files:**
- Modify: `planechaser/src/components/bottom-nav.tsx`

- [ ] **Step 1: Add join link**

Add a "Join" option to the bottom navigation that links to `/join`. This allows players to quickly access the join page from anywhere in the app:

```typescript
import { Users } from 'lucide-react'

// Add to the nav items array:
{ href: '/join', icon: Users, label: 'Join' }
```

- [ ] **Step 2: Commit**

```bash
git add planechaser/src/components/bottom-nav.tsx
git commit -m "feat(nav): add Join Game link to bottom navigation"
```

---

## Task 20: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd planechaser && npx vitest run
```
Expected: All tests pass (session-code, engine with END_TURN, multiplayer integration)

- [ ] **Step 2: Run type check**

```bash
cd planechaser && npx tsc --noEmit
```
Expected: No type errors

- [ ] **Step 3: Run dev server and verify**

```bash
cd planechaser && npm run dev
```

Verify:
1. `/setup` shows "Create Multiplayer Game" button
2. Clicking it creates a session and redirects to `/lobby?code=XXXXXX`
3. `/join` page accepts a 6-char code
4. `/spectate` shows waiting state
5. Game page shows turn indicator when multiple players
6. "End Turn" advances to next player

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address any remaining issues from integration testing"
```
