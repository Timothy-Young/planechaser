export type WinCondition = 'commander' | 'none'

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
    art_crop?: string
  }
  set_name: string
  set: string
}

export interface ActiveGameSession {
  id: string
  hostUserId: string
  players: Player[]
  deck: PlaneCard[]
  currentPlaneIndex: number
  dieState: DieState
  dieRollHistory: DieRoll[]
  startedAt: number
}
