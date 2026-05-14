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

export async function grantAchievements(
  userId: string,
  keys: string[],
): Promise<UserAchievement[]> {
  if (keys.length === 0) return []

  const rows = keys.map((key) => ({
    user_id: userId,
    achievement_key: key,
  }))

  const { data, error } = await supabase()
    .from('user_achievements')
    .upsert(rows, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true })
    .select()

  if (error) throw error
  return (data ?? []) as UserAchievement[]
}
