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
    ...overrides,
  }
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
    expect(chaosCost(1)).toBe(0)
  })

  it('third roll costs 1 mana', () => {
    expect(chaosCost(2)).toBe(1)
  })

  it('escalates with each roll', () => {
    expect(chaosCost(5)).toBe(4)
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

  it('PLANESWALK advances to the next plane and resets turn', () => {
    const state = makeState({ currentPlaneIndex: 0, planesVisited: 1, rollCountThisTurn: 3 })
    const next = gameReducer(state, { type: 'PLANESWALK' })
    expect(next.currentPlaneIndex).toBe(1)
    expect(next.planesVisited).toBe(2)
    expect(next.rollCountThisTurn).toBe(0)
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
