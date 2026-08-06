import type { GameState, PlaneCard, SchemeCard } from './types'

/**
 * The shape written to `active_game_sessions.game_state`.
 *
 * The host used to persist the entire `GameState` on every action. That object
 * embeds the full planar deck as `PlaneCard[]` — each card carrying oracle
 * text, flavour text and six image URLs — *and* `stateHistory`, a five-deep
 * undo buffer in which every snapshot holds its own copy of that same deck. A
 * 30-card game therefore shipped roughly six duplicated decks, on the order of
 * 150 KB, through a Postgres UPDATE and out over Realtime to every spectator,
 * every 300 ms of play.
 *
 * Two observations make that avoidable:
 *
 *  1. Undo is host-only and reads from sessionStorage, never from the server —
 *     so `stateHistory` has no business being synced at all.
 *  2. The spectator view renders exactly one card: the plane the table is
 *     currently on (plus a second one during Spatial Merging). It never walks
 *     the rest of the deck.
 *
 * So the wire format carries the deck as bare Scryfall ids (enough to keep
 * indices and counts honest, and enough for a future server-side resume to
 * rehydrate from the corpus) and inlines only the cards actually on screen.
 *
 * Inlining the visible cards rather than rehydrating them by id is deliberate:
 * a host can play with a *private* custom plane, which by definition is not in
 * a spectator's corpus. Sending the card itself keeps that rendering correctly.
 */
export interface WireGameState
  extends Omit<GameState, 'deck' | 'stateHistory' | 'archenemy'> {
  /** Scryfall ids for the full deck, in order. */
  deckIds: string[]
  /** Total deck length — kept explicit so readers never infer it from a slice. */
  deckCount: number
  /**
   * The cards the spectator can currently see. By construction index 0 is the
   * current plane and index 1, when present, is the second plane.
   */
  visibleCards: PlaneCard[]
  archenemy?: WireArchenemyState
}

export interface WireArchenemyState {
  archenemyId: string
  archenemyName: string
  /** Scheme deck as ids; the full cards are not needed off-device. */
  schemeDeckIds: string[]
  currentSchemeIndex: number
  /** Ongoing schemes stay inline — there are rarely more than a few. */
  activeSchemes: SchemeCard[]
  schemesPlayed: number
}

/** True when a stored `game_state` predates the wire format. */
function isLegacyState(value: unknown): value is GameState {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { deck?: unknown }).deck)
  )
}

export function toWireState(state: GameState): WireGameState {
  const {
    deck,
    stateHistory: _stateHistory,
    archenemy,
    currentPlaneIndex,
    secondPlaneIndex,
    ...rest
  } = state

  const current = deck[currentPlaneIndex]
  const second = secondPlaneIndex !== null ? deck[secondPlaneIndex] : undefined

  const visibleCards: PlaneCard[] = []
  if (current) visibleCards.push(current)
  if (second) visibleCards.push(second)

  return {
    ...rest,
    // Remap indices into `visibleCards`, so a reader can use them directly.
    currentPlaneIndex: 0,
    secondPlaneIndex: second ? 1 : null,
    deckIds: deck.map((card) => card.id),
    deckCount: deck.length,
    visibleCards,
    archenemy: archenemy
      ? {
          archenemyId: archenemy.archenemyId,
          archenemyName: archenemy.archenemyName,
          schemeDeckIds: archenemy.schemeDeck.map((scheme) => scheme.id),
          currentSchemeIndex: archenemy.currentSchemeIndex,
          activeSchemes: archenemy.activeSchemes,
          schemesPlayed: archenemy.schemesPlayed,
        }
      : undefined,
  }
}

/**
 * Rebuild a `GameState` a spectator can render.
 *
 * `deck` holds only the visible cards, with the indices already remapped to
 * match — so `state.deck[state.currentPlaneIndex]` keeps working exactly as it
 * did when the whole deck was synced. Anything that needs the true deck length
 * should read `deckCount` off the wire object instead.
 *
 * Accepts a legacy full-`GameState` payload too, so games already in flight
 * when this ships keep rendering for spectators instead of going blank.
 */
export function fromWireState(value: unknown): GameState | null {
  if (value === null || typeof value !== 'object') return null

  if (isLegacyState(value)) {
    const legacy = value as GameState
    return {
      ...legacy,
      stateHistory: [],
      secondPlaneIndex: legacy.secondPlaneIndex ?? null,
      revealState: legacy.revealState ?? null,
      phenomenonActive: legacy.phenomenonActive ?? false,
    }
  }

  const wire = value as WireGameState
  if (!Array.isArray(wire.visibleCards)) return null

  const {
    deckIds: _deckIds,
    deckCount: _deckCount,
    visibleCards,
    archenemy,
    ...rest
  } = wire

  return {
    ...rest,
    deck: visibleCards,
    currentPlaneIndex: 0,
    secondPlaneIndex: visibleCards.length > 1 ? 1 : null,
    // Undo never crosses the wire; the host's buffer lives in sessionStorage.
    stateHistory: [],
    revealState: wire.revealState ?? null,
    phenomenonActive: wire.phenomenonActive ?? false,
    archenemy: archenemy
      ? {
          archenemyId: archenemy.archenemyId,
          archenemyName: archenemy.archenemyName,
          // Spectators don't render the undrawn scheme deck; the ids are kept
          // on the wire for future use but there are no card objects to
          // reconstruct here.
          schemeDeck: [],
          currentSchemeIndex: archenemy.currentSchemeIndex,
          activeSchemes: archenemy.activeSchemes ?? [],
          schemesPlayed: archenemy.schemesPlayed,
        }
      : undefined,
  }
}
