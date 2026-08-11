import type { WireGameState } from './wire-state'

export type SessionStatus = 'lobby' | 'active' | 'ended'
/** Mirrors GameMode on the setup page and the CHECK constraint from 033. */
export type GameType = 'planechase' | 'archenemy' | 'both'

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
  /** Scheme deck chosen at setup, carried through to the lobby. */
  scheme_deck_id: string | null
  /**
   * Set in the lobby, not at setup. The archenemy can only be designated once
   * real players have joined — at setup time the roster is still placeholders.
   */
  archenemy_user_id: string | null
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
  schemeDeckId?: string | null
}

export interface JoinSessionParams {
  sessionCode: string
  userId: string
}
