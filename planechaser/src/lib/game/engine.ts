import type { GameState, GameAction, DieResult } from './types'

export function rollPlanarDie(): DieResult {
  const roll = Math.random()
  // Official planar die: 1 planeswalk, 1 chaos, 4 blank (out of 6 faces)
  if (roll < 1 / 6) return 'planeswalk'
  if (roll < 2 / 6) return 'chaos'
  return 'blank'
}

export function chaosCost(rollCount: number): number {
  // First roll is free, each subsequent roll costs 1 more mana
  return Math.max(0, rollCount - 1)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROLL_DIE': {
      const roll = { result: action.result, timestamp: Date.now() }
      return {
        ...state,
        dieState: 'settled',
        lastDieResult: action.result,
        rollCountThisTurn: state.rollCountThisTurn + 1,
        dieRollHistory: [...state.dieRollHistory, roll],
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

    case 'RESET_TURN':
      return {
        ...state,
        rollCountThisTurn: 0,
        lastDieResult: null,
        dieState: 'idle',
      }
  }
}
