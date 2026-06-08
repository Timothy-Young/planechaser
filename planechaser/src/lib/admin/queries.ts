import { createClient } from '@/lib/supabase/client'
import type {
  AdminUser, AdminFeedback, AdminCustomPlane, AppStats,
  UserRole, AuditLogEntry, AuditAction, UserStrike,
  SystemAnnouncement, AnnouncementType,
} from './types'

function supabase() {
  return createClient()
}

// ─── Input Validation ────────────────────────────────────────────────────────

function sanitizeText(input: string, maxLength: number): string {
  // Trim, collapse whitespace, enforce max length
  return input.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function validateRequired(input: string, fieldName: string): string {
  const cleaned = input.trim()
  if (!cleaned) throw new Error(`${fieldName} cannot be empty`)
  return cleaned
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

async function logAuditAction(
  adminId: string,
  action: AuditAction,
  targetType: 'user' | 'custom_plane' | 'feedback' | 'announcement' | 'strike',
  targetId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const sb = supabase()
  await sb.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  })
  // Fire-and-forget — don't block mutations on audit failures
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('admin_audit_log')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as AuditLogEntry[]
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getAppStats(): Promise<AppStats> {
  const sb = supabase()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [users, games, conquests, customPlanes, feedback, newFeedback, banned, recentUsers, recentGames, feedbackAll] =
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
      // Fetch feedback categories for breakdown
      sb.from('feedback').select('category'),
    ])

  // Build category breakdown
  const feedback_by_category: Record<string, number> = { bug: 0, feature: 0, general: 0, other: 0 }
  if (feedbackAll.data) {
    for (const row of feedbackAll.data) {
      const cat = (row as { category: string }).category ?? 'other'
      feedback_by_category[cat] = (feedback_by_category[cat] ?? 0) + 1
    }
  }

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
    feedback_by_category,
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────
// Uses admin_user_stats view for computed counts

export async function getAdminUsers(): Promise<AdminUser[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('admin_user_stats')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AdminUser[]
}

export async function updateUserRole(adminId: string, userId: string, role: UserRole, previousRole: string): Promise<void> {
  const validRoles: UserRole[] = ['owner', 'admin', 'mod', 'user']
  if (!validRoles.includes(role)) throw new Error('Invalid role')

  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
  await logAuditAction(adminId, 'role_change', 'user', userId, { from: previousRole, to: role })
}

// ─── Strikes ────────────────────────────────────────────────────────────────

