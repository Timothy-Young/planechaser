'use client'

import { useState } from 'react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[380px] rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
        <div className="text-center space-y-1">
          <h2
            className="text-[20px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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
            className="w-full h-12 bg-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] text-white"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}
          >
            {conquering ? 'Conquering...' : `Conquer ${currentPlane.name}`}
          </Button>
        )}

        {conquered && (
          <p className="text-center text-green-400 text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
            You conquered {currentPlane.name}!
          </p>
        )}

        {user && !podId && (
          <p className="text-center text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Join a pod to start conquering planes
          </p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 border-[var(--color-border)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            Keep Playing
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-11 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Game
          </Button>
        </div>
      </div>
    </div>
  )
}
