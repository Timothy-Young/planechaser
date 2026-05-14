'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DethroneDialog } from './dethrone-dialog'
import { useAppStore } from '@/store/app-store'
import { useConquerPlane, useUserConquests, useStealPlane } from '@/hooks/usePods'
import type { PlaneCard } from '@/lib/game/types'

interface ArchenemyEndDialogProps {
  currentPlane: PlaneCard
  archenemyId: string
  archenemyName: string
  onClose: () => void
  onConfirm: () => void
}

export function ArchenemyEndDialog({
  currentPlane,
  archenemyId,
  archenemyName,
  onClose,
  onConfirm,
}: ArchenemyEndDialogProps) {
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const conquer = useConquerPlane()
  const steal = useStealPlane()
  const { data: archenemyConquests } = useUserConquests(activePodId ?? undefined)

  const [phase, setPhase] = useState<'choose' | 'dethrone' | 'done'>('choose')
  const [result, setResult] = useState<string | null>(null)

  const isArchenemy = user?.id === archenemyId

  async function handleArchenemyWins() {
    if (!user || !activePodId) return
    try {
      await conquer.mutateAsync({
        userId: archenemyId,
        podId: activePodId,
        plane: {
          id: currentPlane.id,
          name: currentPlane.name,
          image_uri: currentPlane.image_uris.art_crop,
        },
      })
      setResult(`${archenemyName} conquered ${currentPlane.name}!`)
    } catch {
      setResult('Failed to record conquest')
    }
    setPhase('done')
  }

  function handleTeamWins() {
    setPhase('dethrone')
  }

  async function handleSteal(conquestId: string) {
    if (!user || !activePodId) return
    try {
      await steal.mutateAsync({
        conquestId,
        newOwnerId: user.id,
        podId: activePodId,
      })
      setResult('Plane stolen from the Archenemy!')
    } catch {
      setResult('Failed to steal plane')
    }
    setPhase('done')
  }

  function handleSkipSteal() {
    setResult('The Archenemy was dethroned!')
    setPhase('done')
  }

  if (phase === 'dethrone') {
    const enemyConquests = (archenemyConquests ?? []).filter(
      (c) => c.user_id === archenemyId
    )
    return (
      <DethroneDialog
        archenemyName={archenemyName}
        conquests={enemyConquests}
        onSteal={handleSteal}
        onSkip={handleSkipSteal}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[380px] rounded-[12px] border border-[var(--color-cta)] bg-[var(--color-surface)] p-6 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-[20px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Archenemy Showdown
          </h2>
          <p className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            {archenemyName} vs. The Team
          </p>
        </div>

        {phase === 'choose' && (
          <div className="space-y-3">
            <p className="text-center text-[14px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
              Who won?
            </p>
            <Button
              onClick={handleArchenemyWins}
              className="w-full h-12 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}
            >
              {isArchenemy ? 'I Won (Archenemy)' : `${archenemyName} Won`}
            </Button>
            <Button
              onClick={handleTeamWins}
              variant="outline"
              className="w-full h-12 border-[var(--color-accent)] text-[var(--color-accent)]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}
            >
              Team Won (Dethrone)
            </Button>
          </div>
        )}

        {phase === 'done' && result && (
          <p className="text-center text-[14px] text-green-400" style={{ fontFamily: 'var(--font-body)' }}>
            {result}
          </p>
        )}

        <div className="flex gap-3">
          {phase === 'choose' && (
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-11 border-[var(--color-border)] text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
            >
              Keep Playing
            </Button>
          )}
          {phase === 'done' && (
            <Button
              onClick={onConfirm}
              className="flex-1 h-11 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
            >
              End Game
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
