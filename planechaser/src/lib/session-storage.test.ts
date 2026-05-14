import { describe, it, expect, beforeEach } from 'vitest'
import { saveGameState, loadGameState, clearGameState, hasActiveGame } from './game/session-storage'
import type { GameState } from './game/types'

const mockState: GameState = {
  id: 'test-123',
  config: { playerCount: 4, deckSize: 10 },
  deck: [],
  currentPlaneIndex: 0,
  dieState: 'idle',
  lastDieResult: null,
  rollCountThisTurn: 0,
  dieRollHistory: [],
  planesVisited: 1,
  startedAt: Date.now(),
}

describe('session storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saves and loads game state', () => {
    saveGameState(mockState)
    const loaded = loadGameState()
    expect(loaded).toEqual(mockState)
  })

  it('returns null when no game is saved', () => {
    expect(loadGameState()).toBeNull()
  })

  it('clears game state', () => {
    saveGameState(mockState)
    clearGameState()
    expect(loadGameState()).toBeNull()
  })

  it('detects active game', () => {
    expect(hasActiveGame()).toBe(false)
    saveGameState(mockState)
    expect(hasActiveGame()).toBe(true)
  })
})
