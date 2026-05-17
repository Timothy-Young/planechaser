'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { PlaneCard } from '@/lib/game/types'

interface ChaosOverlayProps {
  plane: PlaneCard
  onDismiss: () => void
}

function extractChaosText(oracleText: string): string {
  const lines = oracleText.split('\n')
  const chaosLine = lines.find((l) => l.toLowerCase().includes('chaos ensues'))
  if (chaosLine) {
    const afterMarker = chaosLine.replace(/.*?[Ww]henever you roll chaos[,.]?\s*/i, '').trim()
    if (afterMarker) return afterMarker
    const afterEnsues = chaosLine.replace(/.*chaos ensues[\s—\-:,]*/i, '').trim()
    if (afterEnsues) return afterEnsues
    return chaosLine
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        className="relative z-10 flex flex-col items-center gap-4 mx-4 max-w-[380px]"
      >
        {/* Card image — rotated landscape */}
        <div className="relative w-full aspect-[7/5] rounded-xl overflow-hidden shadow-2xl border border-red-500/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[140%] aspect-[5/7] rotate-90">
              <Image
                src={plane.image_uris.border_crop}
                alt={plane.name}
                fill
                className="object-contain"
                sizes="380px"
                priority
              />
            </div>
          </div>
        </div>

        {/* Chaos text callout */}
        <div className="w-full rounded-xl border border-red-500/40 bg-red-950/90 backdrop-blur-md p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-[24px]"
            >
              🌀
            </motion.span>
            <h2
              className="text-lg font-bold text-red-400 tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Chaos ensues:
            </h2>
          </div>
          <p
            className="text-[14px] text-white/90 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {chaosText}
          </p>
        </div>

        <p
          className="text-[11px] text-white/40"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Tap anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  )
}
