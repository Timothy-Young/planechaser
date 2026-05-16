'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DieResult } from '@/lib/game/types'
import { rollPlanarDie, chaosCost } from '@/lib/game/engine'
import { audioManager } from '@/lib/audio/audio-manager'

const DIE_FACES: DieResult[] = ['blank', 'blank', 'blank', 'blank', 'planeswalk', 'chaos']

const FACE_DISPLAY: Record<DieResult, { symbol: string; label: string; color: string; glow: string }> = {
  blank: { symbol: '·', label: 'Blank', color: '#64748b', glow: 'none' },
  planeswalk: { symbol: '✦', label: 'Planeswalk!', color: '#c084fc', glow: '0 0 30px rgba(192, 132, 252, 0.6)' },
  chaos: { symbol: '🌀', label: 'CHAOS!', color: '#ef4444', glow: '0 0 30px rgba(239, 68, 68, 0.6)' },
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
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const cost = chaosCost(rollCount)

  const handleRoll = useCallback(() => {
    if (rolling || disabled) return

    setRolling(true)
    setSettled(false)
    audioManager.playSFX('dieRoll', 1, 1500)

    const finalResult = rollPlanarDie()

    let tick = 0
    const totalTicks = 20
    const interval = setInterval(() => {
      tick++
      setDisplayFace(DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)])
      setRotateX(Math.random() * 360)
      setRotateY(Math.random() * 360)

      if (tick >= totalTicks) {
        clearInterval(interval)
        setDisplayFace(finalResult)
        setRotateX(0)
        setRotateY(0)
        setRolling(false)
        setSettled(true)

        if (finalResult === 'chaos') audioManager.playChaosLayered()
        else if (finalResult === 'planeswalk') audioManager.playSFX('planeswalk')
        else audioManager.playSFX('blank')

        setTimeout(() => {
          onRoll(finalResult)
          setSettled(false)
          setDisplayFace(null)
        }, 1600)
      }
    }, 75)
  }, [rolling, disabled, onRoll])

  const currentFace = displayFace ? FACE_DISPLAY[displayFace] : null

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        {currentFace && (
          <motion.div
            key={settled ? 'settled' : 'rolling'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: settled ? [1, 1.2, 1] : 1,
              opacity: 1,
            }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: settled ? 0.5 : 0.08 }}
            className="flex flex-col items-center"
          >
            <span
              className="text-[56px] md:text-[72px] leading-none drop-shadow-lg"
              style={{ color: currentFace.color, textShadow: currentFace.glow }}
            >
              {currentFace.symbol}
            </span>
            {settled && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[16px] md:text-[20px] font-bold mt-2 tracking-wider"
                style={{ color: currentFace.color, fontFamily: 'var(--font-heading)', textShadow: currentFace.glow }}
              >
                {currentFace.label}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="die-container">
        <motion.button
          onClick={handleRoll}
          disabled={rolling || disabled}
          animate={{
            rotateX: rolling ? rotateX : 0,
            rotateY: rolling ? rotateY : 0,
          }}
          transition={{ duration: 0.07 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] transition-all disabled:opacity-40"
          style={{
            boxShadow: rolling
              ? '0 0 30px var(--color-glow-purple), inset 0 0 15px rgba(168, 85, 247, 0.1)'
              : '0 4px 20px rgba(0,0,0,0.4), 0 0 10px rgba(168, 85, 247, 0.15)',
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        </motion.button>
      </div>

      <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
        {cost === 0 ? 'Free roll' : `Cost: ${cost} mana`}
      </p>
    </div>
  )
}
