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
        initial={{ x: xOffset, opacity: 0, scale: 0.9 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: -xOffset, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="w-full flex flex-col items-center gap-0"
      >
        {/* Art image */}
        <div className="relative w-full max-w-[440px] aspect-[3/2] rounded-t-2xl overflow-hidden card-breathe">
          <Image
            src={card.image_uris.art_crop}
            alt={card.name}
            fill
            className="object-cover"
            sizes="(max-width: 480px) 100vw, 440px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h2 className="text-[18px] md:text-[22px] font-bold text-white drop-shadow-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              {card.name}
            </h2>
            <p className="text-[11px] text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
              {card.type_line} · {card.set_name}
            </p>
          </div>
        </div>

        {/* Oracle text panel */}
        <div className="w-full max-w-[440px] rounded-b-2xl border border-t-0 border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm px-4 py-3">
          <p className="text-[12px] sm:text-[13px] leading-relaxed text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
            {card.oracle_text}
          </p>
          {card.flavor_text && (
            <p className="text-[11px] italic text-[var(--color-text-muted)] mt-2 pt-2 border-t border-[var(--color-border)]" style={{ fontFamily: 'var(--font-body)' }}>
              {card.flavor_text}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
