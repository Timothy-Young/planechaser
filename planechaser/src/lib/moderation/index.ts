import { scanImage } from './image'
import { scanText } from './text'
import {
  DEFAULT_NSFW_THRESHOLDS,
  ModerationScanError,
  type ModerationStage,
  type ModerationVerdict,
  type NsfwThresholds,
  type PlaneTextFields,
} from './types'
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
 * Runs one scan inside the promise chain and tags anything it throws.
 *
 * Taking a thunk rather than a promise matters: scanText is synchronous, and
 * calling it as an argument would let its throw escape before there is a chain
 * to catch it in.
 */
function staged<T>(stage: ModerationStage, run: () => T | Promise<T>): Promise<T> {
  return (async () => {
    try {
      return await run()
    } catch (error) {
      throw error instanceof ModerationScanError ? error : new ModerationScanError(stage, error)
    }
  })()
}

/**
 * Runs both scans and merges them into one verdict.
 *
 * The two run concurrently: text matching is microseconds and image
 * classification is ~95ms warm, so there is no reason to serialise them, and
 * the caller needs both halves regardless to decide which parts of the form to
 * clear. Both stay in one Promise.all so each has a handler attached and
 * neither surfaces as an unhandled rejection when the other rejects first.
 *
 * Each half is tagged with its stage on the way out. Merging them into one
 * untagged rejection is what let a text-scan failure reach the user as "that
 * image could not be processed".
 */
export async function moderate({
  imageBytes,
  fields,
  thresholds = DEFAULT_NSFW_THRESHOLDS,
}: ModerateInput): Promise<ModerationResult> {
  const [textFields, image] = await Promise.all([
    staged('text', () => scanText(fields)),
    imageBytes ? staged('image', () => scanImage(imageBytes, thresholds)) : Promise.resolve(null),
  ])

  return {
    imageFlagged: image?.flagged ?? false,
    textFields,
    scores: image?.scores ?? null,
  }
}
