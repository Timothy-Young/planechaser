'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Player } from '@/lib/game/types'

interface LifeTrackerProps {
  players: Player[]
  archenemyId: string
  life: Record<string, number>
  eliminatedPlayerIds: string[]
  onAdjust: (playerId: string, delta: number) => void
  onSet: (playerId: string, value: number) => void
  onEliminate: (playerId: string) => void
  onRestore: (playerId: string) => void
}

const DELTAS = [-5, -1, 1, 5]

/**
 * Life totals for an Archenemy game: 40 for the archenemy, 20 per hero.
 *
 * Reaching 0 never eliminates anyone on its own — it only offers the prompt.
 * The host stays in control, and elimination remains reversible.
 */
export function LifeTracker({
  players,
  archenemyId,
  life,
  eliminatedPlayerIds,
  onAdjust,
  onSet,
  onEliminate,
  onRestore,
}: LifeTrackerProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((player) => {
          const total = life[player.id] ?? 0
          const isArchenemy = player.id === archenemyId
          const isEliminated = eliminatedPlayerIds.includes(player.id)
          const isOpen = openId === player.id

          return (
            <button
              key={player.id}
              onClick={() => setOpenId(isOpen ? null : player.id)}
              aria-expanded={isOpen}
              className={`px-3 py-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${
                isArchenemy
                  ? 'border-[var(--color-cta)]/50 bg-[var(--color-cta)]/10'
                  : 'border-[var(--color-border)] bg-white/5'
              } ${isEliminated ? 'opacity-40' : ''} ${isOpen ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
            >
              <span
                className="text-[12px] text-[var(--color-text-muted)] max-w-[90px] truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {player.display_name}
              </span>
              <span
                className={`text-[14px] font-bold ${
                  total <= 0 ? 'text-[var(--color-cta)]' : 'text-[var(--color-text)]'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {total}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {openId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <LifePad
              playerId={openId}
              total={life[openId] ?? 0}
              isEliminated={eliminatedPlayerIds.includes(openId)}
              onAdjust={onAdjust}
              onSet={onSet}
              onEliminate={onEliminate}
              onRestore={onRestore}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface LifePadProps {
  playerId: string
  total: number
  isEliminated: boolean
  onAdjust: (playerId: string, delta: number) => void
  onSet: (playerId: string, value: number) => void
  onEliminate: (playerId: string) => void
  onRestore: (playerId: string) => void
}

function LifePad({
  playerId,
  total,
  isEliminated,
  onAdjust,
  onSet,
  onEliminate,
  onRestore,
}: LifePadProps) {
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const value = Number.parseInt(draft, 10)
    if (Number.isFinite(value)) onSet(playerId, value)
    setDraft('')
  }

  return (
    <div className="mt-2 p-3 rounded-lg border border-[var(--color-border)] bg-white/5 space-y-2">
      <div className="flex gap-2 justify-center">
        {DELTAS.map((delta) => (
          <button
            key={delta}
            onClick={() => onAdjust(playerId, delta)}
            className="w-12 h-10 rounded-lg border border-[var(--color-border)] bg-white/5 hover:bg-white/10 text-[13px] text-[var(--color-text)] transition-colors cursor-pointer"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center justify-center">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft()
          }}
          placeholder="Set"
          aria-label="Set life total"
          className="w-20 h-9 px-2 rounded-lg border border-[var(--color-border)] bg-transparent text-[13px] text-[var(--color-text)] text-center"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <button
          onClick={commitDraft}
          disabled={draft === ''}
          className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-white/5 hover:bg-white/10 disabled:opacity-40 text-[12px] text-[var(--color-text-muted)] transition-colors cursor-pointer"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Apply
        </button>

        {isEliminated ? (
          <button
            onClick={() => onRestore(playerId)}
            className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-white/5 hover:bg-white/10 text-[12px] text-[var(--color-text-muted)] transition-colors cursor-pointer"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Restore
          </button>
        ) : (
          total <= 0 && (
            <button
              onClick={() => onEliminate(playerId)}
              className="h-9 px-3 rounded-lg border border-[var(--color-cta)]/50 bg-[var(--color-cta)]/10 hover:bg-[var(--color-cta)]/20 text-[12px] text-[var(--color-cta)] transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Eliminate
            </button>
          )
        )}
      </div>
    </div>
  )
}
