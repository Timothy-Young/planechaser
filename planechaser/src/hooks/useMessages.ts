'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyMessages,
  markMessagesRead,
  getMessageSourceFeedback,
} from '@/lib/messages/queries'
import { countUnread } from '@/lib/messages/inbox'
import { useAppStore } from '@/store/app-store'

const MESSAGES_STALE = 60_000

/** The signed-in user's inbox. Empty and idle when signed out. */
export function useMyMessages() {
  const user = useAppStore((s) => s.user)

  return useQuery({
    queryKey: ['messages', 'list', user?.id],
    queryFn: () => getMyMessages(user!.id),
    enabled: !!user,
    staleTime: MESSAGES_STALE,
  })
}

/**
 * Unread count for the nav badge. Derived from the same query the inbox uses,
 * so the badge and the list can never disagree.
 */
export function useUnreadMessageCount(): number {
  const { data } = useMyMessages()
  return useMemo(() => countUnread(data ?? []), [data])
}

/** Original feedback for any `feedback_reply` messages in the inbox. */
export function useMessageSourceFeedback(feedbackIds: string[]) {
  const key = [...feedbackIds].sort().join(',')

  return useQuery({
    queryKey: ['messages', 'source-feedback', key],
    queryFn: () => getMessageSourceFeedback(feedbackIds),
    enabled: feedbackIds.length > 0,
    staleTime: MESSAGES_STALE,
  })
}

export function useMarkMessagesRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (messageIds: string[]) => markMessagesRead(messageIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'list'] })
    },
  })
}
