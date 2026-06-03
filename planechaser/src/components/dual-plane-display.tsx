'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { PlaneCard } from '@/lib/game/types'

interface DualPlaneDisplayProps {
  primaryPlane: PlaneCard
  secondaryPlane: PlaneCard
  direction: 'left' | 'right'
}

export function DualPlaneDisplay({ primaryPlane, secondaryPlane, direction }: DualPlaneDisplayProps) {
  const [zoomedCard, setZoomedCard] = useState<PlaneCard | null>(null)
  const xOffset = direction === 'left' ? -300 : 300

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${primaryPlane.id}-${secondaryPlane.id}`}
          initial={{ x: xOffset, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -xOffset, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="w-full flex flex-col gap-2 items-center"
        >
          {/* Spatial Merging badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-900/60 text-amber-400 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Spatial Merging — Two Planes Active
            </span>
          </div>

          {/* Primary plane */}
          <div
            className="relative w-full max-w-[440px] aspect-[7/5] rounded-2xl overflow-hidden cursor-pointer card-breathe"
            style={{ maxHeight: '35vh' }}
            onClick={() => setZoomedCard(primaryPlane)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <Image
                  src={primaryPlane.image_uris.border_crop}
                  alt={primaryPlane.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 480px) 140vw, 616px"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Secondary plane */}
          <div
            className="relative w-full max-w-[440px] aspect-[7/5] rounded-2xl overflow-hidden cursor-pointer card-breathe"
            style={{ maxHeight: '35vh' }}
            onClick={() => setZoomedCard(secondaryPlane)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <Image
                  src={secondaryPlane.image_uris.border_crop}
                  alt={secondaryPlane.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 480px) 140vw, 616px"
                  priority
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <CardZoomModal
        src={zoomedCard ? zoomedCard.image_uris.border_crop : null}
        alt={zoomedCard?.name ?? ''}
        onClose={() => setZoomedCard(null)}
      />
    </>
  )
}
