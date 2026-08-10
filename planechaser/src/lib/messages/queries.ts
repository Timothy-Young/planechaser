import { createClient } from '@/lib/supabase/client'
import { orderInbox } from './inbox'
import type { InboxMessage, MessageSourceFeedback } from './types'

/** Shape returned by the receipt-to-message join before it is flattened. */
interface RawReceipt {
  read_at: string | null
  admin_messages: {
    id: string
    subject: string | null
    body: string
    kind: InboxMessage['kind']
    source_id: string | null
    created_at: string
    profiles: { display_name: string } | null
  }
}

/**
 * The signed-in user's inbox, unread first and newest first within each group.
 *
 * `!inner` plus the RLS policy on `admin_messages` drops soft-deleted messages:
 * the policy requires `deleted_at IS NULL` for recipients, so a deleted message
 * has no joinable row. The unread badge is derived from this same list rather
 * than counted separately, so the badge can never disagree with what the inbox
 * shows.
 */
export async function getMyMessages(userId: string): Promise<InboxMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('admin_message_recipients')
    .select(`
      read_at,
      admin_messages!inner (
        id, subject, body, kind, source_id, created_at,
        profiles ( display_name )
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  const rows = (data ?? []) as unknown as RawReceipt[]

  return orderInbox(
    rows.map((row) => ({
      id: row.admin_messages.id,
      subject: row.admin_messages.subject,
      body: row.admin_messages.body,
      kind: row.admin_messages.kind,
      sourceId: row.admin_messages.source_id,
      sentAt: row.admin_messages.created_at,
      readAt: row.read_at,
      senderName: row.admin_messages.profiles?.display_name ?? null,
    })),
  )
}

/**
 * Marks messages read. Idempotent server-side — a message already read keeps
 * its original timestamp. Returns how many receipts actually changed.
 */
export async function markMessagesRead(messageIds: string[]): Promise<number> {
  if (messageIds.length === 0) return 0

  const supabase = createClient()
  const { data, error } = await supabase.rpc('mark_messages_read', {
    p_message_ids: messageIds,
  })

  if (error) throw error
  return (data as number | null) ?? 0
}

/**
 * The feedback entries a set of `feedback_reply` messages responded to, so the
 * inbox can show what the user originally wrote. Own-feedback RLS applies.
 */
export async function getMessageSourceFeedback(
  feedbackIds: string[],
): Promise<Map<string, MessageSourceFeedback>> {
  if (feedbackIds.length === 0) return new Map()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('id, category, message, created_at')
    .in('id', feedbackIds)

  if (error) throw error

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        category: row.category as string,
        message: row.message as string,
        createdAt: row.created_at as string,
      },
    ]),
  )
}
