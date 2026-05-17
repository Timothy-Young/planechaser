import { createClient } from '@/lib/supabase/client'
import { generateSessionCode } from './session-code'
import type { GameState } from './types'
import type {
  GameSession,
  SessionPlayer,
  CreateSessionParams,
  JoinSessionParams,
  GameType,
} from './session-types'

function supabase() {
  return createClient()
}

export async function createGameSession(params: CreateSessionParams): Promise<GameSession> {
  const sessionCode = generateSessionCode()

  const { data, error } = await supabase()
    .from('active_game_sessions')
    .insert({
      host_user_id: params.hostUserId,
      pod_id: params.podId ?? null,
      session_code: sessionCode,
      game_type: params.gameType ?? 'planechase',
      status: 'lobby',
    })
    .select()
    .single()

  if (error) throw error

  // Host auto-joins as a player
  await supabase()
    .from('game_session_players')
    .insert({ session_id: data.id, user_id: params.hostUserId })

  return data as GameSession
}

export async function joinGameSession(params: JoinSessionParams): Promise<GameSession> {
  const { data: session, error: findError } = await supabase()
    .from('active_game_sessions')
    .select()
    .eq('session_code', params.sessionCode.toUpperCase())
    .eq('status', 'lobby')
    .single()

  if (findError || !session) throw new Error('Session not found or already started')

  const { error: joinError } = await supabase()
    .from('game_session_players')
    .insert({ session_id: session.id, user_id: params.userId })

  if (joinError) {
    if (joinError.code === '23505') throw new Error('Already joined')
    throw joinError
  }

  return session as GameSession
}

export async function getSessionPlayers(sessionId: string): Promise<SessionPlayer[]> {
  const { data, error } = await supabase()
    .from('game_session_players')
    .select('*, profiles(display_name)')
    .eq('session_id', sessionId)
    .order('joined_at')

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: row.profiles as { display_name: string } | undefined,
  })) as SessionPlayer[]
}

export async function updateSessionTurnOrder(
  sessionId: string,
  turnOrder: string[]
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({ turn_order: turnOrder })
    .eq('id', sessionId)

  if (error) throw error
}

export async function startSession(
  sessionId: string,
  initialState: GameState,
  firstPlayerId: string
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({
      status: 'active',
      game_state: initialState as unknown as Record<string, unknown>,
      current_turn_user_id: firstPlayerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function syncGameState(
  sessionId: string,
  state: GameState,
  currentTurnUserId: string
): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({
      game_state: state as unknown as Record<string, unknown>,
      current_turn_user_id: currentTurnUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase()
    .from('active_game_sessions')
    .update({ status: 'ended', updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw error
}

export async function getSessionByCode(code: string): Promise<GameSession | null> {
  const { data, error } = await supabase()
    .from('active_game_sessions')
    .select()
    .eq('session_code', code.toUpperCase())
    .single()

  if (error) return null
  return data as GameSession
}

export async function getActiveSessionForUser(userId: string): Promise<GameSession | null> {
  const { data, error } = await supabase()
    .from('game_session_players')
    .select('session_id, active_game_sessions(*)')
    .eq('user_id', userId)
    .not('active_game_sessions.status', 'eq', 'ended')
    .limit(1)
    .single()

  if (error || !data) return null
  return (data as Record<string, unknown>).active_game_sessions as GameSession
}
