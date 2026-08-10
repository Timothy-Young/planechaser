import { DEFAULT_NSFW_THRESHOLDS, type NsfwThresholds } from './types'

/** nsfwjs class name to probability. Absent classes are treated as zero. */
export type NsfwScores = Record<string, number>

/**
 * Kept separate from image.ts so tests and callers can reason about the
 * decision without loading TensorFlow and sharp.
 */
export function exceedsThresholds(
  scores: NsfwScores,
  thresholds: NsfwThresholds = DEFAULT_NSFW_THRESHOLDS,
): boolean {
  return (
    (scores.Porn ?? 0) >= thresholds.porn ||
    (scores.Hentai ?? 0) >= thresholds.hentai ||
    (scores.Sexy ?? 0) >= thresholds.sexy
  )
}
