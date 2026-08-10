'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MailOpen, MessageSquareReply, CheckCheck, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useMyMessages,
  useMarkMessagesRead,
  useMessageSourceFeedback,
} from '@/hooks/useMessages'
import { countUnread, unreadIds, sourceFeedbackIds } from '@/lib/messages/inbox'
import { useAppStore } from '@/store/app-store'
import type { InboxMessage } from '@/lib/messages/types'

function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MessagesPage() {
  const user = useAppStore((s) => s.user)
  const { data: messages, isLoading } = useMyMessages()
  const markRead = useMarkMessagesRead()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const feedbackIds = useMemo(() => sourceFeedbackIds(messages ?? []), [messages])
  const { data: sourceFeedback } = useMessageSourceFeedback(feedbackIds)

  // The query already returns unread-first, newest-first.
  const ordered = messages ?? []
  const unreadCount = countUnread(ordered)

  function handleToggle(message: InboxMessage) {
    const opening = expandedId !== message.id
    setExpandedId(opening ? message.id : null)
    if (opening && !message.readAt) {
      markRead.mutate([message.id])
    }
  }

  function handleMarkAllRead() {
    const ids = unreadIds(messages ?? [])
    if (ids.length > 0) markRead.mutate(ids)
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Sign in to read your messages.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 px-4 py-8 max-w-[520px] mx-auto w-full space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1
            className="text-[26px] font-bold title-gradient tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Messages
          </h1>
          <p
            className="text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'Messages from the PlaneChaser team'}
          </p>
        </motion.div>

        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={handleMarkAllRead}
              disabled={markRead.isPending}
              className="text-[12px] gap-1.5"
            >
              <CheckCheck size={14} /> Mark all read
            </Button>
          </div>
        )}

        {isLoading && (
          <p
            className="text-center text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Loading messages…
          </p>
        )}

        {!isLoading && ordered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-text-muted)]">
            <Inbox size={32} strokeWidth={1.5} />
            <p className="text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
              No messages yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {ordered.map((message) => {
            const isExpanded = expandedId === message.id
            const isUnread = !message.readAt
            const source = message.sourceId ? sourceFeedback?.get(message.sourceId) : undefined
            const Icon = message.kind === 'feedback_reply'
              ? MessageSquareReply
              : isUnread ? Mail : MailOpen

            return (
              <button
                key={message.id}
                onClick={() => handleToggle(message)}
                aria-expanded={isExpanded}
                className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                  isUnread
                    ? 'border-[var(--color-accent)]/40 bg-[var(--color-surface)]/70'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={16}
                    className="shrink-0 mt-0.5"
                    style={{
                      color: isUnread ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[13px] truncate ${isUnread ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {message.subject
                          ?? (message.kind === 'feedback_reply'
                            ? 'Reply to your feedback'
                            : 'Message from the team')}
                      </span>
                      <span
                        className="text-[10px] text-[var(--color-text-muted)] shrink-0"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {formatSentAt(message.sentAt)}
                      </span>
                    </div>

                    <p
                      className={`text-[12px] leading-relaxed text-[var(--color-text-secondary)] ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {message.body}
                    </p>

                    {isExpanded && source && (
                      <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-3 space-y-1">
                        <p
                          className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          Your feedback · {source.category}
                        </p>
                        <p
                          className="text-[12px] leading-relaxed text-[var(--color-text-muted)] whitespace-pre-wrap"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {source.message}
                        </p>
                      </div>
                    )}

                    {message.senderName && (
                      <p
                        className="text-[10px] text-[var(--color-text-muted)] pt-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        from {message.senderName}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}
