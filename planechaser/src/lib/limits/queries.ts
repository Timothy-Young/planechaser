import { createClient } from '@/lib/supabase/client'
import { DEFAULT_LIMITS, LIMIT_KEYS, type AppLimits, type FeedbackUsage } from './types'

/**
 * Reads the tunable limits from `app_limits`. Falls back to DEFAULT_LIMITS on
 * error so a failed fetch never blocks the UI — the triggers still enforce the
 * real values server-side.
 */
export async function getAppLimits(): Promise<AppLimits> {
  const supabase = createClient()
  const { data, error } = await supabase.from('app_limits').select('key, value')

  if (error || !data) return DEFAULT_LIMITS

  const byKey = new Map<string, number>(
    data.map((row) => [row.key as string, row.value as number]),
  )

  return {
    feedbackCooldownSeconds:
      byKey.get(LIMIT_KEYS.feedbackCooldownSeconds) ?? DEFAULT_LIMITS.feedbackCooldownSeconds,
    feedbackDailyMax:
      byKey.get(LIMIT_KEYS.feedbackDailyMax) ?? DEFAULT_LIMITS.feedbackDailyMax,
    customPlanesMax:
      byKey.get(LIMIT_KEYS.customPlanesMax) ?? DEFAULT_LIMITS.customPlanesMax,
  }
}

/** Last submission time + rolling 24h count for the signed-in user. */
export async function getFeedbackUsage(userId: string): Promise<FeedbackUsage> {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [latest, recent] = await Promise.all([
    supabase
      .from('feedback')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
  ])

  if (latest.error) throw latest.error
  if (recent.error) throw recent.error

  return {
    lastSubmittedAt: (latest.data?.created_at as string | undefined) ?? null,
    countLast24h: recent.count ?? 0,
  }
}

/** Number of custom planes the user currently owns. */
export async function getCustomPlaneCount(userId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('custom_planes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error
  return count ?? 0
}
