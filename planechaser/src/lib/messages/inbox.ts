import type { InboxMessage } from './types'

/** Unread messages first, newest first inside each group. */
export function orderInbox(messages: InboxMessage[]): InboxMessage[] {
  const byNewest = [...messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  return [
    ...byNewest.filter((m) => m.readAt === null),
    ...byNewest.filter((m) => m.readAt !== null),
  ]
}

export function countUnread(messages: InboxMessage[]): number {
  return messages.filter((m) => m.readAt === null).length
}

export function unreadIds(messages: InboxMessage[]): string[] {
  return messages.filter((m) => m.readAt === null).map((m) => m.id)
}

/** Feedback ids referenced by `feedback_reply` messages, deduplicated. */
export function sourceFeedbackIds(messages: InboxMessage[]): string[] {
  const ids = messages
    .filter((m) => m.kind === 'feedback_reply' && m.sourceId !== null)
    .map((m) => m.sourceId as string)
  return [...new Set(ids)]
}

/**
 * Like `sanitizeText` in the admin layer, but keeps line breaks — a message can
 * run to several paragraphs, and collapsing every whitespace run would flatten
 * it. Runs of three or more newlines are squeezed to a single blank line.
 */
export function sanitizeMultiline(input: string, maxLength: number): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}
