'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { ArchenemySide } from '@/lib/game/types'

interface StandaloneArchenemyEndDialogProps {
  archenemyName: string
  turnNumber: number
  onClose: () => void
  onConfirm: (winner: ArchenemySide) => void
}

/**
 * End-of-game for a standalone Archenemy game.
 *
 * Deliberately not `ArchenemyEndDialog`: that one transfers conquered planes
 * between pod members, and a standalone game visits no planes and needs no pod.
 * All that is recorded here is which side won.
 */
export function StandaloneArchenemyEndDialog({
  archenemyName,
  turnNumber,
  onClose,
  onConfirm,
}: StandaloneArchenemyEndDialogProps) {
  const [winner, setWinner] = useState<ArchenemySide | null>(null)

  const options: { side: ArchenemySide; label: string; blurb: string }[] = [
    {
      side: 'archenemy',
      label: `${archenemyName} wins`,
      blurb: 'Every hero has lost the game.',
    },
    {
      side: 'team',
      label: 'The heroes win',
      blurb: 'The archenemy has lost the game.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[380px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <h2
            className="text-[20px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            End Game
          </h2>
          <p
            className="text-[13px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {turnNumber} archenemy turn{turnNumber === 1 ? '' : 's'} played
          </p>
        </div>

        <div className="space-y-2">
          <p
            className="text-[12px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest text-center"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Who won?
          </p>
          {options.map((option) => {
            const isSelected = winner === option.side
            return (
              <motion.button
                key={option.side}
                whileTap={{ scale: 0.97 }}
                onClick={() => setWinner(option.side)}
                aria-pressed={isSelected}
                className="w-full rounded-xl border text-left px-4 py-3 transition-colors cursor-pointer"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: isSelected
                    ? 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))'
                    : 'var(--color-bg)',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isSelected ? '#fff' : 'var(--color-text)',
                }}
              >
                <span className="block text-[15px]">{option.label}</span>
                <span className={`block text-[12px] ${isSelected ? 'opacity-80' : 'text-[var(--color-text-muted)]'}`}>
                  {option.blurb}
                </span>
              </motion.button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            Keep Playing
          </Button>
          <Button
            onClick={() => onConfirm(winner ?? 'team')}
            className="flex-1 h-11 bg-[var(--color-cta)] hover:opacity-90 text-[var(--color-text)] rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Game
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
