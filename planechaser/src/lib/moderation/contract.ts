import type { TextField } from './types'

/** Body of POST /api/custom-planes. */
export interface CreatePlaneRequest {
  /** Object path in custom-plane-images-pending, or null for a plane with no art. */
  pending_image_path?: string | null
  name: string
  type_line?: string
  oracle_text?: string
  chaos_text?: string
  flavor_text?: string | null
  is_public?: boolean
  acknowledged?: boolean
}

/** Body of PATCH /api/custom-planes. */
export interface UpdatePlaneRequest extends CreatePlaneRequest {
  id: string
  /** True to drop the existing image without supplying a new one. */
  remove_image?: boolean
}

export type ModerationStage = 'warning' | 'violation'

/**
 * 422 body.
 *
 * Deliberately carries neither the matched word nor the nsfwjs scores.
 * Returning either turns this endpoint into a free oracle for tuning evasion
 * against the exact thresholds; naming the affected field gives an honest user
 * everything they need to fix the submission.
 */
export interface ModerationRejection {
  error: 'nsfw_detected'
  stage: ModerationStage
  image_flagged: boolean
  text_fields: TextField[]
  ack_required: boolean
  cooldown_until?: string
  strikes?: { active: number; max: number }
  banned?: boolean
  /**
   * True when detection ran and blocked the plane but no penalty was recorded
   * because the caller is the owner. Owner-only, so that moderation can be
   * tested without self-inflicting a lockout: BannedGuard replaces the whole
   * app for a banned user, including the admin dashboard, so an owner who
   * auto-banned themselves could not unban without direct SQL access.
   * Admins and mods are deliberately NOT exempt.
   */
  simulated?: boolean
}

export type PlaneErrorCode =
  | 'unauthenticated'
  | 'banned'
  | 'cooldown'
  | 'ack_required'
  | 'at_limit'
  | 'invalid_request'
  | 'invalid_image'
  | 'not_found'
  | 'server_error'

export interface PlaneErrorResponse {
  error: PlaneErrorCode
  message: string
  cooldown_until?: string
  count?: number
  max?: number
}

export function isModerationRejection(value: unknown): value is ModerationRejection {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { error?: unknown }).error === 'nsfw_detected'
  )
}
