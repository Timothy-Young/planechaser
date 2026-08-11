import { shuffleDeck } from './shuffle'
import type { ArchenemyState, Player, SchemeCard } from './types'

/** Official Archenemy life totals. */
export const ARCHENEMY_LIFE = 40
export const HERO_LIFE = 20

interface SchemeDeckLike {
  id: string
  scheme_ids: string[]
}

interface SchemeLike {
  id: string
  type_line: string
}

export interface BuildArchenemyStateParams<S extends SchemeLike> {
  players: Player[]
  designatedArchenemyId: string | null
  schemes: S[] | undefined
  schemeDecks?: SchemeDeckLike[]
  selectedSchemeDeckId?: string | null
  /** Fallback name source when the archenemy is not in `players` (pod leaderboard). */
  fallbackName?: string
}

/**
 * Builds the opening Archenemy state.
 *
 * Shared by the setup page and the multiplayer lobby. Both need identical
 * scheme-deck filtering, shuffling, and the archenemy-goes-first rule; keeping
 * two copies is how they quietly diverge, which is precisely how the lobby
 * ended up hardcoding `mode: 'planechase'` while setup supported three modes.
 *
 * Returns null when the inputs cannot produce a playable state, so callers can
 * refuse to start rather than beginning a broken game.
 */
export function buildArchenemyState<S extends SchemeLike>({
  players,
  designatedArchenemyId,
  schemes,
  schemeDecks,
  selectedSchemeDeckId,
  fallbackName,
}: BuildArchenemyStateParams<S>): ArchenemyState | null {
  if (!designatedArchenemyId || !schemes || schemes.length === 0) return null

  let schemesToUse = schemes
  if (selectedSchemeDeckId) {
    const deck = schemeDecks?.find((d) => d.id === selectedSchemeDeckId)
    if (deck) {
      const allowed = new Set(deck.scheme_ids)
      const filtered = schemes.filter((s) => allowed.has(s.id))
      // An empty custom deck would otherwise start a game the archenemy can
      // never act in. Fall back to the full pool instead.
      if (filtered.length > 0) schemesToUse = filtered
    }
  }

  const schemeDeck = shuffleDeck(schemesToUse).map((s) => ({
    ...s,
    isOngoing: s.type_line.toLowerCase().includes('ongoing'),
  })) as unknown as SchemeCard[]

  const designated = players.find((p) => p.id === designatedArchenemyId)

  return {
    archenemyId: designatedArchenemyId,
    archenemyName: designated?.display_name ?? fallbackName ?? 'Archenemy',
    schemeDeck,
    schemesInMotion: [],
    schemesPlayed: 0,
    // The archenemy always takes the first turn.
    side: 'archenemy',
    turnNumber: 1,
  }
}

/** Archenemy starts on 40, everyone else on 20. */
export function buildLifeTotals(
  players: Player[],
  archenemyId: string,
): Record<string, number> {
  return Object.fromEntries(
    players.map((p) => [p.id, p.id === archenemyId ? ARCHENEMY_LIFE : HERO_LIFE]),
  )
}

/**
 * Turn order with the archenemy first.
 *
 * The engine expects `currentTurnIndex: 0` to be the archenemy's turn, so a
 * roster in join order would otherwise hand the first turn to whoever happened
 * to create the lobby.
 */
export function archenemyFirstTurnOrder(players: Player[], archenemyId: string): string[] {
  const rest = players.filter((p) => p.id !== archenemyId).map((p) => p.id)
  return players.some((p) => p.id === archenemyId) ? [archenemyId, ...rest] : rest
}
