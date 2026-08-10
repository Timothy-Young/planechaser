'use client'

import type { Player } from '@/lib/game/types'

interface ArchenemyRosterProps {
  players: Player[]
  designatedArchenemyId: string | null
  onDesignate: (playerId: string) => void
  /** Present when the names are local and editable (no pod, no lobby). */
  onRename?: (playerId: string, name: string) => void
}

/**
 * Who is at the table and which of them is the archenemy.
 *
 * A standalone Archenemy game needs a roster even with no pod and no lobby —
 * life is tracked per player, so the heroes have to be named somewhere. When
 * the names come from a pod or a multiplayer session they are fixed, and this
 * is only a designation picker.
 */
export function ArchenemyRoster({
  players,
  designatedArchenemyId,
  onDesignate,
  onRename,
}: ArchenemyRosterProps) {
  return (
    <div className="space-y-2">
      <label
        className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Players — tap to designate the archenemy
      </label>

      <ul className="space-y-2">
        {players.map((player, index) => {
          const isArchenemy = player.id === designatedArchenemyId
          return (
            <li
              key={player.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                isArchenemy
                  ? 'border-[var(--color-cta)]/50 bg-[var(--color-cta)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              {onRename ? (
                <input
                  value={player.display_name}
                  onChange={(e) => onRename(player.id, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  aria-label={`Player ${index + 1} name`}
                  className="flex-1 min-w-0 bg-transparent text-[14px] text-[var(--color-text)] focus:outline-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              ) : (
                <span
                  className="flex-1 min-w-0 truncate text-[14px] text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {player.display_name}
                </span>
              )}

              <button
                onClick={() => onDesignate(player.id)}
                aria-pressed={isArchenemy}
                className={`flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                  isArchenemy
                    ? 'border-[var(--color-cta)] text-[var(--color-cta)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isArchenemy ? 'Archenemy' : 'Make archenemy'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
