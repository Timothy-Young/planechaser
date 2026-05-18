'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { ConqueredPlane } from '@/lib/pods/types'

interface PlanePickerProps {
  title: string
  subtitle: string
  conquests: ConqueredPlane[]
  onSelect: (conquestId: string) => void
  onSkip: () => void
  skipLabel?: string
  selectLabel?: string
}

export function PlanePicker({
  title,
  subtitle,
  conquests,
  onSelect,
  onSkip,
  skipLabel = 'Skip',
  selectLabel = 'Confirm',
}: PlanePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2
          className="text-[20px] font-bold text-[var(--color-cta)] tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h2>
        <p
          className="text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {subtitle}
        </p>
      </div>

      {conquests.length > 0 ? (
        <div className="max-h-[40vh] overflow-y-auto space-y-2">
          {conquests.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                selectedId === c.id
                  ? 'border-2 border-[var(--color-cta)] bg-[var(--color-cta)]/10'
                  : 'border border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              <img
                src={c.plane_image_uri}
                alt={c.plane_name}
                className="w-16 aspect-[3/2] rounded object-cover"
              />
              <span
                className="text-[13px] font-semibold text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {c.plane_name}
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <p
          className="text-center text-[13px] text-[var(--color-text-muted)] py-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          No conquered planes available.
        </p>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onSkip}
          variant="outline"
          className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
        >
          {skipLabel}
        </Button>
        {conquests.length > 0 && (
          <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => selectedId && onSelect(selectedId)}
              disabled={!selectedId}
              className="w-full h-11 rounded-xl hover:opacity-90 disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                background: 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
              }}
            >
              {selectLabel}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
