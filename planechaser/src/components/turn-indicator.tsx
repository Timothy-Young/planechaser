'use client'

import { motion } from 'framer-motion'

interface TurnIndicatorProps {
  playerName: string
}

export function TurnIndicator({ playerName }: TurnIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
    >
      <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
      <p
        className="text-sm font-medium text-white"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {playerName}&apos;s Turn
      </p>
    </motion.div>
  )
}
