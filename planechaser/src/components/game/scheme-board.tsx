'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { SchemeCard } from '@/components/scheme-card'
import type { InMotionScheme } from '@/lib/game/types'

interface SchemeBoardProps {
  schemesInMotion: InMotionScheme[]
  onDismiss: (instanceId: string) => void
  /**
   * Render the newest scheme as a full card above the list. The standalone
   * board has the room; the bottom sheet in a combined game does not.
   */
  featureNewest?: boolean
}

/**
 * Every scheme currently face up.
 *
 * Schemes persist here until the table clears them, and there is no cap — a
 * long game can leave a stack of ongoing schemes running at once, so the list
 * is vertical and compact rather than a horizontal rail that runs off a phone
 * screen.
 */
export function SchemeBoard({ schemesInMotion, onDismiss, featureNewest = false }: SchemeBoardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (schemesInMotion.length === 0) {
    return (
      <p
        className="text-[12px] text-[var(--color-text-muted)] text-center py-6"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        No schemes in motion.
      </p>
    )
  }

  const [newest, ...rest] = schemesInMotion
  const listed = featureNewest ? rest : schemesInMotion

  return (
    <div className="w-full space-y-3">
      {featureNewest && (
        <div className="w-full max-w-[300px] mx-auto">
          <SchemeCard card={newest.card} onDismiss={() => onDismiss(newest.instanceId)} />
        </div>
      )}

      {listed.length > 0 && (
        <ul className="space-y-2">
          {listed.map((scheme) => {
            const isExpanded = expandedId === scheme.instanceId
            return (
              <li key={scheme.instanceId}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : scheme.instanceId)}
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer text-left ${
                    scheme.card.isOngoing
                      ? 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5'
                      : 'border-[var(--color-border)] bg-white/5'
                  } hover:bg-white/10`}
                >
                  <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={scheme.card.image_uris.art_crop}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] text-[var(--color-text)] truncate"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {scheme.card.name}
                    </p>
                    {scheme.card.isOngoing && (
                      <span
                        className="text-[10px] text-[var(--color-gold)] uppercase tracking-widest"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        Ongoing
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {isExpanded ? 'Hide' : 'View'}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="w-full max-w-[260px] mx-auto pt-2">
                        <SchemeCard
                          card={scheme.card}
                          onDismiss={() => {
                            setExpandedId(null)
                            onDismiss(scheme.instanceId)
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
