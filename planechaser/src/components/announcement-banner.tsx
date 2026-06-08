'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Info, AlertTriangle, Wrench, Sparkles } from 'lucide-react'
import { useActiveAnnouncements } from '@/hooks/useAdmin'
import type { AnnouncementType } from '@/lib/admin/types'

const DISMISSED_KEY = 'planechaser-dismissed-announcements'

function getDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function dismissId(id: string) {
  const ids = getDismissedIds()
  ids.add(id)
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
}

const TYPE_CONFIG: Record<AnnouncementType, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: {
    icon: Info,
    color: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
    border: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
  },
  warning: {
    icon: AlertTriangle,
    color: 'var(--color-gold)',
    bg: 'color-mix(in srgb, var(--color-gold) 8%, transparent)',
    border: 'color-mix(in srgb, var(--color-gold) 25%, transparent)',
  },
  maintenance: {
    icon: Wrench,
    color: 'var(--color-cta)',
    bg: 'color-mix(in srgb, var(--color-cta) 8%, transparent)',
    border: 'color-mix(in srgb, var(--color-cta) 25%, transparent)',
  },
  update: {
    icon: Sparkles,
    color: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
    border: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
  },
}

export function AnnouncementBanner() {
  const { data: announcements } = useActiveAnnouncements()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Load dismissed IDs on mount
  useEffect(() => {
    setDismissedIds(getDismissedIds())
  }, [])

  // Filter to only non-dismissed active announcements
  const visible = useMemo(() => {
    if (!announcements) return []
    return announcements.filter((a) => !dismissedIds.has(a.id))
  }, [announcements, dismissedIds])

  function handleDismiss(id: string) {
    dismissId(id)
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  if (visible.length === 0) return null

  return (
    <div className="w-full z-50 space-y-0">
      {visible.map((announcement) => {
        const config = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info
        const Icon = config.icon

        return (
          <div
            key={announcement.id}
            className="flex items-start gap-3 px-4 py-3 border-b"
            style={{
              background: config.bg,
              borderColor: config.border,
            }}
          >
            <Icon
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: config.color }}
            />
            <p
              className="flex-1 text-[12px] leading-relaxed"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            >
              {announcement.message}
            </p>
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="shrink-0 p-1 rounded-md transition-colors hover:bg-white/10"
              aria-label="Dismiss announcement"
            >
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
