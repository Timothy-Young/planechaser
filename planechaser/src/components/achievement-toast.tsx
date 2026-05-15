'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACHIEVEMENT_MAP } from '@/lib/achievements/definitions'

interface AchievementToastProps {
  achievementKeys: string[]
  onDone: () => void
}

export function AchievementToast({ achievementKeys, onDone }: AchievementToastProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (currentIndex >= achievementKeys.length) {
      onDone()
      return
    }

    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => setCurrentIndex((i) => i + 1), 400)
    }, 2500)

    return () => clearTimeout(timer)
  }, [currentIndex, achievementKeys.length, onDone])

  if (currentIndex >= achievementKeys.length) return null

  const def = ACHIEVEMENT_MAP.get(achievementKeys[currentIndex])
  if (!def) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] text-white glow-purple">
            <span className="text-[28px]">{def.icon}</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-80" style={{ fontFamily: 'var(--font-body)' }}>
                Achievement Unlocked
              </p>
              <p className="text-[15px] font-bold tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                {def.name}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
