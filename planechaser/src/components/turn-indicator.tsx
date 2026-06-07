'use client'

import { motion } from 'framer-motion'

interface TurnIndicatorProps {
  playerName: string
  onNextTurn?: () => void
  showNextTurn?: boolean
  eliminatedCount?: number
}

export function TurnIndicator({ playerName, onNextTurn, showNextTurn = true, eliminatedCount = 0 }: TurnIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 w-full"
    >
      <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10">
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
        <p
          className="text-base font-semibold text-white tracking-wide"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {playerName}&apos;s Turn
        </p>
        {eliminatedCount > 0 && (
          <span className="text-[10px] text-red-400 font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20" style={{ fontFamily: 'var(--font-heading)' }}>
            {eliminatedCount} out
          </span>
        )}
      </div>

      {showNextTurn && onNextTurn && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNextTurn}
          className="w-full max-w-[280px] py-3.5 px-6 rounded-2xl text-base font-bold tracking-wide
                     bg-[var(--color-cta)] text-white
                     border border-[var(--color-cta)]/60
                     shadow-[0_0_20px_rgba(var(--cta-rgb),0.3)]
                     transition-all active:shadow-[0_0_30px_rgba(var(--cta-rgb),0.5)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Next Turn →
        </motion.button>
      )}
    </motion.div>
  )
}
