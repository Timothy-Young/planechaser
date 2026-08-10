export const TEXT_FIELDS = [
  'name',
  'type_line',
  'oracle_text',
  'chaos_text',
  'flavor_text',
] as const

export type TextField = (typeof TEXT_FIELDS)[number]

export type PlaneTextFields = Partial<Record<TextField, string | null | undefined>>

/** nsfwjs class scores, 0–1. Only the three we gate on are modelled. */
export interface NsfwThresholds {
  porn: number
  hentai: number
  sexy: number
}

/**
 * Tuned to tolerate suggestive fantasy art. `Hentai` fires readily on any
 * stylized illustration of a human figure, which describes most Magic art, so
 * a lower bar would reject legitimate cards — and a second rejection costs the
 * user a real strike.
 */
export const DEFAULT_NSFW_THRESHOLDS: NsfwThresholds = {
  porn: 0.7,
  hentai: 0.7,
  sexy: 0.85,
}

/** app_limits keys holding the thresholds, in basis points (that column is INT). */
export const THRESHOLD_LIMIT_KEYS: Record<keyof NsfwThresholds, string> = {
  porn: 'nsfw_porn_threshold_bp',
  hentai: 'nsfw_hentai_threshold_bp',
  sexy: 'nsfw_sexy_threshold_bp',
}

export const COOLDOWN_HOURS_LIMIT_KEY = 'nsfw_cooldown_hours'
export const DEFAULT_COOLDOWN_HOURS = 5

/** Active strikes at which a user is automatically banned. Mirrors addStrike. */
export const STRIKE_BAN_THRESHOLD = 3

export interface ModerationVerdict {
  imageFlagged: boolean
  textFields: TextField[]
}

export function isFlagged(verdict: ModerationVerdict): boolean {
  return verdict.imageFlagged || verdict.textFields.length > 0
}

export const CLEAN_VERDICT: ModerationVerdict = { imageFlagged: false, textFields: [] }
