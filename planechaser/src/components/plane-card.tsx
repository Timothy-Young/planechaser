'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaneCard as PlaneCardType } from '@/lib/game/types'

interface PlaneCardProps {
  card: PlaneCardType
  direction: 'left' | 'right'
}

export function PlaneCard({ card, direction }: PlaneCardProps) {
  const xOffset = direction === 'left' ? -300 : 300

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.id}
        initial={{ x: xOffset, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -xOffset, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full flex flex-col items-center gap-3"
      >
        {/* Landscape art crop — no card frame, just the plane artwork */}
        <div className="relative w-full max-w-[400px] aspect-[3/2] rounded-[12px] overflow-hidden border border-[var(--color-border)] shadow-lg shadow-[var(--color-accent)]/20">
          <Image
            src={card.image_uris.art_crop}
            alt={card.name}
            fill
            className="object-cover"
            sizes="(max-width: 440px) 100vw, 400px"
            priority
          />
        </div>

        {/* Card info */}
        <div className="text-center space-y-1 px-2">
          <h2
            className="text-[20px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {card.name}
          </h2>
          <p
            className="text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {card.type_line} — {card.set_name}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
