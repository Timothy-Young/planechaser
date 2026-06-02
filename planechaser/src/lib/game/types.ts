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

export interface ArchenemyState {
  archenemyId: string
  archenemyName: string
  schemeDeck: SchemeCard[]
  currentSchemeIndex: number
  activeSchemes: SchemeCard[]
  schemesPlayed: number
}

export interface GameConfig {
  playerCount: number
  deckSize: number
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
}

export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'RESET_TURN' }
  | { type: 'DRAW_SCHEME' }
  | { type: 'ABANDON_SCHEME'; schemeId: string }
  | { type: 'UNDO' }
  | { type: 'SHUFFLE_REMAINING' }
  | { type: 'RESET_ROLL_COUNT' }
  | { type: 'DISMISS_CHAOS' }
  | { type: 'RESOLVE_PHENOMENON' }
  | { type: 'BEGIN_REVEAL_CHAOS'; cards: PlaneCard[]; effectType: ChaosEffectType }
  | { type: 'DISMISS_REVEAL' }
  | { type: 'REORDER_BOTTOM'; cardIds: string[] }
  | { type: 'REORDER_TOP'; cardIds: string[] }
  | { type: 'SPATIAL_MERGE'; planeIndices: [number, number] }
  | { type: 'LEAVE_DUAL_PLANE' }
  | { type: 'RESOLVE_SPATIAL_MERGE' }

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
