'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useConquerPlane, useUserPods } from '@/hooks/usePods'
import type { PlaneCard } from '@/lib/game/types'

interface EndGameDialogProps {
  currentPlane: PlaneCard
  onClose: () => void
  onConfirm: () => void
}

export function EndGameDialog({ currentPlane, onClose, onConfirm }: EndGameDialogProps) {
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: pods } = useUserPods()
  const conquer = useConquerPlane()
  const [conquering, setConquering] = useState(false)
  const [conquered, setConquered] = useState(false)

  const podId = activePodId ?? pods?.[0]?.id

  async function handleConquer() {
    if (!user || !podId) return
    setConquering(true)
    try {
      await conquer.mutateAsync({
        userId: user.id,
        podId,
        plane: {
          id: currentPlane.id,
          name: currentPlane.name,
          image_uri: currentPlane.image_uris.art_crop,
        },
      })
      setConquered(true)
    } catch {
      // Conquest failed — still allow ending game
    }
    setConquering(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[380px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 space-y-5"
      >
        <div className="text-center space-y-1">
          <h2 className="text-[20px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            End Game
          </h2>
          <p className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            {currentPlane.name}
          </p>
        </div>

        {user && podId && !conquered && (
          <Button
            onClick={handleConquer}
            disabled={conquering}
            className="w-full h-12 bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)' }}
          >
            {conquering ? 'Conquering...' : `Conquer ${currentPlane.name}`}
          </Button>
        )}

        {conquered && (
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-green-400 text-[14px] font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You conquered {currentPlane.name}!
          </motion.p>
        )}

        {user && !podId && (
          <p className="text-center text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Join a pod to start conquering planes
          </p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10 rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            Keep Playing
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-11 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Game
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
