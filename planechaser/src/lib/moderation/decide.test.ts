import { describe, expect, it } from 'vitest'

import {
  applyVerdict,
  checkPreconditions,
  decideOutcome,
  formatCooldown,
  thresholdsFromLimits,
  type ModeratorState,
} from './decide'
import { exceedsThresholds } from './thresholds'
import { CLEAN_VERDICT, DEFAULT_NSFW_THRESHOLDS, type ModerationVerdict } from './types'

const NOW = new Date('2026-08-10T12:00:00.000Z')

function state(overrides: Partial<ModeratorState> = {}): ModeratorState {
  return {
    isBanned: false,
    ackRequired: false,
    cooldownUntil: null,
    planeCount: 3,
    planeMax: 25,
    ...overrides,
  }
}

const FLAGGED_IMAGE: ModerationVerdict = { imageFlagged: true, textFields: [] }
const FLAGGED_TEXT: ModerationVerdict = { imageFlagged: false, textFields: ['flavor_text'] }

const CREATE = { acknowledged: false, countsAgainstLimit: true }
const CREATE_ACKED = { acknowledged: true, countsAgainstLimit: true }
const EDIT_ACKED = { acknowledged: true, countsAgainstLimit: false }

describe('checkPreconditions', () => {
  it('rejects a banned user before anything else', () => {
    const banned = state({ isBanned: true, cooldownUntil: '2030-01-01T00:00:00.000Z' })
    expect(checkPreconditions(banned, CREATE_ACKED, NOW)).toEqual({ kind: 'banned' })
  })

  it('rejects an active cooldown', () => {
    const until = '2026-08-10T17:00:00.000Z'
    expect(checkPreconditions(state({ cooldownUntil: until }), CREATE, NOW)).toEqual({
      kind: 'cooldown',
      until,
    })
  })

  it('ignores an expired cooldown', () => {
    const expired = state({ cooldownUntil: '2026-08-10T11:59:59.000Z' })
    expect(checkPreconditions(expired, CREATE, NOW)).toBeNull()
  })

  it('rejects a missing acknowledgment once the flag is set', () => {
    expect(checkPreconditions(state({ ackRequired: true }), CREATE, NOW)).toEqual({
      kind: 'ack_missing',
    })
  })

  it('accepts a present acknowledgment', () => {
    expect(checkPreconditions(state({ ackRequired: true }), CREATE_ACKED, NOW)).toBeNull()
  })

  it('rejects a create at the plane cap', () => {
    const full = state({ planeCount: 25, planeMax: 25 })
    expect(checkPreconditions(full, CREATE, NOW)).toEqual({ kind: 'at_limit', count: 25, max: 25 })
  })

  it('lets an edit through at the plane cap', () => {
    const full = state({ planeCount: 25, planeMax: 25 })
    expect(checkPreconditions(full, EDIT_ACKED, NOW)).toBeNull()
  })

  it('checks cooldown before the acknowledgment, so a cooling-down user cannot be re-struck', () => {
    const cooling = state({ ackRequired: true, cooldownUntil: '2026-08-10T17:00:00.000Z' })
    expect(checkPreconditions(cooling, CREATE, NOW)).toMatchObject({ kind: 'cooldown' })
  })
})

describe('applyVerdict', () => {
  it('allows a clean submission', () => {
    expect(applyVerdict(state(), CLEAN_VERDICT)).toEqual({ kind: 'allow' })
  })

  it('warns on a first offence', () => {
    expect(applyVerdict(state(), FLAGGED_IMAGE)).toEqual({ kind: 'warn', verdict: FLAGGED_IMAGE })
  })

  it('escalates to a violation once acknowledgment is required', () => {
    expect(applyVerdict(state({ ackRequired: true }), FLAGGED_TEXT)).toEqual({
      kind: 'violation',
      verdict: FLAGGED_TEXT,
    })
  })

  it('allows a clean submission even after the flag is set', () => {
    expect(applyVerdict(state({ ackRequired: true }), CLEAN_VERDICT)).toEqual({ kind: 'allow' })
  })
})

