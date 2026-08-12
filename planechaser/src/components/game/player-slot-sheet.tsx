'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'

import type { RosterSlot } from '@/lib/game/roster'
import type { Friend } from '@/lib/pods/types'

/** Above this many friends the list needs a filter to stay usable on a phone. */
const FILTER_THRESHOLD = 8

interface PlayerSlotSheetProps {
  slot: RosterSlot
  friends: Friend[]
  /** Ids already on the roster — offering them again would duplicate a player. */
  rosteredIds: string[]
  onPickFriend: (friend: Friend) => void
  onRename: (name: string) => void
  onRemove: () => void
  onClose: () => void
}

/**
 * What one roster slot can become: a friend, a typed-in name, or nothing.
 *
 * Pod slots only offer removal. Their name belongs to that account's profile,
 * so letting the host rewrite it here would show one player a name the owner
 * never chose, and swapping a pod member for a friend in place would quietly
 * drop someone from a pod game.
 */
export function PlayerSlotSheet({
  slot,
  friends,
  rosteredIds,
  onPickFriend,
  onRename,
  onRemove,
  onClose,
}: PlayerSlotSheetProps) {
  const [filter, setFilter] = useState('')
  const [typedName, setTypedName] = useState(slot.source === 'guest' ? slot.display_name : '')

  const editable = slot.source === 'guest'

  const available = useMemo(
    () => friends.filter((f) => f.user_id === slot.id || !rosteredIds.includes(f.user_id)),
    [friends, rosteredIds, slot.id],
  )

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return available
    return available.filter((f) => f.display_name.toLowerCase().includes(query))
  }, [available, filter])

  function commitName() {
    const trimmed = typedName.trim()
    if (trimmed) onRename(trimmed)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Change ${slot.display_name}`}
          className="w-full max-w-[480px] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-x border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] text-[var(--color-accent)] uppercase tracking-widest font-bold"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {slot.display_name}
            </p>
            <button
              onClick={onClose}
              className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Close
            </button>
          </div>

          {slot.source === 'pod' ? (
            <p
              className="text-[12px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              This player is in the pod. Their name comes from their profile.
            </p>
          ) : (
            <>
              {available.length > 0 ? (
                <div className="space-y-2">
                  <p
                    className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Friends
                  </p>

                  {available.length > FILTER_THRESHOLD && (
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search friends"
                      aria-label="Search friends"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                  )}

                  <ul className="space-y-1.5">
                    {visible.map((friend) => (
                      <li key={friend.user_id}>
                        <button
                          onClick={() => {
                            onPickFriend(friend)
                            onClose()
                          }}
                          className="w-full text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[14px] text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]/50 cursor-pointer"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {friend.display_name}
                        </button>
                      </li>
                    ))}
                    {visible.length === 0 && (
                      <li
                        className="text-[12px] text-[var(--color-text-muted)] px-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        No friends match that.
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p
                  className="text-[12px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {friends.length === 0 ? (
                    <>
                      No friends yet.{' '}
                      <Link href="/friends" className="text-[var(--color-accent)] hover:underline">
                        Add some
                      </Link>{' '}
                      to fill seats by name.
                    </>
                  ) : (
                    'Every friend is already at the table.'
                  )}
                </p>
              )}

              {editable && (
                <div className="space-y-2">
                  <label
                    className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium block"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Or type a name
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value.slice(0, 40))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitName()
                      }}
                      placeholder={slot.display_name}
                      aria-label="Player name"
                      maxLength={40}
                      className="flex-1 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <button
                      onClick={commitName}
                      className="px-4 rounded-xl bg-[var(--color-accent-deep)] text-white text-[13px] font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => {
              onRemove()
              onClose()
            }}
            className="w-full rounded-xl border border-[var(--color-destructive)]/40 px-4 py-2.5 text-[13px] text-[var(--color-destructive)] transition-colors hover:bg-[var(--color-destructive)]/10 cursor-pointer"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Remove from this game
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
