import { createClient } from '@/lib/supabase/client'
import type { AdminUser, AdminFeedback, AdminCustomPlane, AppStats, UserRole } from './types'

function supabase() {
  return createClient()
}

// Stats
export async function getAppStats(): Promise<AppStats> {
  const sb = supabase()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [users, games, conquests, customPlanes, feedback, newFeedback, banned, recentUsers, recentGames] =
    await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }),
      sb.from('game_sessions').select('id', { count: 'exact', head: true }),
      sb.from('conquered_planes').select('id', { count: 'exact', head: true }),
      sb.from('custom_planes').select('id', { count: 'exact', head: true }),
      sb.from('feedback').select('id', { count: 'exact', head: true }),
      sb.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      sb.from('game_sessions').select('id', { count: 'exact', head: true }).gte('started_at', sevenDaysAgo),
    ])

  return {
    total_users: users.count ?? 0,
    total_games: games.count ?? 0,
    total_conquests: conquests.count ?? 0,
    total_custom_planes: customPlanes.count ?? 0,
    total_feedback: feedback.count ?? 0,
    new_feedback: newFeedback.count ?? 0,
    banned_users: banned.count ?? 0,
    users_last_7_days: recentUsers.count ?? 0,
    games_last_7_days: recentGames.count ?? 0,
  }
}

// Users
export async function getAdminUsers(): Promise<AdminUser[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AdminUser[]
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
}

export async function addStrike(userId: string, currentStrikes: number): Promise<{ banned: boolean }> {
  const sb = supabase()
  const newCount = currentStrikes + 1
  const shouldBan = newCount >= 3

  const updates: Record<string, unknown> = { strike_count: newCount }
  if (shouldBan) {
    updates.is_banned = true
    updates.banned_at = new Date().toISOString()
    updates.ban_reason = 'Automatic ban: 3 strikes reached'
  }

  const { error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
  return { banned: shouldBan }
}

export async function banUser(userId: string, reason: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    })
    .eq('id', userId)

  if (error) throw error
}

export async function unbanUser(userId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
      strike_count: 0,
    })
    .eq('id', userId)

  if (error) throw error
}

// Feedback
export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('feedback')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AdminFeedback[]
}

export async function replyToFeedback(
  feedbackId: string,
  adminUserId: string,
  reply: string,
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({
      admin_reply: reply,
      admin_reply_at: new Date().toISOString(),
      admin_reply_by: adminUserId,
      status: 'replied',
    })
    .eq('id', feedbackId)

  if (error) throw error
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'read' | 'replied' | 'resolved',
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId)

  if (error) throw error
}

// Custom Planes (moderation)
export async function getAdminCustomPlanes(): Promise<AdminCustomPlane[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('custom_planes')
    .select('id, user_id, name, type_line, oracle_text, chaos_text, is_public, image_path, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AdminCustomPlane[]
}

export async function adminDeleteCustomPlane(planeId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('custom_planes')
    .delete()
    .eq('id', planeId)

  if (error) throw error
}
