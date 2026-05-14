'use client'

import { useEffect, useState } from 'react'
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
      setTimeout(() => setCurrentIndex((i) => i + 1), 300)
    }, 2500)

    return () => clearTimeout(timer)
  }, [currentIndex, achievementKeys.length, onDone])

  if (currentIndex >= achievementKeys.length) return null

  const def = ACHIEVEMENT_MAP.get(achievementKeys[currentIndex])
  if (!def) return null

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="flex items-center gap-3 px-5 py-3 rounded-[12px] bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/30">
        <span className="text-[28px]">{def.icon}</span>
        <div>
          <p className="text-[11px] uppercase tracking-wide opacity-80" style={{ fontFamily: 'var(--font-body)' }}>
            Achievement Unlocked
          </p>
          <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            {def.name}
          </p>
        </div>
      </div>
    </div>
  )
}
