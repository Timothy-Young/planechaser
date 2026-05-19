import { describe, it, expect } from 'vitest'
import { gameReducer, rollPlanarDie, chaosCost } from './engine'
import type { GameState } from './types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    config: { playerCount: 4, deckSize: 10 },
    deck: Array.from({ length: 10 }, (_, i) => ({
      id: `plane-${i}`,
      name: `Plane ${i}`,
      type_line: 'Plane — Test',
      card_type: 'plane' as const,
      oracle_text: 'Test text',
      image_uris: { normal: `https://example.com/${i}.jpg`, large: `https://example.com/${i}.jpg`, art_crop: `https://example.com/${i}.jpg`, border_crop: `https://example.com/${i}.jpg`, small: `https://example.com/${i}.jpg`, png: `https://example.com/${i}.png` },
      set_name: 'Test Set',
      set: 'tst',
      chaos_effect_type: 'standard' as const,
      chaos_effect_config: null,
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
    turnStartPlaneIndex: 0,
    turnHistory: [],
    stateHistory: [],
    showChaosOverlay: false,
    revealState: null,
    phenomenonActive: false,
    ...overrides,
  }
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    rollCountThisTurn: 2,
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
  })
}

describe('rollPlanarDie', () => {
  it('returns only valid die results', () => {
    const results = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      results.add(rollPlanarDie())
    }
    expect(results).toEqual(new Set(['blank', 'planeswalk', 'chaos']))
  })
})

describe('chaosCost', () => {
  it('first roll is free', () => {
    expect(chaosCost(0)).toBe(0)
  })

  it('second roll costs 1', () => {
    expect(chaosCost(1)).toBe(1)
  })

  it('third roll costs 2 mana', () => {
    expect(chaosCost(2)).toBe(2)
  })

  it('escalates with each roll', () => {
    expect(chaosCost(5)).toBe(5)
  })
})

describe('gameReducer', () => {
  it('ROLL_DIE records the result and increments roll count', () => {
    const state = makeState()
    const next = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    expect(next.rollCountThisTurn).toBe(1)
    expect(next.lastDieResult).toBe('blank')
    expect(next.dieRollHistory).toHaveLength(1)
    expect(next.dieState).toBe('settled')
  })

  it('PLANESWALK advances to the next plane without resetting roll count', () => {
    const state = makeState({ currentPlaneIndex: 0, planesVisited: 1, rollCountThisTurn: 3 })
    const next = gameReducer(state, { type: 'PLANESWALK' })
    expect(next.currentPlaneIndex).toBe(1)
    expect(next.planesVisited).toBe(2)
    expect(next.rollCountThisTurn).toBe(3)
    expect(next.lastDieResult).toBeNull()
  })

  it('PLANESWALK wraps around when deck is exhausted', () => {
    const state = makeState({ currentPlaneIndex: 9 })
    const next = gameReducer(state, { type: 'PLANESWALK' })
    expect(next.currentPlaneIndex).toBe(0)
  })

  it('RESET_TURN clears roll count and die state', () => {
    const state = makeState({ rollCountThisTurn: 4, lastDieResult: 'chaos', dieState: 'settled' })
    const next = gameReducer(state, { type: 'RESET_TURN' })
    expect(next.rollCountThisTurn).toBe(0)
    expect(next.lastDieResult).toBeNull()
    expect(next.dieState).toBe('idle')
  })

  it('SETTLE_DIE transitions die state to idle', () => {
    const state = makeState({ dieState: 'settled' })
    const next = gameReducer(state, { type: 'SETTLE_DIE' })
    expect(next.dieState).toBe('idle')
  })
})

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

describe('phenomenon handling', () => {
  it('RESOLVE_PHENOMENON advances to next plane and sets phenomenonActive false', () => {
    const state = makeState({ phenomenonActive: true, currentPlaneIndex: 2 })
    const result = gameReducer(state, { type: 'RESOLVE_PHENOMENON' })
    expect(result.currentPlaneIndex).toBe(3)
    expect(result.phenomenonActive).toBe(false)
    expect(result.planesVisited).toBe(state.planesVisited + 1)
  })
})

describe('reveal chaos actions', () => {
  it('BEGIN_REVEAL_CHAOS sets revealState', () => {
    const state = makeState()
    const revealCards = [state.deck[1], state.deck[2], state.deck[3]]
    const result = gameReducer(state, {
      type: 'BEGIN_REVEAL_CHAOS',
      cards: revealCards,
      effectType: 'reveal_and_chaos',
    })
    expect(result.revealState).toEqual({
      cards: revealCards,
      source: 'chaos',
      effectType: 'reveal_and_chaos',
      resolved: false,
    })
  })

  it('DISMISS_REVEAL clears revealState', () => {
    const state = makeState({
      revealState: {
        cards: [],
        source: 'chaos',
        effectType: 'reveal_and_chaos',
        resolved: false,
      },
    })
    const result = gameReducer(state, { type: 'DISMISS_REVEAL' })
    expect(result.revealState).toBeNull()
    expect(result.showChaosOverlay).toBe(false)
  })

  it('REORDER_BOTTOM moves specified cards to end of deck', () => {
    const state = makeState()
    const cardIds = [state.deck[1].id, state.deck[2].id]
    const result = gameReducer(state, { type: 'REORDER_BOTTOM', cardIds })
    const deckLength = result.deck.length
    expect(result.deck[deckLength - 2].id).toBe('plane-1')
    expect(result.deck[deckLength - 1].id).toBe('plane-2')
  })
})
