'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { PlaneCard as PlaneCardType } from '@/lib/game/types'

interface PlaneCardProps {
  card: PlaneCardType
  direction: 'left' | 'right'
}

export function PlaneCard({ card, direction }: PlaneCardProps) {
  const [zoomed, setZoomed] = useState(false)
  const xOffset = direction === 'left' ? -300 : 300

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ x: xOffset, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -xOffset, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="w-full flex justify-center cursor-pointer"
          onClick={() => setZoomed(true)}
        >
          <div className="relative w-full max-w-[440px] aspect-[5/7] rounded-2xl overflow-hidden card-breathe">
            <Image
              src={card.image_uris.border_crop}
              alt={card.name}
              fill
              className="object-contain"
              sizes="(max-width: 480px) 100vw, 440px"
              priority
            />
          </div>
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
