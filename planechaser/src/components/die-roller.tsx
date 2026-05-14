'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DieResult } from '@/lib/game/types'
import { rollPlanarDie, chaosCost } from '@/lib/game/engine'

const DIE_FACES: DieResult[] = ['blank', 'blank', 'blank', 'blank', 'planeswalk', 'chaos']

const FACE_DISPLAY: Record<DieResult, { symbol: string; label: string; color: string }> = {
  blank: { symbol: '·', label: 'Blank', color: 'var(--color-text-muted)' },
  planeswalk: { symbol: '✦', label: 'Planeswalk!', color: '#3B82F6' },
  chaos: { symbol: '🌀', label: 'Chaos!', color: 'var(--color-cta)' },
}

interface DieRollerProps {
  rollCount: number
  onRoll: (result: DieResult) => void
  disabled?: boolean
}

export function DieRoller({ rollCount, onRoll, disabled }: DieRollerProps) {
  const [rolling, setRolling] = useState(false)
  const [displayFace, setDisplayFace] = useState<DieResult | null>(null)
  const [settled, setSettled] = useState(false)

  const cost = chaosCost(rollCount)

  const handleRoll = useCallback(() => {
    if (rolling || disabled) return

    setRolling(true)
    setSettled(false)

    const finalResult = rollPlanarDie()

    let tick = 0
    const totalTicks = 12
    const interval = setInterval(() => {
      tick++
      setDisplayFace(DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)])

      if (tick >= totalTicks) {
        clearInterval(interval)
        setDisplayFace(finalResult)
        setRolling(false)
        setSettled(true)

        setTimeout(() => {
          onRoll(finalResult)
          setSettled(false)
          setDisplayFace(null)
        }, 1200)
      }
    }, 80)
  }, [rolling, disabled, onRoll])

  const currentFace = displayFace ? FACE_DISPLAY[displayFace] : null

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Die face display */}
      <AnimatePresence mode="wait">
        {currentFace && (
          <motion.div
            key={settled ? 'settled' : 'rolling'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: settled ? [1, 1.15, 1] : 1,
              opacity: 1,
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: settled ? 0.4 : 0.1 }}
            className="flex flex-col items-center"
          >
            <span
              className="text-[64px] leading-none"
              style={{ color: currentFace.color }}
            >
              {currentFace.symbol}
            </span>
            {settled && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[18px] font-bold mt-2"
                style={{ color: currentFace.color, fontFamily: 'var(--font-heading)' }}
              >
                {currentFace.label}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={rolling || disabled}
        className="relative w-20 h-20 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-border)] transition-all active:scale-95 disabled:opacity-50"
        style={{
          boxShadow: rolling ? '0 0 20px var(--color-accent)' : '0 0 8px rgba(124, 58, 237, 0.3)',
        }}
      >
        <motion.div
          animate={rolling ? { rotate: 360 } : { rotate: 0 }}
          transition={rolling ? { duration: 0.4, repeat: Infinity, ease: 'linear' } : {}}
          className="flex items-center justify-center w-full h-full"
        >
          <span className="text-[28px]">🎲</span>
        </motion.div>
      </button>

      {/* Cost indicator */}
      <p
        className="text-[13px] text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {cost === 0 ? 'Free roll' : `Cost: ${cost} mana`}
      </p>
    </div>
  )
}
