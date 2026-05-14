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
    <div className="flex flex-col items-center gap-1 p-2 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
      <span className="text-[24px]">{def.icon}</span>
      <p className="text-[10px] font-bold text-[var(--color-text)] text-center leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        {def.name}
      </p>
      <p className="text-[8px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
        {new Date(earnedAt).toLocaleDateString()}
      </p>
    </div>
  )
}
