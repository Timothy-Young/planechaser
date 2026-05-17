'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface TurnIndicatorProps {
  playerName: string
  rollCost: number
}

export function TurnIndicator({ playerName, rollCost }: TurnIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 border border-white/10"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
        <p
          className="text-sm font-medium text-white"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {playerName}&apos;s Turn
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={rollCost}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="text-xs text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Cost: {rollCost} mana
        </motion.p>
      </AnimatePresence>
    </motion.div>
  )
}
