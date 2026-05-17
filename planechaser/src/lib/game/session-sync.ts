import { createClient } from '@/lib/supabase/client'
import type { GameSession } from './session-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type SessionChangeHandler = (session: GameSession) => void
type PlayersChangeHandler = () => void

let sessionChannel: RealtimeChannel | null = null
let playersChannel: RealtimeChannel | null = null

export function subscribeToSession(
  sessionId: string,
  onSessionChange: SessionChangeHandler
): () => void {
  const client = createClient()

  sessionChannel = client
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'active_game_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onSessionChange(payload.new as GameSession)
      }
    )
    .subscribe()

  return () => {
    sessionChannel?.unsubscribe()
    sessionChannel = null
  }
}

export function subscribeToSessionPlayers(
  sessionId: string,
  onPlayersChange: PlayersChangeHandler
): () => void {
  const client = createClient()

  playersChannel = client
    .channel(`session-players-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_session_players',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onPlayersChange()
      }
    )
    .subscribe()

  return () => {
    playersChannel?.unsubscribe()
    playersChannel = null
  }
}

export function unsubscribeAll(): void {
  sessionChannel?.unsubscribe()
  playersChannel?.unsubscribe()
  sessionChannel = null
  playersChannel = null
}
