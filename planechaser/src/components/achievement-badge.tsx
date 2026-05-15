'use client'

import { ACHIEVEMENT_MAP } from '@/lib/achievements/definitions'

interface AchievementBadgeProps {
  achievementKey: string
  earnedAt: string
}

export function AchievementBadge({ achievementKey, earnedAt }: AchievementBadgeProps) {
  const def = ACHIEVEMENT_MAP.get(achievementKey)
  if (!def) return null

  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all group">
      <span className="text-[22px] group-hover:scale-110 transition-transform">{def.icon}</span>
      <p className="text-[9px] font-bold text-[var(--color-text)] text-center leading-tight tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
        {def.name}
      </p>
      <p className="text-[8px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
        {new Date(earnedAt).toLocaleDateString()}
      </p>
    </div>
  )
}
