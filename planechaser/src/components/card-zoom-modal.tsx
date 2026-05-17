'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface CardZoomModalProps {
  src: string | null
  alt: string
  onClose: () => void
}

export function CardZoomModal({ src, alt, onClose }: CardZoomModalProps) {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[360px] aspect-[5/7]"
          >
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain rounded-xl"
              sizes="360px"
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
