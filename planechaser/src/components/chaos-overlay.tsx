'use client'

import { motion } from 'framer-motion'
import type { PlaneCard } from '@/lib/game/types'

interface ChaosOverlayProps {
  plane: PlaneCard
  onDismiss: () => void
}

function extractChaosText(oracleText: string): string {
  const chaosMarker = oracleText.indexOf('chaos ensues')
  if (chaosMarker !== -1) {
    const afterMarker = oracleText.slice(chaosMarker + 'chaos ensues'.length)
    const cleaned = afterMarker.replace(/^[\s—\-:]+/, '').trim()
    if (cleaned) return cleaned
  }
  const lines = oracleText.split('\n')
  const chaosLine = lines.find((l) => l.toLowerCase().includes('chaos'))
  if (chaosLine) {
    return chaosLine.replace(/.*chaos ensues[\s—\-:]*/i, '').trim() || chaosLine
  }
  return oracleText
}

export function ChaosOverlay({ plane, onDismiss }: ChaosOverlayProps) {
  const chaosText = extractChaosText(plane.oracle_text)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="relative z-10 max-w-[360px] mx-4 p-8 rounded-2xl border border-red-500/40 bg-red-950/80 backdrop-blur-md text-center space-y-4"
      >
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-[64px] block"
        >
          🌀
        </motion.span>
        <h2
          className="text-2xl font-bold text-red-400 tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          CHAOS!
        </h2>
        <p
          className="text-[15px] text-white/90 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {chaosText}
        </p>
        <p
          className="text-[11px] text-white/40 mt-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Tap anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  )
}
