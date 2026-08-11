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

export type ModerationStage = 'text' | 'image'

/**
 * A scan that failed outright, as opposed to one that returned a verdict.
 *
 * The route's answer depends on which scan broke — a failed decode is a bad
 * upload, anything else is a server fault — and it previously had no way to
 * tell, so it blamed the image for every failure, model-init crashes included.
 * `cause` carries the original error so nothing is lost on the way up.
 *
 * Lives here rather than beside `moderate` so importing it costs nothing: this
 * module pulls in no TensorFlow, no sharp, and no model weights.
 */
export class ModerationScanError extends Error {
  constructor(
    readonly stage: ModerationStage,
    cause: unknown,
  ) {
    super(`Moderation ${stage} scan failed.`, { cause })
    this.name = 'ModerationScanError'
  }
}

export function isFlagged(verdict: ModerationVerdict): boolean {
  return verdict.imageFlagged || verdict.textFields.length > 0
}

export const CLEAN_VERDICT: ModerationVerdict = { imageFlagged: false, textFields: [] }
