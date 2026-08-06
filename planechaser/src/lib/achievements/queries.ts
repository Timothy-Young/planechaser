import { createClient } from '@/lib/supabase/client'

function supabase() {
  return createClient()
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_key: string
  earned_at: string
  metadata: Record<string, unknown>
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase()
    .from('user_achievements')
    .select()
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as UserAchievement[]
}

/**
 * Ask the server to evaluate achievements for a finished game.
 *
 * The client deliberately cannot name a badge: migration 025 dropped the
 * INSERT policy on user_achievements, and this RPC re-derives every criterion
 * from game_sessions + conquered_planes (see
 * supabase/migrations/025_server_side_achievements.sql). It returns only the
 * keys that were newly earned, so the caller can celebrate exactly those.
 */
export async function grantSessionAchievements(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase().rpc('grant_session_achievements', {
    p_session_id: sessionId,
  })

  if (error) throw error
  return ((data ?? []) as { granted_key: string }[]).map((row) => row.granted_key)
}
