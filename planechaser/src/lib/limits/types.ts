/** Keys in the `app_limits` table (migrations 026, 029). */
export const LIMIT_KEYS = {
  feedbackCooldownSeconds: 'feedback_cooldown_seconds',
  feedbackDailyMax: 'feedback_daily_max',
  customPlanesMax: 'custom_planes_max',
  adminMessageRecipientMax: 'admin_message_recipient_max',
  adminMessageBodyMax: 'admin_message_body_max',
} as const

export interface AppLimits {
  feedbackCooldownSeconds: number
  feedbackDailyMax: number
  customPlanesMax: number
  adminMessageRecipientMax: number
  adminMessageBodyMax: number
}

/**
 * Used when `app_limits` can't be read (offline, cold start). Mirrors the
 * seeded values in migration 026 — the database is still the authority, these
 * only keep the UI from blocking on a failed fetch.
 */
export const DEFAULT_LIMITS: AppLimits = {
  feedbackCooldownSeconds: 120,
  feedbackDailyMax: 20,
  customPlanesMax: 25,
  adminMessageRecipientMax: 100,
  adminMessageBodyMax: 2000,
}

/** Roles exempt from all limits — matches the trigger checks in migration 026. */
export const LIMIT_EXEMPT_ROLES = ['owner', 'admin', 'mod'] as const

export interface FeedbackUsage {
  /** ISO timestamp of the user's most recent submission, or null if none. */
  lastSubmittedAt: string | null
  /** Submissions in the trailing 24 hours. */
  countLast24h: number
}
