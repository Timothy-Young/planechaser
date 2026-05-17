import { createClient } from '@/lib/supabase/client'
import type { GameSession } from './session-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type SessionChangeHandler = (session: GameSession) => void
type PlayersChangeHandler = () => void

const activeChannels: Set<RealtimeChannel> = new Set()

export function subscribeToSession(
  sessionId: string,
  onSessionChange: SessionChangeHandler
): () => void {
  const client = createClient()

  const channel = client
    .channel(`session-${sessionId}-${Date.now()}`)
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

  activeChannels.add(channel)

  return () => {
    channel.unsubscribe()
    activeChannels.delete(channel)
  }
}

export function subscribeToSessionPlayers(
  sessionId: string,
  onPlayersChange: PlayersChangeHandler
): () => void {
  const client = createClient()

  const channel = client
    .channel(`session-players-${sessionId}-${Date.now()}`)
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

  activeChannels.add(channel)

  return () => {
    channel.unsubscribe()
    activeChannels.delete(channel)
  }
}

export function unsubscribeAll(): void {
  for (const channel of activeChannels) {
    channel.unsubscribe()
  }
  activeChannels.clear()
}
