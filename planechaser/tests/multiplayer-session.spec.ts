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
      stateHistory: [],
      showChaosOverlay: false,
    }

    const after1 = gameReducer(state, { type: 'END_TURN' })
    expect(after1.currentTurnIndex).toBe(1)
    expect(after1.rollCountThisTurn).toBe(0)
    expect(after1.turnHistory).toHaveLength(1)
    expect(after1.turnHistory[0].playerId).toBe('p1')

    const after2 = gameReducer(after1, { type: 'END_TURN' })
    expect(after2.currentTurnIndex).toBe(2)

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
      stateHistory: [],
      showChaosOverlay: false,
    }

    const afterRoll = gameReducer(state, { type: 'ROLL_DIE', result: 'blank' })
    expect(afterRoll.currentTurnRolls).toHaveLength(1)
    expect(afterRoll.currentTurnRolls[0].result).toBe('blank')
    expect(afterRoll.rollCountThisTurn).toBe(1)
  })
})
