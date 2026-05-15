'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaneCard as PlaneCardType } from '@/lib/game/types'

interface PlaneCardProps {
  card: PlaneCardType
  direction: 'left' | 'right'
}

export function PlaneCard({ card, direction }: PlaneCardProps) {
  const xOffset = direction === 'left' ? -300 : 300
  const [showOracle, setShowOracle] = useState(false)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.id}
        initial={{ x: xOffset, opacity: 0, scale: 0.9 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: -xOffset, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="w-full flex flex-col items-center gap-3"
      >
        <div
          className="relative w-full max-w-[440px] aspect-[3/2] rounded-2xl overflow-hidden card-breathe cursor-pointer group"
          onClick={() => setShowOracle(!showOracle)}
        >
          <Image
            src={card.image_uris.art_crop}
            alt={card.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 480px) 100vw, 440px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <AnimatePresence>
            {showOracle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-end"
              >
                <p className="text-[13px] leading-relaxed text-[var(--color-text)] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {card.oracle_text}
                </p>
                {card.flavor_text && (
                  <p className="text-[11px] italic text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {card.flavor_text}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h2 className="text-[18px] md:text-[22px] font-bold text-white drop-shadow-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              {card.name}
            </h2>
            <p className="text-[11px] text-white/70" style={{ fontFamily: 'var(--font-body)' }}>
              {card.type_line} · {card.set_name}
            </p>
          </div>

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-white/50 bg-black/40 rounded-full px-2 py-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Tap to read
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
