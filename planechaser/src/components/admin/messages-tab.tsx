'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Send, Trash2, Users, User, X, Search, Check } from 'lucide-react'
import {
  useAdminUsers,
  useAdminPods,
  useAdminMessages,
  useSendAdminMessage,
  useDeleteAdminMessage,
} from '@/hooks/useAdmin'
import { useAppLimits } from '@/hooks/useLimits'
import { DEFAULT_LIMITS } from '@/lib/limits/types'
import { useAppStore } from '@/store/app-store'
import type { MessageAudience } from '@/lib/admin/types'

function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MessagesTab() {
  const currentUserId = useAppStore((s) => s.user)?.id ?? ''
  const { data: users } = useAdminUsers()
  const { data: pods } = useAdminPods()
  const { data: messages, isLoading } = useAdminMessages()
  const { data: limits } = useAppLimits()
  const sendMessage = useSendAdminMessage()
  const deleteMessage = useDeleteAdminMessage()

  const bodyMax = limits?.adminMessageBodyMax ?? DEFAULT_LIMITS.adminMessageBodyMax
  const recipientMax = limits?.adminMessageRecipientMax ?? DEFAULT_LIMITS.adminMessageRecipientMax

  const [showCompose, setShowCompose] = useState(false)
  const [audience, setAudience] = useState<MessageAudience>('users')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedPodId, setSelectedPodId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sentNotice, setSentNotice] = useState<string | null>(null)

  const userById = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users],
  )

  const searchResults = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return []
    return (users ?? [])
      .filter((u) => u.display_name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [users, userSearch])

  const selectedPod = (pods ?? []).find((p) => p.id === selectedPodId)

  const recipientCount = audience === 'users'
    ? selectedUserIds.length
    : selectedPod?.memberCount ?? 0

  const canSend =
    body.trim().length > 0 &&
    body.length <= bodyMax &&
    recipientCount > 0 &&
    recipientCount <= recipientMax &&
    !sendMessage.isPending

  function resetForm() {
    setAudience('users')
    setSelectedUserIds([])
    setSelectedPodId('')
    setUserSearch('')
    setSubject('')
    setBody('')
    setError(null)
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
    setUserSearch('')
  }

  async function handleSend() {
    setError(null)
    setSentNotice(null)
    try {
      const result = await sendMessage.mutateAsync({
        adminId: currentUserId,
        subject: subject.trim() || null,
        body,
        audience,
        userIds: audience === 'users' ? selectedUserIds : undefined,
        podId: audience === 'pod' ? selectedPodId : undefined,
      })
      setSentNotice(
        `Sent to ${result.recipient_count} ${result.recipient_count === 1 ? 'person' : 'people'}.`,
      )
      resetForm()
      setShowCompose(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the message.')
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCompose((p) => !p)}
        className="flex items-center gap-2 h-10 px-4 rounded-xl text-[12px] font-semibold border transition-all"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: showCompose ? 'var(--color-accent)' : 'var(--color-border)',
          background: showCompose ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)',
          color: showCompose ? 'var(--color-accent)' : 'var(--color-text)',
        }}
      >
        <Plus size={14} />
        New Message
      </button>

      {sentNotice && !showCompose && (
        <p
          className="text-[11px] text-[var(--color-accent)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {sentNotice}
        </p>
      )}

      {showCompose && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-surface)]/60 p-4 space-y-3"
        >
          {/* Audience toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            {(['users', 'pod'] as const).map((value) => (
              <button
                key={value}
                onClick={() => { setAudience(value); setError(null) }}
                className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  audience === value
                    ? 'bg-[var(--color-accent-deep)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {value === 'users' ? <User size={12} /> : <Users size={12} />}
                {value === 'users' ? 'Specific users' : 'Whole pod'}
              </button>
            ))}
          </div>

          {audience === 'users' ? (
            <div className="space-y-2">
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUserIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full text-[11px] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {userById.get(id)?.display_name ?? 'Unknown user'}
                      <button
                        onClick={() => toggleUser(id)}
                        className="p-0.5 rounded-full hover:bg-white/10"
                        aria-label={`Remove ${userById.get(id)?.display_name ?? 'user'}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name…"
                  className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] pl-7 pr-3 focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] divide-y divide-[var(--color-border)]">
                  {searchResults.map((u) => {
                    const selected = selectedUserIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(u.id)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-left hover:bg-white/5 transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className="text-[var(--color-text)]">{u.display_name}</span>
                        {selected && <Check size={12} className="text-[var(--color-accent)]" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <select
              value={selectedPodId}
              onChange={(e) => setSelectedPodId(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] px-2 focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="">Select a pod…</option>
              {(pods ?? []).map((pod) => (
                <option key={pod.id} value={pod.id}>
                  {pod.name} ({pod.memberCount} {pod.memberCount === 1 ? 'member' : 'members'})
                </option>
              ))}
            </select>
          )}

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 120))}
            placeholder="Subject (optional)"
            maxLength={120}
            className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] px-3 focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, bodyMax))}
            placeholder="Write your message…"
            rows={5}
            maxLength={bodyMax}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] px-3 py-2 resize-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />

          <div className="flex items-center justify-between gap-2">
            <p
              className="text-[10px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {recipientCount > 0
                ? `${recipientCount} ${recipientCount === 1 ? 'recipient' : 'recipients'}`
                : 'No recipients selected'}
              {recipientCount > recipientMax && ` — limit is ${recipientMax}`}
            </p>
            <p
              className="text-[10px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {body.length}/{bodyMax}
            </p>
          </div>

          {error && (
            <p
              className="text-[11px] text-[var(--color-danger,#f87171)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => { resetForm(); setShowCompose(false) }}
              className="h-8 px-3 rounded-lg text-[11px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="h-8 px-4 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Send size={12} />
              {sendMessage.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Sent list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border)] h-[92px] animate-pulse bg-[var(--color-surface)]/40"
            />
          ))}
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message) => {
            const receipts = message.admin_message_recipients ?? []
            const readCount = receipts.filter((r) => r.read_at !== null).length
            const audienceLabel = message.audience === 'pod'
              ? `Pod · ${message.pods?.name ?? 'deleted pod'}`
              : `${receipts.length} ${receipts.length === 1 ? 'user' : 'users'}`

            return (
              <div
                key={message.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    {message.subject && (
                      <p
                        className="text-[12px] font-semibold text-[var(--color-text)] truncate"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {message.subject}
                      </p>
                    )}
                    <p
                      className="text-[12px] text-[var(--color-text-secondary)] whitespace-pre-wrap"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {message.body}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMessage.mutate({ adminId: currentUserId, messageId: message.id })}
                    className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
                    aria-label="Delete message"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div
                  className="flex items-center gap-2 flex-wrap text-[10px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span>{audienceLabel}</span>
                  <span>·</span>
                  <span>{readCount}/{receipts.length} read</span>
                  <span>·</span>
                  <span>{formatSentAt(message.created_at)}</span>
                  {message.kind === 'feedback_reply' && (
                    <>
                      <span>·</span>
                      <span className="text-[var(--color-accent)]">feedback reply</span>
                    </>
                  )}
                  {message.profiles?.display_name && (
                    <>
                      <span>·</span>
                      <span>by {message.profiles.display_name}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p
          className="text-[12px] text-[var(--color-text-muted)] py-8 text-center"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          No messages sent yet.
        </p>
      )}
    </div>
  )
}