export async function getUserStrikes(userId: string): Promise<UserStrike[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('user_strikes')
    .select('*, admin_profile:profiles!user_strikes_admin_id_fkey(display_name), revoker_profile:profiles!user_strikes_revoked_by_fkey(display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as UserStrike[]
}

export async function addStrike(adminId: string, userId: string, reason: string): Promise<{ banned: boolean }> {
  const cleanReason = sanitizeText(reason, 500)
  if (!cleanReason) throw new Error('Strike reason is required')

  const sb = supabase()

  // Insert the strike record
  const { error: strikeError } = await sb
    .from('user_strikes')
    .insert({ user_id: userId, admin_id: adminId, reason: cleanReason })

  if (strikeError) throw strikeError

  // Count active (non-revoked) strikes
  const { count, error: countError } = await sb
    .from('user_strikes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (countError) throw countError
  const activeCount = count ?? 0

  // Update the strike_count on profiles for quick reference
  const shouldBan = activeCount >= 3
  const updates: Record<string, unknown> = { strike_count: activeCount }
  if (shouldBan) {
    updates.is_banned = true
    updates.banned_at = new Date().toISOString()
    updates.ban_reason = 'Automatic ban: 3 active strikes'
  }

  const { error: profileError } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (profileError) throw profileError
  await logAuditAction(adminId, 'strike_added', 'strike', userId, { reason: cleanReason, active_count: activeCount, auto_banned: shouldBan })
  return { banned: shouldBan }
}

export async function revokeStrike(adminId: string, strikeId: string, userId: string): Promise<void> {
  const sb = supabase()

  // Mark the strike as revoked
  const { error: revokeError } = await sb
    .from('user_strikes')
    .update({ revoked_at: new Date().toISOString(), revoked_by: adminId })
    .eq('id', strikeId)

  if (revokeError) throw revokeError

  // Recount active strikes and update profile
  const { count, error: countError } = await sb
    .from('user_strikes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (countError) throw countError
  const activeCount = count ?? 0

  const { error: profileError } = await sb
    .from('profiles')
    .update({ strike_count: activeCount })
    .eq('id', userId)

  if (profileError) throw profileError
  await logAuditAction(adminId, 'strike_revoked', 'strike', strikeId, { user_id: userId, new_active_count: activeCount })
}

export async function banUser(adminId: string, userId: string, reason: string): Promise<void> {
  const cleanReason = sanitizeText(reason, 500)
  if (!cleanReason) throw new Error('Ban reason is required')

  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: cleanReason,
    })
    .eq('id', userId)

  if (error) throw error
  await logAuditAction(adminId, 'user_banned', 'user', userId, { reason })
}

export async function unbanUser(adminId: string, userId: string): Promise<void> {
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
  await logAuditAction(adminId, 'user_unbanned', 'user', userId, {})
}

// ─── Banned User Check ──────────────────────────────────────────────────────

export async function checkUserBanned(userId: string): Promise<{ banned: boolean; reason: string | null }> {
  const sb = supabase()
  const { data, error } = await sb
    .from('profiles')
    .select('is_banned, ban_reason')
    .eq('id', userId)
    .single()

  if (error || !data) return { banned: false, reason: null }
  return {
    banned: (data as { is_banned: boolean; ban_reason: string | null }).is_banned,
    reason: (data as { is_banned: boolean; ban_reason: string | null }).ban_reason,
  }
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('feedback')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as AdminFeedback[]
}

export async function replyToFeedback(
  feedbackId: string,
  adminUserId: string,
  reply: string,
): Promise<void> {
  const cleanReply = validateRequired(sanitizeText(reply, 2000), 'Reply')

  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({
      admin_reply: cleanReply,
      admin_reply_at: new Date().toISOString(),
      admin_reply_by: adminUserId,
      status: 'replied',
    })
    .eq('id', feedbackId)

  if (error) throw error
  await logAuditAction(adminUserId, 'feedback_replied', 'feedback', feedbackId, { reply_length: reply.length })
}

export async function updateFeedbackStatus(
  adminId: string,
  feedbackId: string,
  status: 'new' | 'read' | 'replied' | 'resolved',
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId)

  if (error) throw error
  await logAuditAction(adminId, 'feedback_status_changed', 'feedback', feedbackId, { new_status: status })
}

// ─── Custom Planes (moderation) ──────────────────────────────────────────────

export async function getAdminCustomPlanes(): Promise<AdminCustomPlane[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('custom_planes')
    .select('id, user_id, name, type_line, oracle_text, chaos_text, is_public, image_path, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as AdminCustomPlane[]
}

export async function adminDeleteCustomPlane(adminId: string, planeId: string, planeName: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('custom_planes')
    .delete()
    .eq('id', planeId)

  if (error) throw error
  await logAuditAction(adminId, 'plane_deleted', 'custom_plane', planeId, { plane_name: planeName })
}

// ─── System Announcements ───────────────────────────────────────────────────

export async function getActiveAnnouncements(): Promise<SystemAnnouncement[]> {
  const sb = supabase()
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('system_announcements')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SystemAnnouncement[]
}

export async function getAllAnnouncements(): Promise<SystemAnnouncement[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('system_announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SystemAnnouncement[]
}

export async function createAnnouncement(
  adminId: string,
  message: string,
  type: AnnouncementType,
  expiresAt: string | null,
): Promise<void> {
  const cleanMessage = validateRequired(sanitizeText(message, 500), 'Announcement message')
  const validTypes: AnnouncementType[] = ['info', 'warning', 'maintenance', 'update']
  if (!validTypes.includes(type)) throw new Error('Invalid announcement type')

  const sb = supabase()
  const { error } = await sb
    .from('system_announcements')
    .insert({
      message: cleanMessage,
      type,
      is_active: true,
      created_by: adminId,
      expires_at: expiresAt,
    })

  if (error) throw error
  await logAuditAction(adminId, 'announcement_created', 'announcement', 'new', { type, message_preview: message.slice(0, 50) })
}

export async function updateAnnouncement(
  adminId: string,
  announcementId: string,
  updates: { message?: string; type?: AnnouncementType; is_active?: boolean; expires_at?: string | null },
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('system_announcements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', announcementId)

  if (error) throw error
  await logAuditAction(adminId, 'announcement_updated', 'announcement', announcementId, updates)
}

export async function deleteAnnouncement(adminId: string, announcementId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('system_announcements')
    .delete()
    .eq('id', announcementId)

  if (error) throw error
  await logAuditAction(adminId, 'announcement_deleted', 'announcement', announcementId, {})
}
