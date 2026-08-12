'use client'

import { useState } from 'react'

import { PlayerSlotSheet } from './player-slot-sheet'
import type { RosterSlot } from '@/lib/game/roster'
import type { Friend } from '@/lib/pods/types'

interface PlayerRosterProps {
  roster: RosterSlot[]
  /** Shows the archenemy pill. Off for plain Planechase. */
  archenemyMode: boolean
  designatedArchenemyId: string | null
  friends: Friend[]
  onDesignate: (playerId: string) => void
  onPickFriend: (slotId: string, friend: Friend) => void
  onRename: (slotId: string, name: string) => void
  onRemove: (slotId: string) => void
  onMove: (from: number, to: number) => void
  onAdd: () => string
  onRandomize: () => void
}

/**
 * Who is at the table, in play order.
 *
 * One list for every mode, replacing the player-count buttons, the pod member
 * checkboxes, and the editable local names that used to be three separate ideas
 * on the setup screen. Membership is participation: someone not playing tonight
 * comes off the roster rather than being unchecked.
 *
 * The order controls stay visible because reordering is a repeated action.
 * Everything rarer — swapping in a friend, renaming, removing — lives behind
 * tapping the name, which keeps the row inside a 375px screen.
 */
export function PlayerRoster({
  roster,
  archenemyMode,
  designatedArchenemyId,
  friends,
  onDesignate,
  onPickFriend,
  onRename,
  onRemove,
  onMove,
  onAdd,
  onRandomize,
}: PlayerRosterProps) {
  const [openSlotId, setOpenSlotId] = useState<string | null>(null)
  const openSlot = roster.find((slot) => slot.id === openSlotId) ?? null
  const first = roster[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Players — tap a name to change
        </label>
        {roster.length > 1 && (
          <button
            onClick={onRandomize}
            className="text-[12px] text-[var(--color-accent)] hover:underline font-medium shrink-0 cursor-pointer"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            🎲 Randomize
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {roster.map((slot, index) => {
          const isArchenemy = slot.id === designatedArchenemyId
          return (
            <li
              key={slot.id}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
                isArchenemy
                  ? 'border-[var(--color-cta)]/50 bg-[var(--color-cta)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              <span
                className="w-6 h-6 shrink-0 rounded-full bg-[var(--color-accent-deep)] text-white text-[12px] font-bold flex items-center justify-center"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {index + 1}
              </span>

              <button
                onClick={() => setOpenSlotId(slot.id)}
                aria-label={`Change player ${index + 1}, ${slot.display_name}`}
                className="flex-1 min-w-0 truncate text-left text-[14px] text-[var(--color-text)] cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {slot.display_name}
              </button>

              {archenemyMode && (
                <button
                  onClick={() => onDesignate(slot.id)}
                  aria-pressed={isArchenemy}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    isArchenemy
                      ? 'border-[var(--color-cta)] text-[var(--color-cta)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isArchenemy ? 'Archenemy' : 'Make archenemy'}
                </button>
              )}

              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                  className="w-6 h-5 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
                  aria-label={`Move ${slot.display_name} up`}
                >
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  disabled={index === roster.length - 1}
                  onClick={() => onMove(index, index + 1)}
                  className="w-6 h-5 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
                  aria-label={`Move ${slot.display_name} down`}
                >
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button
        onClick={() => setOpenSlotId(onAdd())}
        className="w-full h-10 rounded-xl text-[13px] font-semibold border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/40 transition-all cursor-pointer"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        + Add player
      </button>

      <p
        className="text-[11px] text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {roster.length} player{roster.length !== 1 ? 's' : ''}
        {roster.length > 1 && first ? ` · ${first.display_name} goes first` : ''}
      </p>

      {openSlot && (
        <PlayerSlotSheet
          slot={openSlot}
          friends={friends}
          rosteredIds={roster.map((s) => s.id)}
          onPickFriend={(friend) => onPickFriend(openSlot.id, friend)}
          onRename={(name) => onRename(openSlot.id, name)}
          onRemove={() => onRemove(openSlot.id)}
          onClose={() => setOpenSlotId(null)}
        />
      )}
    </div>
  )
}
