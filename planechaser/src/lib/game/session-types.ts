import type { GameState } from './types'

export type SessionStatus = 'lobby' | 'active' | 'ended'
export type GameType = 'planechase' | 'archenemy'

export interface GameSession {
  id: string
  pod_id: string | null
  host_user_id: string
  session_code: string
  status: SessionStatus
  game_type: GameType
  game_state: GameState | null
  turn_order: string[]
  current_turn_user_id: string | null
  created_at: string
  updated_at: string
}

export interface SessionPlayer {
  session_id: string
  user_id: string
  joined_at: string
  deck_id: string | null
  profile?: {
    display_name: string
  }
}

export interface CreateSessionParams {
  hostUserId: string
  podId?: string
  gameType?: GameType
}

export interface JoinSessionParams {
  sessionCode: string
  userId: string
}
