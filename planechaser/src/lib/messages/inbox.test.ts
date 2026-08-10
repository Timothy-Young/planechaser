import { describe, it, expect } from 'vitest'
import {
  orderInbox,
  countUnread,
  unreadIds,
  sourceFeedbackIds,
  sanitizeMultiline,
} from './inbox'
import type { InboxMessage } from './types'

function message(overrides: Partial<InboxMessage> & { id: string }): InboxMessage {
  return {
    subject: null,
    body: 'body',
    kind: 'admin_message',
    sourceId: null,
    sentAt: '2026-08-01T00:00:00.000Z',
    readAt: null,
    senderName: null,
    ...overrides,
  }
}

describe('orderInbox', () => {
  it('puts unread before read', () => {
    const ordered = orderInbox([
      message({ id: 'read', readAt: '2026-08-02T00:00:00.000Z' }),
      message({ id: 'unread' }),
    ])

    expect(ordered.map((m) => m.id)).toEqual(['unread', 'read'])
  })

  it('sorts newest first inside each group', () => {
    const ordered = orderInbox([
      message({ id: 'old-unread', sentAt: '2026-08-01T00:00:00.000Z' }),
      message({ id: 'new-unread', sentAt: '2026-08-05T00:00:00.000Z' }),
      message({ id: 'old-read', sentAt: '2026-07-01T00:00:00.000Z', readAt: '2026-07-02T00:00:00.000Z' }),
      message({ id: 'new-read', sentAt: '2026-07-20T00:00:00.000Z', readAt: '2026-07-21T00:00:00.000Z' }),
    ])

    expect(ordered.map((m) => m.id)).toEqual([
      'new-unread',
      'old-unread',
      'new-read',
      'old-read',
    ])
  })

  it('does not mutate its input', () => {
    const input = [
      message({ id: 'a', sentAt: '2026-08-01T00:00:00.000Z' }),
      message({ id: 'b', sentAt: '2026-08-09T00:00:00.000Z' }),
    ]
    orderInbox(input)

    expect(input.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('countUnread / unreadIds', () => {
  const messages = [
    message({ id: 'a' }),
    message({ id: 'b', readAt: '2026-08-02T00:00:00.000Z' }),
    message({ id: 'c' }),
  ]

  it('counts only messages with no read timestamp', () => {
    expect(countUnread(messages)).toBe(2)
    expect(countUnread([])).toBe(0)
  })

  it('returns the ids of exactly those messages', () => {
    expect(unreadIds(messages)).toEqual(['a', 'c'])
  })
})

describe('sourceFeedbackIds', () => {
  it('collects feedback ids from replies only, deduplicated', () => {
    const ids = sourceFeedbackIds([
      message({ id: 'a', kind: 'feedback_reply', sourceId: 'fb-1' }),
      message({ id: 'b', kind: 'feedback_reply', sourceId: 'fb-1' }),
      message({ id: 'c', kind: 'feedback_reply', sourceId: 'fb-2' }),
      message({ id: 'd', kind: 'admin_message', sourceId: 'fb-3' }),
      message({ id: 'e', kind: 'feedback_reply', sourceId: null }),
    ])

    expect(ids).toEqual(['fb-1', 'fb-2'])
  })

  it('returns an empty list when there are no replies', () => {
    expect(sourceFeedbackIds([message({ id: 'a' })])).toEqual([])
  })
})

describe('sanitizeMultiline', () => {
  it('keeps paragraph breaks', () => {
    expect(sanitizeMultiline('First line.\n\nSecond line.', 100))
      .toBe('First line.\n\nSecond line.')
  })

  it('squeezes runs of three or more newlines to one blank line', () => {
    expect(sanitizeMultiline('a\n\n\n\nb', 100)).toBe('a\n\nb')
  })

  it('collapses runs of spaces and tabs without touching newlines', () => {
    expect(sanitizeMultiline('a   b\n c\td', 100)).toBe('a b\n c d')
  })

  it('normalizes CRLF', () => {
    expect(sanitizeMultiline('a\r\nb', 100)).toBe('a\nb')
  })

  it('trims surrounding whitespace and enforces the cap', () => {
    expect(sanitizeMultiline('  padded  ', 100)).toBe('padded')
    expect(sanitizeMultiline('abcdef', 3)).toBe('abc')
  })
})
