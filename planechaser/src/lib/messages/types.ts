/** Message kinds written by `send_admin_message` (migration 029). */
export type AdminMessageKind = 'admin_message' | 'feedback_reply'

/** How a message was addressed. Delivery is decided by the receipt rows. */
export type MessageAudience = 'users' | 'pod'

/** One message as the recipient sees it — a receipt joined to its message. */
export interface InboxMessage {
  id: string
  subject: string | null
  body: string
  kind: AdminMessageKind
  /** `feedback.id` when `kind` is `feedback_reply`, otherwise null. */
  sourceId: string | null
  sentAt: string
  readAt: string | null
  senderName: string | null
}

/** The feedback a `feedback_reply` message was written in response to. */
export interface MessageSourceFeedback {
  id: string
  category: string
  message: string
  createdAt: string
}
