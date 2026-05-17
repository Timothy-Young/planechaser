'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { DieRoll } from '@/lib/game/types'

interface RollHistoryPopoverProps {
  rolls: DieRoll[]
  playerName: string
  open: boolean
  onClose: () => void
}

const RESULT_DISPLAY: Record<string, { symbol: string; color: string }> = {
  blank: { symbol: '·', color: '#64748b' },
  planeswalk: { symbol: '✦', color: '#c084fc' },
  chaos: { symbol: '🌀', color: '#ef4444' },
}

export function RollHistoryPopover({ rolls, playerName, open, onClose }: RollHistoryPopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-xl"
          >
            <p
              className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {playerName}&apos;s Rolls
            </p>
            {rolls.length === 0 ? (
              <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                No rolls yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rolls.map((roll, i) => {
                  const display = RESULT_DISPLAY[roll.result]
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span className="text-[16px]" style={{ color: display.color }}>
                        {display.symbol}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                        #{i + 1}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
