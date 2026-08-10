'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { SchemeCard as SchemeCardType } from '@/lib/game/types'

interface SchemeCardProps {
  card: SchemeCardType
  /**
   * Clears the scheme off the board and returns it to the bottom of the scheme
   * deck. Offered for one-shot schemes too — they persist until the table says
   * the trigger has finished resolving.
   */
  onDismiss?: () => void
}

export function SchemeCard({ card, onDismiss }: SchemeCardProps) {
  const [zoomed, setZoomed] = useState(false)
  // The rules use two words for one transition: an ongoing scheme is abandoned,
  // a one-shot is simply done resolving.
  const dismissLabel = card.isOngoing ? 'Abandon scheme' : 'Resolve scheme'

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
          {onDismiss && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm flex items-center justify-between">
              <span
                className={`text-[10px] uppercase tracking-wide ${
                  card.isOngoing ? 'text-[var(--color-gold)]' : 'text-[var(--color-text-muted)]'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {card.isOngoing ? 'Ongoing' : 'In motion'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss() }}
                className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {dismissLabel}
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
