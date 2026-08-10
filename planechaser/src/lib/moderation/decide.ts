import {
  isFlagged,
  type ModerationVerdict,
  type NsfwThresholds,
  DEFAULT_NSFW_THRESHOLDS,
  THRESHOLD_LIMIT_KEYS,
} from './types'

export interface ModeratorState {
  isBanned: boolean
  ackRequired: boolean
  /** ISO timestamp, or null when no cooldown is in effect. */
  cooldownUntil: string | null
  planeCount: number
  planeMax: number
}

export interface SubmissionInput {
  acknowledged: boolean
  /** Creates count against the plane cap; edits do not. */
  countsAgainstLimit: boolean
}

export type PreconditionFailure =
  | { kind: 'banned' }
  | { kind: 'cooldown'; until: string }
  | { kind: 'ack_missing' }
  | { kind: 'at_limit'; count: number; max: number }

export type ModerationOutcome =
  | PreconditionFailure
  | { kind: 'allow' }
  | { kind: 'warn'; verdict: ModerationVerdict }
  | { kind: 'violation'; verdict: ModerationVerdict }

/**
 * Checks everything that can be decided without looking at the content.
 *
 * Runs before any scanning: a banned or cooling-down user should not cost us a
 * model inference, and must not be able to accrue a second strike from a
 * request that was never going to be accepted.
 */
export function checkPreconditions(
  state: ModeratorState,
  input: SubmissionInput,
  now: Date = new Date(),
): PreconditionFailure | null {
  if (state.isBanned) return { kind: 'banned' }

  if (state.cooldownUntil) {
    const until = new Date(state.cooldownUntil)
    if (until.getTime() > now.getTime()) {
      return { kind: 'cooldown', until: state.cooldownUntil }
    }
  }

  if (state.ackRequired && !input.acknowledged) return { kind: 'ack_missing' }

  if (input.countsAgainstLimit && state.planeCount >= state.planeMax) {
    return { kind: 'at_limit', count: state.planeCount, max: state.planeMax }
  }

  return null
}

/**
 * Applies the scan result. A first offence warns and makes the acknowledgment
 * sticky; any offence after that is a violation carrying a strike.
 */
export function applyVerdict(
  state: ModeratorState,
  verdict: ModerationVerdict,
): ModerationOutcome {
  if (!isFlagged(verdict)) return { kind: 'allow' }
  return state.ackRequired ? { kind: 'violation', verdict } : { kind: 'warn', verdict }
}

/** Composes both halves. The route runs them separately so it can scan in between. */
export function decideOutcome(
  state: ModeratorState,
  input: SubmissionInput,
  verdict: ModerationVerdict,
  now: Date = new Date(),
): ModerationOutcome {
  return checkPreconditions(state, input, now) ?? applyVerdict(state, verdict)
}

export function remainingCooldownMs(until: string, now: Date = new Date()): number {
  return Math.max(0, new Date(until).getTime() - now.getTime())
}

/** "4h 12m", "12m", "under a minute" — for the cooldown banner and messages. */
export function formatCooldown(until: string, now: Date = new Date()): string {
  const totalMinutes = Math.ceil(remainingCooldownMs(until, now) / 60_000)
  if (totalMinutes <= 0) return 'under a minute'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Converts the basis-point values stored in app_limits into 0–1 thresholds.
 * Missing or malformed keys fall back to the compiled-in defaults rather than
 * failing the request.
 */
export function thresholdsFromLimits(limits: Record<string, number>): NsfwThresholds {
  const read = (key: string, fallback: number) => {
    const raw = limits[key]
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0 || raw > 10_000) {
      return fallback
    }
    return raw / 10_000
  }

  return {
    porn: read(THRESHOLD_LIMIT_KEYS.porn, DEFAULT_NSFW_THRESHOLDS.porn),
    hentai: read(THRESHOLD_LIMIT_KEYS.hentai, DEFAULT_NSFW_THRESHOLDS.hentai),
    sexy: read(THRESHOLD_LIMIT_KEYS.sexy, DEFAULT_NSFW_THRESHOLDS.sexy),
  }
}
