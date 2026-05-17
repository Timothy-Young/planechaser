'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { SchemeCard as SchemeCardType } from '@/lib/game/types'

interface SchemeCardProps {
  card: SchemeCardType
  onAbandon?: () => void
}

export function SchemeCard({ card, onAbandon }: SchemeCardProps) {
  const [zoomed, setZoomed] = useState(false)

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-xl overflow-hidden border border-[var(--color-cta)]/40 shadow-[0_0_16px_rgba(239,68,68,0.3)] cursor-pointer"
          onClick={() => setZoomed(true)}
        >
          <div className="relative w-full aspect-[5/7]">
            <Image
              src={card.image_uris.border_crop}
              alt={card.name}
              fill
              className="object-contain"
              sizes="(max-width: 480px) 100vw, 300px"
            />
          </div>
          {card.isOngoing && onAbandon && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
                Ongoing
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onAbandon() }}
                className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Abandon scheme
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <CardZoomModal
        src={zoomed ? card.image_uris.border_crop : null}
        alt={card.name}
        onClose={() => setZoomed(false)}
      />
    </>
  )
}
