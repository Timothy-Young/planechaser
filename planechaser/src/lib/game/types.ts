import type { ChaosEffectType } from '@/lib/cards/effect-classifier'

export interface Player {
  id: string
  display_name: string
}

export type DieResult = 'blank' | 'planeswalk' | 'chaos'

export interface DieRoll {
  result: DieResult
  timestamp: number
}

export type DieState = 'idle' | 'rolling' | 'settled'

export interface CardImageUris {
  normal: string
  large: string
  art_crop: string
  border_crop: string
  small: string
  png: string
}

export interface PlaneCard {
  id: string
  name: string
  type_line: string
  card_type: 'plane' | 'phenomenon'
  oracle_text: string
  flavor_text?: string
  image_uris: CardImageUris
  set_name: string
  set: string
  border_color?: string
  chaos_effect_type: ChaosEffectType
  chaos_effect_config: Record<string, unknown> | null
}

export interface SchemeCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: CardImageUris
  set_name: string
  set: string
  isOngoing: boolean
}

/**
 * A scheme that has been set in motion and is still face up.
 *
 * `instanceId` rather than the card id identifies a board position: a scheme
 * deck may legally hold two copies of the same card, and both can be in motion
 * at once.
 */
export interface InMotionScheme {
  instanceId: string
  card: SchemeCard
  setInMotionAt: number
}

export interface ArchenemyState {
  archenemyId: string
  archenemyName: string
  /** Ordered draw pile. Index 0 is the top; cleared schemes return to the end. */
  schemeDeck: SchemeCard[]
  /** Every face-up scheme, ongoing and one-shot alike, newest first. */
  schemesInMotion: InMotionScheme[]
  schemesPlayed: number
  /** Whose turn it is. The archenemy always takes the first turn. */
  side: ArchenemySide
  /** Increments at the start of each archenemy turn. Starts at 1. */
  turnNumber: number
}

export type ArchenemySide = 'archenemy' | 'team'

export type GameMode = 'planechase' | 'archenemy' | 'both'

export interface GameConfig {
  playerCount: number
  deckSize: number
  mode: GameMode
  /** @deprecated Read `mode`. Retained so archived sessions still parse. */
  isArchenemy?: boolean
}

export interface RevealState {
  cards: PlaneCard[]
  source: 'chaos' | 'phenomenon'
  effectType: ChaosEffectType
  resolved: boolean
}

export interface GameState {
  id: string
  config: GameConfig
  deck: PlaneCard[]
  currentPlaneIndex: number
  secondPlaneIndex: number | null
  dieState: DieState
  lastDieResult: DieResult | null
  rollCountThisTurn: number
  dieRollHistory: DieRoll[]
  planesVisited: number
  startedAt: number
  archenemy?: ArchenemyState
  players: Player[]
  turnOrder: string[]
  currentTurnIndex: number
  currentTurnRolls: DieRoll[]
  turnStartPlaneIndex: number
  turnHistory: TurnRecord[]
  stateHistory: Omit<GameState, 'stateHistory'>[]
  showChaosOverlay: boolean
  revealState: RevealState | null
  phenomenonActive: boolean
  eliminatedPlayerIds: string[]
  /** Life by player id. Seeded whenever `archenemy` is present. */
  life?: Record<string, number>
}

export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'RESET_TURN' }
  | { type: 'SET_SCHEME_IN_MOTION' }
  | { type: 'DISMISS_SCHEME'; instanceId: string }
  | { type: 'END_ARCHENEMY_TURN' }
  | { type: 'ADJUST_LIFE'; playerId: string; delta: number }
  | { type: 'SET_LIFE'; playerId: string; value: number }
  | { type: 'UNDO' }
  | { type: 'SHUFFLE_REMAINING' }
  | { type: 'RESET_ROLL_COUNT' }
  | { type: 'DISMISS_CHAOS' }
  | { type: 'RESOLVE_PHENOMENON' }
  | { type: 'BEGIN_REVEAL_CHAOS'; cards: PlaneCard[]; effectType: ChaosEffectType }
  | { type: 'DISMISS_REVEAL' }
  | { type: 'REORDER_BOTTOM'; cardIds: string[] }
  | { type: 'REORDER_TOP'; cardIds: string[] }
  | { type: 'RESOLVE_SPATIAL_MERGE' }
  | { type: 'PLANESWALK_NO_LEAVE' }
  | { type: 'ELIMINATE_PLAYER'; playerId: string }
  | { type: 'RESTORE_PLAYER'; playerId: string }
  | { type: 'ADD_ROLL' }
  | { type: 'REMOVE_ROLL' }

export interface TurnRecord {
  playerId: string
  playerName: string
  rolls: DieRoll[]
  planeswalked: boolean
  chaosTriggered: boolean
  planeAtStart: string
  planeAtStartId: string
  newPlane?: string
  newPlaneId?: string
  chaosEffects: string[]
  conquests: { planeName: string; conqueredBy: string }[]
  schemeRevealed?: string
  endedAt: number
}
