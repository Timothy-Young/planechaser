import { scanImage } from './image'
import { scanText } from './text'
import { DEFAULT_NSFW_THRESHOLDS, type ModerationVerdict, type NsfwThresholds, type PlaneTextFields } from './types'
import type { NsfwScores } from './thresholds'

export * from './decide'
export * from './thresholds'
export * from './types'
export { scanText, containsProfanity } from './text'

export interface ModerateInput {
  /** Decoded image bytes, or null when the submission has no art. */
  imageBytes?: Buffer | null
  fields: PlaneTextFields
  thresholds?: NsfwThresholds
}

export interface ModerationResult extends ModerationVerdict {
  /** Present only when an image was scanned. Never returned to the client. */
  scores: NsfwScores | null
}

/**
 * Runs both scans and merges them into one verdict.
 *
 * The two run concurrently: text matching is microseconds and image
 * classification is ~95ms warm, so there is no reason to serialise them, and
 * the caller needs both halves regardless to decide which parts of the form to
 * clear.
 */
export async function moderate({
  imageBytes,
  fields,
  thresholds = DEFAULT_NSFW_THRESHOLDS,
}: ModerateInput): Promise<ModerationResult> {
  const [textFields, image] = await Promise.all([
    Promise.resolve(scanText(fields)),
    imageBytes ? scanImage(imageBytes, thresholds) : Promise.resolve(null),
  ])

  return {
    imageFlagged: image?.flagged ?? false,
    textFields,
    scores: image?.scores ?? null,
  }
}
