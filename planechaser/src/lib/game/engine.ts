import type {
  GameState,
  GameAction,
  DieResult,
  TurnRecord,
  PlaneCard,
  ArchenemyState,
  InMotionScheme,
} from './types'

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

/**
 * A standalone Archenemy game has no planar deck, so every plane action is a
 * no-op there. Guarding on the deck rather than on `config.mode` also closes a
 * latent bug: `(index + 1) % 0` is `NaN`, which indexes the deck to `undefined`.
 */
function hasPlanarDeck(state: GameState): boolean {
  return state.deck.length > 0
}

export function newSchemeInstanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `scheme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Move the top scheme off the deck and onto the board.
 *
 * Ongoing and one-shot schemes take the same path — the rules differ only in
 * when a scheme leaves the board, never in where it came from. Returns the
 * archenemy slice unchanged when the deck is empty, which happens only when
 * every scheme is already in motion.
 */
function setSchemeInMotion(archenemy: ArchenemyState): ArchenemyState {
  if (archenemy.schemeDeck.length === 0) return archenemy

  const [top, ...rest] = archenemy.schemeDeck
  const inMotion: InMotionScheme = {
    instanceId: newSchemeInstanceId(),
    card: top,
    setInMotionAt: Date.now(),
  }

  return {
    ...archenemy,
    schemeDeck: rest,
    schemesInMotion: [inMotion, ...archenemy.schemesInMotion],
    schemesPlayed: archenemy.schemesPlayed + 1,
  }
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
      if (!hasPlanarDeck(state)) return state
      // When on two planes, planeswalking leaves both — advance past the
      // furthest-forward occupied plane, never onto a plane already occupied.
      const base = state.secondPlaneIndex !== null
        ? Math.max(state.currentPlaneIndex, state.secondPlaneIndex)
        : state.currentPlaneIndex
      const nextIndex = (base + 1) % state.deck.length
      return {
        ...state,
        currentPlaneIndex: nextIndex,
        secondPlaneIndex: null,
        planesVisited: state.planesVisited + 1,
        lastDieResult: null,
        dieState: 'idle',
      }
    }

    case 'PLANESWALK_NO_LEAVE': {
      // Norn's Seedcore chaos: reveal until a plane card, planeswalk to it
      // WITHOUT leaving the current plane(s). Revealed non-planes go to the
      // bottom. The app caps at two simultaneous planes: a newly revealed
      // plane becomes the second plane, replacing any prior second plane
      // (which stays behind in the visited pile).
      if (!hasPlanarDeck(state)) return state
      const anchor = state.secondPlaneIndex !== null
        ? Math.max(state.currentPlaneIndex, state.secondPlaneIndex)
        : state.currentPlaneIndex
      const before = state.deck.slice(0, anchor + 1)
      const ahead = state.deck.slice(anchor + 1)

      let revealedPlane: PlaneCard | null = null
      const skippedNonPlanes: PlaneCard[] = []
      let consumed = 0
      for (const card of ahead) {
        consumed++
        if (card.card_type === 'plane') {
          revealedPlane = card
          break
        }
        skippedNonPlanes.push(card)
      }

      if (!revealedPlane) return state

      const rest = ahead.slice(consumed)
      return {
        ...state,
        deck: [...before, revealedPlane, ...rest, ...skippedNonPlanes],
        secondPlaneIndex: anchor + 1,
        planesVisited: state.planesVisited + 1,
      }
    }

    case 'RESOLVE_SPATIAL_MERGE': {
      // Spatial Merging: reveal until two plane cards; simultaneously
      // planeswalk to both. Revealed non-plane cards go to the bottom of the
      // planar deck, so the two planes end up adjacent right after the
      // phenomenon. The deck is treated linearly (same assumption as
      // SHUFFLE_REMAINING / REORDER_TOP): cards before currentPlaneIndex are
      // the visited pile.
      if (!hasPlanarDeck(state)) return state
      const before = state.deck.slice(0, state.currentPlaneIndex + 1)
      const ahead = state.deck.slice(state.currentPlaneIndex + 1)

      const planes: PlaneCard[] = []
      const skippedNonPlanes: PlaneCard[] = []
      let consumed = 0
      for (const card of ahead) {
        consumed++
        if (card.card_type === 'plane') {
          planes.push(card)
          if (planes.length === 2) break
        } else {
          skippedNonPlanes.push(card)
        }
      }

      if (planes.length < 2) {
        // Not enough planes — just planeswalk to whatever is next
        // modulo wrap matches PLANESWALK's existing behavior for deck exhaustion
        const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
        return {
          ...state,
          currentPlaneIndex: nextIndex,
          secondPlaneIndex: null,
          planesVisited: state.planesVisited + 1,
          phenomenonActive: false,
        }
      }

      const rest = ahead.slice(consumed)
      return {
        ...state,
        deck: [...before, ...planes, ...rest, ...skippedNonPlanes],
        currentPlaneIndex: state.currentPlaneIndex + 1,
        secondPlaneIndex: state.currentPlaneIndex + 2,
        planesVisited: state.planesVisited + 2,
        phenomenonActive: false,
      }
    }

    case 'END_TURN': {
      // Per-player turns belong to the Planechase loop; a standalone Archenemy
      // game uses END_ARCHENEMY_TURN instead. The turn-order check is the real
      // hazard here — the plane lookups below already tolerate a missing card,
      // but `% turnOrder.length` on an empty order is `NaN`.
      if (state.config.mode === 'archenemy' || state.turnOrder.length === 0) return state
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

      // Find next non-eliminated player
      const eliminated = state.eliminatedPlayerIds ?? []
      let nextTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length
      let attempts = 0
      while (eliminated.includes(state.turnOrder[nextTurnIndex]) && attempts < state.turnOrder.length) {
        nextTurnIndex = (nextTurnIndex + 1) % state.turnOrder.length
        attempts++
      }

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

    case 'ELIMINATE_PLAYER': {
      const eliminated = state.eliminatedPlayerIds ?? []
      if (eliminated.includes(action.playerId)) return state

      const newEliminated = [...eliminated, action.playerId]

      // If the eliminated player is the current turn player, advance to next
      const currentPlayerId = state.turnOrder[state.currentTurnIndex]
      let nextTurnIndex = state.currentTurnIndex
      if (currentPlayerId === action.playerId) {
        let attempts = 0
        nextTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length
        while (newEliminated.includes(state.turnOrder[nextTurnIndex]) && attempts < state.turnOrder.length) {
          nextTurnIndex = (nextTurnIndex + 1) % state.turnOrder.length
          attempts++
        }
      }

      return {
        ...state,
        eliminatedPlayerIds: newEliminated,
        currentTurnIndex: nextTurnIndex,
        rollCountThisTurn: currentPlayerId === action.playerId ? 0 : state.rollCountThisTurn,
        currentTurnRolls: currentPlayerId === action.playerId ? [] : state.currentTurnRolls,
        lastDieResult: currentPlayerId === action.playerId ? null : state.lastDieResult,
        dieState: currentPlayerId === action.playerId ? 'idle' : state.dieState,
      }
    }

    case 'RESTORE_PLAYER': {
      const eliminated = state.eliminatedPlayerIds ?? []
      return {
        ...state,
        eliminatedPlayerIds: eliminated.filter((id) => id !== action.playerId),
      }
    }

    case 'RESET_TURN':
      return {
        ...state,
        rollCountThisTurn: 0,
        lastDieResult: null,
        dieState: 'idle',
      }

    case 'SET_SCHEME_IN_MOTION': {
      if (!state.archenemy) return state
      return { ...state, archenemy: setSchemeInMotion(state.archenemy) }
    }

    case 'DISMISS_SCHEME': {
      // Resolving a one-shot and abandoning an ongoing are the same transition:
      // the card leaves the board and goes to the bottom of the scheme deck.
      // Only the button label differs, so they share an action and undo alike.
      if (!state.archenemy) return state

      const dismissed = state.archenemy.schemesInMotion.find(
        (s) => s.instanceId === action.instanceId
      )
      if (!dismissed) return state

      return {
        ...state,
        archenemy: {
          ...state.archenemy,
          schemesInMotion: state.archenemy.schemesInMotion.filter(
            (s) => s.instanceId !== action.instanceId
          ),
          schemeDeck: [...state.archenemy.schemeDeck, dismissed.card],
        },
      }
    }

    case 'END_ARCHENEMY_TURN': {
      if (!state.archenemy) return state

      // Passing to the team only flips the side. Passing back to the archenemy
      // starts their turn, and a scheme is set in motion as that turn's first
      // main phase begins — in the same step, so one tap is one undo.
      if (state.archenemy.side === 'archenemy') {
        return { ...state, archenemy: { ...state.archenemy, side: 'team' } }
      }

      return {
        ...state,
        archenemy: setSchemeInMotion({
          ...state.archenemy,
          side: 'archenemy',
          turnNumber: state.archenemy.turnNumber + 1,
        }),
      }
    }

    case 'ADJUST_LIFE': {
      const life = state.life ?? {}
      if (!(action.playerId in life)) return state
      // Deliberately unclamped: effects can take a player below zero, and
      // hiding that from the table would be wrong.
      return {
        ...state,
        life: { ...life, [action.playerId]: life[action.playerId] + action.delta },
      }
    }

    case 'SET_LIFE': {
      const life = state.life ?? {}
      if (!(action.playerId in life)) return state
      return { ...state, life: { ...life, [action.playerId]: action.value } }
    }

    case 'RESOLVE_PHENOMENON': {
      if (!hasPlanarDeck(state)) return state
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
      if (!hasPlanarDeck(state)) return state
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

    case 'REORDER_TOP': {
      if (!hasPlanarDeck(state)) return state
      const topReorderedIds = new Set(action.cardIds)
      const currentIdx = state.currentPlaneIndex
      const deckBefore = state.deck.slice(0, currentIdx + 1)
      const deckAfter = state.deck.slice(currentIdx + 1).filter((c) => !topReorderedIds.has(c.id))
      const topReorderedCards = action.cardIds
        .map((id) => state.deck.find((c) => c.id === id))
        .filter((c): c is PlaneCard => c !== undefined)

      return {
        ...state,
        deck: [...deckBefore, ...topReorderedCards, ...deckAfter],
        revealState: state.revealState ? { ...state.revealState, resolved: true } : null,
      }
    }

    case 'SHUFFLE_REMAINING': {
      if (!hasPlanarDeck(state)) return state
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

    case 'ADD_ROLL': {
      return {
        ...state,
        rollCountThisTurn: state.rollCountThisTurn + 1,
      }
    }

    case 'REMOVE_ROLL': {
      return {
        ...state,
        rollCountThisTurn: Math.max(0, state.rollCountThisTurn - 1),
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
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM'
    || action.type === 'PLANESWALK_NO_LEAVE'
    || action.type === 'RESOLVE_SPATIAL_MERGE' || action.type === 'REORDER_TOP'
    || action.type === 'ADD_ROLL' || action.type === 'REMOVE_ROLL') {
    return applyAction(state, action)
  }

  // For all other actions: snapshot current state (sans history), cap at MAX_UNDO_HISTORY
  const snapshot = stripHistory(state)
  const newHistory = [...state.stateHistory, snapshot].slice(-MAX_UNDO_HISTORY)

  const nextState = applyAction({ ...state, stateHistory: newHistory }, action)
  return nextState
}
