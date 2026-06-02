import type { GameState, GameAction, DieResult, TurnRecord, PlaneCard } from './types'

export function rollPlanarDie(): DieResult {
  const roll = Math.random()
  // Official planar die: 1 planeswalk, 1 chaos, 4 blank (out of 6 faces)
  if (roll < 1 / 6) return 'planeswalk'
  if (roll < 2 / 6) return 'chaos'
  return 'blank'
}

export function chaosCost(rollCount: number): number {
  // First roll is free (0 mana), second costs 1, third costs 2, etc.
  return rollCount
}

const MAX_UNDO_HISTORY = 5

function stripHistory(state: GameState): Omit<GameState, 'stateHistory'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stateHistory: _omitted, ...rest } = state
  return rest
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
        lastDieResult: null,
        dieState: 'idle',
      }
    }

    case 'END_TURN': {
      const currentPlayerId = state.turnOrder[state.currentTurnIndex]
      const currentPlayer = state.players.find((p) => p.id === currentPlayerId)

      const startPlane = state.deck[state.turnStartPlaneIndex]
      const currentPlane = state.deck[state.currentPlaneIndex]
      const didPlaneswalk = state.currentTurnRolls.some((r) => r.result === 'planeswalk')
      const chaosRolls = state.currentTurnRolls.filter((r) => r.result === 'chaos')

      const turnRecord: TurnRecord = {
        playerId: currentPlayerId ?? 'unknown',
        playerName: currentPlayer?.display_name || 'Unknown',
        rolls: state.currentTurnRolls,
        planeswalked: didPlaneswalk,
        chaosTriggered: chaosRolls.length > 0,
        planeAtStart: startPlane?.name ?? 'Unknown',
        planeAtStartId: startPlane?.id ?? '',
        newPlane: didPlaneswalk ? currentPlane?.name : undefined,
        newPlaneId: didPlaneswalk ? currentPlane?.id : undefined,
        chaosEffects: chaosRolls.length > 0 && startPlane?.oracle_text
          ? [startPlane.oracle_text.split('\n').find((l: string) => /chaos/i.test(l)) ?? '']
          : [],
        conquests: [],
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
        turnStartPlaneIndex: state.currentPlaneIndex,
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

    case 'RESOLVE_PHENOMENON': {
      const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
      return {
        ...state,
        currentPlaneIndex: nextIndex,
        planesVisited: state.planesVisited + 1,
        phenomenonActive: false,
      }
    }

    case 'BEGIN_REVEAL_CHAOS': {
      return {
        ...state,
        revealState: {
          cards: action.cards,
          source: 'chaos',
          effectType: action.effectType,
          resolved: false,
        },
      }
    }

    case 'DISMISS_REVEAL': {
      return {
        ...state,
        revealState: null,
        showChaosOverlay: false,
      }
    }

    case 'REORDER_BOTTOM': {
      const reorderedIds = new Set(action.cardIds)
      const remainingDeck = state.deck.filter((c) => !reorderedIds.has(c.id))
      const reorderedCards = action.cardIds
        .map((id) => state.deck.find((c) => c.id === id))
        .filter((c): c is PlaneCard => c !== undefined)

      return {
        ...state,
        deck: [...remainingDeck, ...reorderedCards],
        revealState: state.revealState ? { ...state.revealState, resolved: true } : null,
      }
    }

    case 'SHUFFLE_REMAINING': {
      const before = state.deck.slice(0, state.currentPlaneIndex + 1)
      const after = state.deck.slice(state.currentPlaneIndex + 1)
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

    // UNDO and DISMISS_CHAOS are handled by gameReducer directly
    default:
      return state
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'UNDO') {
    if (state.stateHistory.length === 0) return state
    const previous = state.stateHistory[state.stateHistory.length - 1]
    const remainingHistory = state.stateHistory.slice(0, -1)
    return {
      ...previous,
      stateHistory: remainingHistory,
    }
  }

  if (action.type === 'DISMISS_CHAOS') {
    return { ...state, showChaosOverlay: false }
  }

  // PLANESWALK and SETTLE_DIE are automatic consequences, not user actions — skip history
  if (action.type === 'PLANESWALK' || action.type === 'SETTLE_DIE'
    || action.type === 'RESOLVE_PHENOMENON' || action.type === 'BEGIN_REVEAL_CHAOS'
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM') {
    return applyAction(state, action)
  }

  // For all other actions: snapshot current state (sans history), cap at MAX_UNDO_HISTORY
  const snapshot = stripHistory(state)
  const newHistory = [...state.stateHistory, snapshot].slice(-MAX_UNDO_HISTORY)

  const nextState = applyAction({ ...state, stateHistory: newHistory }, action)
  return nextState
}
