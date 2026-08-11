// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { moderate, ModerationScanError } from './index'

/**
 * Covers the stage tagging that decides what the route tells the user.
 *
 * The image case runs the real decode path — undecodable bytes reaching sharp —
 * so the `image` tag is proven against a genuine failure rather than a
 * simulated one. No mocked model client.
 */
const CLEAN_FIELDS = {
  name: 'The Shattered Vale',
  type_line: 'Plane — Custom',
  oracle_text: 'Players cannot untap more than one land during their untap step.',
}

describe('moderate', () => {
  it('tags a failed image scan with stage "image"', async () => {
    const failure = moderate({
      imageBytes: Buffer.from('not an image'),
      fields: CLEAN_FIELDS,
    })

    await expect(failure).rejects.toBeInstanceOf(ModerationScanError)
    await expect(failure).rejects.toMatchObject({ stage: 'image' })
    await expect(failure.catch((error: ModerationScanError) => error.cause)).resolves.toBeDefined()
  }, 60_000)

  it('returns a clean verdict with no scores when there is no image', async () => {
    await expect(moderate({ imageBytes: null, fields: CLEAN_FIELDS })).resolves.toEqual({
      imageFlagged: false,
      textFields: [],
      scores: null,
    })
  })

  it('names the offending text field and still reports no scores', async () => {
    await expect(
      moderate({
        imageBytes: null,
        fields: { ...CLEAN_FIELDS, flavor_text: 'fuck it' },
      }),
    ).resolves.toEqual({
      imageFlagged: false,
      textFields: ['flavor_text'],
      scores: null,
    })
  })
})
