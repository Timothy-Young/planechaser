'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ConqueredPlane } from '@/lib/pods/types'

interface DethroneDialogProps {
  archenemyName: string
  conquests: ConqueredPlane[]
  onSteal: (planeId: string) => void
  onSkip: () => void
}

export function DethroneDialog({ archenemyName, conquests, onSteal, onSkip }: DethroneDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[420px] rounded-[12px] border border-[var(--color-cta)] bg-[var(--color-surface)] p-6 space-y-5 max-h-[80vh] flex flex-col">
        <div className="text-center space-y-1">
          <h2 className="text-[20px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Archenemy Dethroned!
          </h2>
          <p className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            The team defeated {archenemyName}. Vote to steal one of their conquered planes.
          </p>
        </div>

        {conquests.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {conquests.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors ${
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
                <span className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {c.plane_name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-[13px] text-[var(--color-text-muted)] py-4" style={{ fontFamily: 'var(--font-body)' }}>
            {archenemyName} has no conquered planes to steal.
          </p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onSkip}
            variant="outline"
            className="flex-1 h-11 border-[var(--color-border)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            Skip
          </Button>
          {conquests.length > 0 && (
            <Button
              onClick={() => selectedId && onSteal(selectedId)}
              disabled={!selectedId}
              className="flex-1 h-11 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
            >
              Steal Plane
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
