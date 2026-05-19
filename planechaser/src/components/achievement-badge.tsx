'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACHIEVEMENT_MAP } from '@/lib/achievements/definitions'

interface AchievementBadgeProps {
  achievementKey: string
  earnedAt: string
}

export function AchievementBadge({ achievementKey, earnedAt }: AchievementBadgeProps) {
  const def = ACHIEVEMENT_MAP.get(achievementKey)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!def) return null

  return (
    <button
      ref={ref}
      onClick={() => setOpen(!open)}
      className="relative flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all group"
    >
      <span className="text-[22px] group-hover:scale-110 transition-transform">{def.icon}</span>
      <p className="text-[9px] font-bold text-[var(--color-text)] text-center leading-tight tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
        {def.name}
      </p>
      <p className="text-[8px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
        {new Date(earnedAt).toLocaleDateString()}
      </p>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-[180px] rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-surface)] backdrop-blur-md shadow-lg p-3 text-center"
          >
            <p className="text-[11px] font-bold text-[var(--color-accent)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {def.name}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
              {def.description}
            </p>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 border-r border-b border-[var(--color-accent)]/30 bg-[var(--color-surface)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
