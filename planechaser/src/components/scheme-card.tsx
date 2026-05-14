'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { SchemeCard as SchemeCardType } from '@/lib/game/types'

interface SchemeCardProps {
  card: SchemeCardType
  onAbandon?: () => void
}

export function SchemeCard({ card, onAbandon }: SchemeCardProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-[8px] overflow-hidden border border-[var(--color-cta)]/40 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
      >
        <img
          src={card.image_uris.art_crop}
          alt={card.name}
          className="w-full aspect-[3/2] object-cover"
        />
        <div className="px-3 py-2 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {card.name}
            </p>
            {card.isOngoing && (
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
                Ongoing
              </span>
            )}
          </div>
          {card.isOngoing && onAbandon && (
            <button
              onClick={onAbandon}
              className="mt-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Abandon scheme
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
