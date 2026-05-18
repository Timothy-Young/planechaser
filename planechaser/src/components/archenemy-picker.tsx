'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ArchenemyPickerProps {
  eligiblePlayers: { id: string; display_name: string; conquered_count: number }[]
  lastArchenemyId: string | null
  onSelect: (playerId: string) => void
  onCancel: () => void
}

export function ArchenemyPicker({
  eligiblePlayers,
  lastArchenemyId,
  onSelect,
  onCancel,
}: ArchenemyPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const hasBackToBack = lastArchenemyId && eligiblePlayers.some((p) => p.id === lastArchenemyId)

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3
          className="text-[16px] font-bold text-[var(--color-cta)] tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Designate Archenemy
        </h3>
        {hasBackToBack && (
          <p
            className="text-[12px] text-[var(--color-gold)] font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {eligiblePlayers.find((p) => p.id === lastArchenemyId)?.display_name} was the Archenemy last game. Consider designating a different player.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {eligiblePlayers.map((player) => {
          const isLastArchenemy = player.id === lastArchenemyId
          const isSelected = selectedId === player.id
          return (
            <motion.button
              key={player.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedId(player.id)}
              className={`w-full h-12 rounded-xl border px-4 flex items-center justify-between transition-colors ${
                isSelected
                  ? 'border-[var(--color-cta)] bg-[var(--color-cta)]/15 text-[var(--color-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                {player.display_name}
                {isLastArchenemy && (
                  <span className="ml-2 text-[11px] text-[var(--color-gold)] font-medium">
                    (last archenemy)
                  </span>
                )}
              </span>
              <span
                className="text-[12px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {player.conquered_count} planes
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
        >
          Cancel
        </Button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => selectedId && onSelect(selectedId)}
          disabled={!selectedId}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[var(--color-cta)] to-[var(--color-destructive)] text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ fontFamily: 'var(--font-heading)', color: '#fff' }}
        >
          Confirm
        </motion.button>
      </div>
    </div>
  )
}
