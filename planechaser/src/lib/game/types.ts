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

export interface PlaneCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  set_name: string
  set: string
}

export interface GameConfig {
  playerCount: number
  deckSize: number
}

export interface GameState {
  id: string
  config: GameConfig
  deck: PlaneCard[]
  currentPlaneIndex: number
  dieState: DieState
  lastDieResult: DieResult | null
  rollCountThisTurn: number
  dieRollHistory: DieRoll[]
  planesVisited: number
  startedAt: number
}

export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'RESET_TURN' }