describe('decideOutcome — full state machine', () => {
  const rows: Array<[string, ModeratorState, typeof CREATE, ModerationVerdict, string]> = [
    ['banned', state({ isBanned: true }), CREATE_ACKED, CLEAN_VERDICT, 'banned'],
    ['cooldown', state({ cooldownUntil: '2026-08-10T17:00:00.000Z' }), CREATE, CLEAN_VERDICT, 'cooldown'],
    ['ack missing', state({ ackRequired: true }), CREATE, CLEAN_VERDICT, 'ack_missing'],
    ['at cap', state({ planeCount: 25, planeMax: 25 }), CREATE, CLEAN_VERDICT, 'at_limit'],
    ['clean, no ack required', state(), CREATE, CLEAN_VERDICT, 'allow'],
    ['flagged, no ack required', state(), CREATE, FLAGGED_IMAGE, 'warn'],
    ['clean, ack required', state({ ackRequired: true }), CREATE_ACKED, CLEAN_VERDICT, 'allow'],
    ['flagged, ack required', state({ ackRequired: true }), CREATE_ACKED, FLAGGED_TEXT, 'violation'],
  ]

  it.each(rows)('%s', (_label, s, input, verdict, expected) => {
    expect(decideOutcome(s, input, verdict, NOW).kind).toBe(expected)
  })
})

describe('exceedsThresholds', () => {
  it('passes an ordinary illustration', () => {
    const scores = { Neutral: 0.61, Porn: 0.23, Drawing: 0.12, Hentai: 0.03, Sexy: 0.02 }
    expect(exceedsThresholds(scores)).toBe(false)
  })

  it.each([
    ['Porn', { Porn: 0.7 }],
    ['Hentai', { Hentai: 0.7 }],
    ['Sexy', { Sexy: 0.85 }],
  ])('blocks at the exact %s boundary', (_class, scores) => {
    expect(exceedsThresholds(scores)).toBe(true)
  })

  it.each([
    ['Porn', { Porn: 0.6999 }],
    ['Hentai', { Hentai: 0.6999 }],
    ['Sexy', { Sexy: 0.8499 }],
  ])('passes just below the %s boundary', (_class, scores) => {
    expect(exceedsThresholds(scores)).toBe(false)
  })

  it('tolerates suggestive art below the Sexy bar', () => {
    expect(exceedsThresholds({ Sexy: 0.84, Neutral: 0.1, Porn: 0.05 })).toBe(false)
  })

  it('treats absent classes as zero', () => {
    expect(exceedsThresholds({})).toBe(false)
  })

  it('honours custom thresholds', () => {
    expect(exceedsThresholds({ Sexy: 0.6 }, { ...DEFAULT_NSFW_THRESHOLDS, sexy: 0.5 })).toBe(true)
  })
})

describe('thresholdsFromLimits', () => {
  it('converts basis points to 0–1', () => {
    expect(
      thresholdsFromLimits({
        nsfw_porn_threshold_bp: 5000,
        nsfw_hentai_threshold_bp: 6000,
        nsfw_sexy_threshold_bp: 9000,
      }),
    ).toEqual({ porn: 0.5, hentai: 0.6, sexy: 0.9 })
  })

  it('falls back to defaults for missing or nonsensical values', () => {
    expect(
      thresholdsFromLimits({ nsfw_porn_threshold_bp: 0, nsfw_hentai_threshold_bp: 99_999 }),
    ).toEqual(DEFAULT_NSFW_THRESHOLDS)
  })
})

describe('formatCooldown', () => {
  it.each([
    ['2026-08-10T16:12:00.000Z', '4h 12m'],
    ['2026-08-10T17:00:00.000Z', '5h'],
    ['2026-08-10T12:12:00.000Z', '12m'],
    ['2026-08-10T11:00:00.000Z', 'under a minute'],
  ])('formats %s as %s', (until, expected) => {
    expect(formatCooldown(until, NOW)).toBe(expected)
  })
})
