import { newSchemeInstanceId } from './engine'
import type { ArchenemyState, GameConfig, GameMode, SchemeCard } from './types'

/**
 * Forward-translation for game state written before standalone Archenemy.
 *
 * Two shapes predate this change and both are still out there — in
 * `sessionStorage` on a device mid-game, and in `active_game_sessions.game_state`
 * for a session a spectator is watching. Reading either must never throw and
 * never blank the screen, which is the same contract `isLegacyState` already
 * honours for the pre-wire-format payload.
 */

/** The archenemy slice as it was stored before `schemesInMotion`. */
interface LegacyArchenemyState {
  archenemyId: string
  archenemyName: string
  schemeDeck?: SchemeCard[]
  currentSchemeIndex?: number
  activeSchemes?: SchemeCard[]
  schemesPlayed?: number
}

type MaybeCurrentArchenemy = Partial<ArchenemyState> & LegacyArchenemyState

function isLegacyArchenemy(value: MaybeCurrentArchenemy): boolean {
  return !Array.isArray(value.schemesInMotion)
}

/**
 * Bring an archenemy slice up to date.
 *
 * The old model never removed a drawn scheme from `schemeDeck` — it walked the
 * deck with `currentSchemeIndex % length` — so ongoing schemes appear in both
 * `activeSchemes` and `schemeDeck`. Filtering them out of the deck as they move
 * to the board keeps the new model's invariant that a card is in exactly one
 * place. `currentSchemeIndex` has no successor and is dropped.
 */
export function migrateArchenemyState(
  value: MaybeCurrentArchenemy | undefined,
  fallbackSchemeDeck: SchemeCard[] = [],
): ArchenemyState | undefined {
  if (!value) return undefined

  if (!isLegacyArchenemy(value)) {
    const current = value as ArchenemyState
    return {
      ...current,
      schemeDeck: current.schemeDeck ?? fallbackSchemeDeck,
      schemesInMotion: current.schemesInMotion ?? [],
      schemesPlayed: current.schemesPlayed ?? 0,
      side: current.side ?? 'archenemy',
      turnNumber: current.turnNumber ?? 1,
    }
  }

  const active = value.activeSchemes ?? []
  const inMotionIds = new Set(active.map((card) => card.id))
  const setInMotionAt = Date.now()

  return {
    archenemyId: value.archenemyId,
    archenemyName: value.archenemyName,
    schemeDeck: (value.schemeDeck ?? fallbackSchemeDeck).filter(
      (card) => !inMotionIds.has(card.id),
    ),
    schemesInMotion: active.map((card) => ({
      instanceId: newSchemeInstanceId(),
      card,
      setInMotionAt,
    })),
    schemesPlayed: value.schemesPlayed ?? active.length,
    side: 'archenemy',
    turnNumber: 1,
  }
}

/**
 * Derive `config.mode`. A pre-change Archenemy game was always a Planechase
 * game with schemes bolted on, so it maps to `both`, never to `archenemy`.
 */
export function migrateGameConfig(config: GameConfig): GameConfig {
  if (config.mode) return config

  const mode: GameMode = config.isArchenemy ? 'both' : 'planechase'
  return { ...config, mode }
}
