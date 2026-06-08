export type UserRole = 'owner' | 'admin' | 'mod' | 'user'

export interface AdminUser {
  id: string
  display_name: string
  role: UserRole
  strike_count: number
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null
  created_at: string
  friend_code: string
  avatar_url: string | null
  // Aggregated stats
  games_hosted: number
  conquests: number
  custom_planes_count: number
  feedback_count: number
}

export interface AdminFeedback {
  id: string
  user_id: string | null
  user_email: string | null
  category: 'bug' | 'feature' | 'general' | 'other'
  message: string
  status: 'new' | 'read' | 'replied' | 'resolved'
  admin_reply: string | null
  admin_reply_at: string | null
  admin_reply_by: string | null
  created_at: string
  // Joined
  profiles: { display_name: string } | null
}

export interface AdminCustomPlane {
  id: string
  user_id: string
  name: string
  type_line: string
  oracle_text: string
  chaos_text: string
  is_public: boolean
  image_path: string | null
  created_at: string
  // Joined
  profiles: { display_name: string } | null
}

export interface AppStats {
  total_users: number
  total_games: number
  total_conquests: number
  total_custom_planes: number
  total_feedback: number
  new_feedback: number
  banned_users: number
  users_last_7_days: number
  games_last_7_days: number
}

export type AuditAction =
  | 'role_change'
  | 'strike_added'
  | 'user_banned'
  | 'user_unbanned'
  | 'plane_deleted'
  | 'feedback_replied'
  | 'feedback_status_changed'

export interface AuditLogEntry {
  id: string
  admin_id: string
  action: AuditAction
  target_type: 'user' | 'custom_plane' | 'feedback'
  target_id: string
  details: Record<string, unknown>
  created_at: string
  // Joined
  profiles: { display_name: string } | null
}
