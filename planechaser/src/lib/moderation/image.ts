import { createRequire } from 'node:module'
import path from 'node:path'

import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { load, type NSFWJS, type PredictionType } from 'nsfwjs/core'
import { MobileNetV2Model } from 'nsfwjs/models/mobilenet_v2'
import sharp from 'sharp'

import { exceedsThresholds, type NsfwScores } from './thresholds'
import { DEFAULT_NSFW_THRESHOLDS, type NsfwThresholds } from './types'

export { exceedsThresholds, type NsfwScores }

/** MobileNetV2's input size. */
const INPUT_SIZE = 224

/**
 * Import only the mobilenet_v2 bundle, never the nsfwjs package index. The
 * index registers all three default models, which would pull the 29MB
 * inception_v3 bundle into the serverless function; mobilenet_v2 alone is
 * 3.5MB. Both ship inside the npm package as base64 weights, so nothing is
 * fetched over the network at runtime.
 */
let modelPromise: Promise<NSFWJS> | null = null

async function initBackend(): Promise<void> {
  // The WASM backend loads the model in ~330ms and classifies in ~95ms, versus
  // ~1750ms and ~1400ms for the pure-JS CPU backend, with identical scores.
  // @tensorflow/tfjs-node would be faster still, but its native addon is ~150MB
  // and competes with Vercel's 250MB unzipped function limit. Those numbers are
  // also why a CPU fallback is safe to take rather than failing the request:
  // with `maxDuration = 30` on the route, ~1750ms load plus ~1400ms classify is
  // a slow success, not a hard failure.

  // setBackend signals a failed WASM init two different ways depending on the
  // cause — it rejects for some (a missing asset) and resolves false for
  // others (no WASM support in the runtime) — so both are caught here and
  // treated as the same "fall back to cpu" outcome. Locating the binaries sits
  // inside the try for the same reason: `require.resolve` throws
  // MODULE_NOT_FOUND when the bundler's file tracing misses tfjs-backend-wasm's
  // package.json, and from out here that escaped initBackend entirely — past
  // the fallback, out through getModel, and back to the user as "that image
  // could not be processed" on an image that was never the problem.
  // `@tensorflow/tfjs` registers the cpu backend by default in Node, so no
  // extra dependency is needed for the fallback itself. A cpu failure is not
  // swallowed: if it also fails, this throws, and the caller's cache reset plus
  // the route's logging pick it up from there.
  let wasmReady: boolean
  let wasmError: unknown = null
  try {
    const require = createRequire(import.meta.url)
    const wasmDir = path.join(
      path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json')),
      'dist',
    )
    setWasmPaths(`${wasmDir}${path.sep}`)
    wasmReady = await tf.setBackend('wasm')
  } catch (error) {
    wasmReady = false
    wasmError = error
  }
  if (!wasmReady) {
    console.warn('[moderation] wasm backend unavailable, falling back to cpu', wasmError)
    await tf.setBackend('cpu')
  }

  await tf.ready()
}

function getModel(): Promise<NSFWJS> {
  if (modelPromise) return modelPromise

  const attempt = initBackend().then(() =>
    load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] }),
  )
  // A rejected promise is otherwise cached for the life of the lambda
  // instance, so one failed cold start would fail every later request it
  // serves. Reset the cache on rejection so the next call gets a fresh
  // attempt — guarded so a retry already in flight (a newer promise already
  // stored in modelPromise) can't be clobbered by this handler firing late for
  // a superseded attempt. This also attaches a handler to `attempt` itself, so
  // it does not surface as an unhandled rejection; callers still observe the
  // rejection through the promise returned below.
  attempt.catch(() => {
    if (modelPromise === attempt) modelPromise = null
  })

  modelPromise = attempt
  return modelPromise
}

function toScores(predictions: PredictionType[]): NsfwScores {
  const scores: NsfwScores = {}
  for (const prediction of predictions) {
    scores[prediction.className] = prediction.probability
  }
  return scores
}

export async function scoreImage(bytes: Buffer): Promise<NsfwScores> {
  const model = await getModel()

  const { data, info } = await sharp(bytes)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32')
  try {
    return toScores(await model.classify(tensor))
  } finally {
    tensor.dispose()
  }
}

/**
 * Returns whether the image should be blocked.
 *
 * A decode failure propagates rather than counting as a violation — a corrupt
 * upload says nothing about its content, and failing closed here would hand
 * strikes to users whose file was merely truncated. The route rejects those as
 * invalid uploads with no penalty.
 */
export async function scanImage(
  bytes: Buffer,
  thresholds: NsfwThresholds = DEFAULT_NSFW_THRESHOLDS,
): Promise<{ flagged: boolean; scores: NsfwScores }> {
  const scores = await scoreImage(bytes)
  return { flagged: exceedsThresholds(scores, thresholds), scores }
}
