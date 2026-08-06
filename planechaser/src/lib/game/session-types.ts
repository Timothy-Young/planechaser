import type { WireGameState } from './wire-state'

export type SessionStatus = 'lobby' | 'active' | 'ended'
export type GameType = 'planechase' | 'archenemy'

export interface GameSession {
  id: string
  pod_id: string | null
  host_user_id: string
  session_code: string
  status: SessionStatus
  game_type: GameType
  /**
   * Slimmed projection of GameState — see wire-state.ts. Read it through
   * `fromWireState`, which also tolerates the pre-2026-07-31 full-GameState
   * payload left behind by games that were already in flight.
   */
  game_state: WireGameState | null
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
    avatar_url?: string | null
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
