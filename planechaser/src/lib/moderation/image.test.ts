// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { scoreImage } from './image'

/**
 * Smoke test only. This deliberately does not assert nsfwjs's accuracy — that
 * is the model's business, not ours, and pinning it to specific probabilities
 * would break on any upstream model change for no benefit.
 *
 * What it does prove is the part we own: the model resolves from the bundled
 * npm weights with no network access, the WASM backend initialises, and the
 * sharp decode produces a tensor the model actually accepts.
 */
async function syntheticJpeg(width = 640, height = 360): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3)
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 37) % 256
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg().toBuffer()
}

describe('scoreImage', () => {
  it('returns the five nsfw classes summing to 1', async () => {
    const scores = await scoreImage(await syntheticJpeg())

    expect(Object.keys(scores).sort()).toEqual(['Drawing', 'Hentai', 'Neutral', 'Porn', 'Sexy'])

    const total = Object.values(scores).reduce((sum, value) => sum + value, 0)
    expect(total).toBeCloseTo(1, 3)

    for (const value of Object.values(scores)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  }, 60_000)

  it('handles a non-square image without throwing', async () => {
    const scores = await scoreImage(await syntheticJpeg(1024, 300))
    expect(Object.keys(scores)).toHaveLength(5)
  }, 60_000)

  it('rejects bytes that are not a decodable image', async () => {
    await expect(scoreImage(Buffer.from('not an image'))).rejects.toThrow()
  }, 60_000)
})
