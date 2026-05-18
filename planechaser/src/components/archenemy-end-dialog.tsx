'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PlanePicker } from '@/components/plane-picker'
import { useStealPlane, useDeleteConqueredPlane, useUpdateLastArchenemy } from '@/hooks/usePods'
import { getUserConquests } from '@/lib/pods/queries'
import type { ConqueredPlane } from '@/lib/pods/types'

interface ArchenemyEndDialogProps {
  archenemyId: string
  archenemyName: string
  players: { id: string; display_name: string }[]
  podId: string
  onClose: () => void
  onConfirm: () => void
}

type Phase = 'choose' | 'archenemy-steal' | 'allies-steal' | 'collective-delete' | 'summary'

interface StealResult {
  action: string
  planeName: string
  fromPlayer: string
  toPlayer: string
}

const phaseAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
}

export function ArchenemyEndDialog({
  archenemyId,
  archenemyName,
  players,
  podId,
  onClose,
  onConfirm,
}: ArchenemyEndDialogProps) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [allyIndex, setAllyIndex] = useState(0)
  const [results, setResults] = useState<StealResult[]>([])
  const [deletedPlaneName, setDeletedPlaneName] = useState<string | null>(null)
  const [conquests, setConquests] = useState<ConqueredPlane[]>([])
  const [loading, setLoading] = useState(false)

  const steal = useStealPlane()
  const deletePlane = useDeleteConqueredPlane()
  const updateArchenemy = useUpdateLastArchenemy()

  const allies = players.filter((p) => p.id !== archenemyId)

  const fetchConquests = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const data = await getUserConquests(userId, podId)
      setConquests(data)
    } catch {
      setConquests([])
    } finally {
      setLoading(false)
    }
  }, [podId])

  // --- Phase transitions ---

  async function handleArchenemyWins() {
    if (allies.length === 0) {
      await finalize()
      return
    }
    setAllyIndex(0)
    await fetchConquests(allies[0].id)
    setPhase('archenemy-steal')
  }

  async function handleTeamWins() {
    if (allies.length === 0) {
      // No allies to steal, go straight to collective delete
      await fetchConquests(archenemyId)
      setPhase('collective-delete')
      return
    }
    setAllyIndex(0)
    await fetchConquests(archenemyId)
    setPhase('allies-steal')
  }

  // --- Archenemy steals from each ally ---

  async function handleArchenemySteal(conquestId: string) {
    const plane = conquests.find((c) => c.id === conquestId)
    if (!plane) return

    await steal.mutateAsync({ conquestId, newOwnerId: archenemyId, podId })
    setResults((prev) => [
      ...prev,
      {
        action: 'steal',
        planeName: plane.plane_name,
        fromPlayer: allies[allyIndex].display_name,
        toPlayer: archenemyName,
      },
    ])
    await advanceArchenemySteal()
  }

  async function skipArchenemySteal() {
    await advanceArchenemySteal()
  }

  async function advanceArchenemySteal() {
    const next = allyIndex + 1
    if (next >= allies.length) {
      await finalize()
    } else {
      setAllyIndex(next)
      await fetchConquests(allies[next].id)
    }
  }

  // --- Allies steal from archenemy ---

  async function handleAllySteal(conquestId: string) {
    const plane = conquests.find((c) => c.id === conquestId)
    if (!plane) return

    const currentAlly = allies[allyIndex]
    await steal.mutateAsync({ conquestId, newOwnerId: currentAlly.id, podId })
    setResults((prev) => [
      ...prev,
      {
        action: 'steal',
        planeName: plane.plane_name,
        fromPlayer: archenemyName,
        toPlayer: currentAlly.display_name,
      },
    ])
    await advanceAllySteal()
  }

  async function skipAllySteal() {
    await advanceAllySteal()
  }

  async function advanceAllySteal() {
    const next = allyIndex + 1
    if (next >= allies.length) {
      // Move to collective delete
      await fetchConquests(archenemyId)
      setPhase('collective-delete')
    } else {
      setAllyIndex(next)
      // Refetch archenemy conquests since previous steal changed them
      await fetchConquests(archenemyId)
    }
  }

  // --- Collective delete ---

  async function handleCollectiveDelete(conquestId: string) {
    const plane = conquests.find((c) => c.id === conquestId)
    if (!plane) return

    await deletePlane.mutateAsync(conquestId)
    setDeletedPlaneName(plane.plane_name)
    await finalize()
  }

  async function skipCollectiveDelete() {
    await finalize()
  }

  // --- Finalize ---

  async function finalize() {
    await updateArchenemy.mutateAsync({ podId, userId: archenemyId })
    setPhase('summary')
  }

  // --- Render helpers ---

  function renderChoose() {
    return (
      <motion.div key="choose" {...phaseAnimation} className="space-y-5">
        <div className="text-center space-y-1">
          <h2
            className="text-[20px] font-bold text-[var(--color-cta)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Archenemy Showdown
          </h2>
          <p
            className="text-[13px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {archenemyName} vs. The Team
          </p>
        </div>

        <div className="space-y-3">
          <p
            className="text-center text-[14px] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Who won?
          </p>
          <Button
            onClick={handleArchenemyWins}
            className="w-full h-12 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}
          >
            {archenemyName} Won
          </Button>
          <Button
            onClick={handleTeamWins}
            variant="outline"
            className="w-full h-12 border-[var(--color-accent)] text-[var(--color-accent)] rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}
          >
            Team Won (Dethrone)
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="outline"
          className="w-full h-11 border-[var(--color-border)] text-[var(--color-text)] rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
        >
          Keep Playing
        </Button>
      </motion.div>
    )
  }

  function renderLoading() {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[var(--color-cta)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function renderArchenemySteal() {
    const currentAlly = allies[allyIndex]
    if (!currentAlly) return null

    return (
      <motion.div key={`archenemy-steal-${allyIndex}`} {...phaseAnimation}>
        {loading ? (
          renderLoading()
        ) : (
          <PlanePicker
            title={`${archenemyName} Steals`}
            subtitle={`Pick 1 plane from ${currentAlly.display_name} (${allyIndex + 1}/${allies.length})`}
            conquests={conquests}
            onSelect={handleArchenemySteal}
            onSkip={skipArchenemySteal}
            skipLabel="Skip"
            selectLabel="Steal"
          />
        )}
      </motion.div>
    )
  }

  function renderAlliesSteal() {
    const currentAlly = allies[allyIndex]
    if (!currentAlly) return null

    return (
      <motion.div key={`allies-steal-${allyIndex}`} {...phaseAnimation}>
        {loading ? (
          renderLoading()
        ) : (
          <PlanePicker
            title={`${currentAlly.display_name} Steals`}
            subtitle={`Pick 1 plane from ${archenemyName} (${allyIndex + 1}/${allies.length})`}
            conquests={conquests}
            onSelect={handleAllySteal}
            onSkip={skipAllySteal}
            skipLabel="Skip"
            selectLabel="Steal"
          />
        )}
      </motion.div>
    )
  }

  function renderCollectiveDelete() {
    return (
      <motion.div key="collective-delete" {...phaseAnimation}>
        {loading ? (
          renderLoading()
        ) : (
          <PlanePicker
            title="Destroy a Plane"
            subtitle={`Choose 1 of ${archenemyName}'s planes to destroy`}
            conquests={conquests}
            onSelect={handleCollectiveDelete}
            onSkip={skipCollectiveDelete}
            skipLabel="Skip"
            selectLabel="Destroy"
          />
        )}
      </motion.div>
    )
  }

  function renderSummary() {
    return (
      <motion.div key="summary" {...phaseAnimation} className="space-y-5">
        <div className="text-center space-y-1">
          <h2
            className="text-[20px] font-bold text-[var(--color-cta)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Showdown Complete
          </h2>
          <p
            className="text-[13px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {archenemyName} has been recorded as Archenemy
          </p>
        </div>

        {results.length > 0 || deletedPlaneName ? (
          <div className="max-h-[35vh] overflow-y-auto space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
              >
                <span
                  className="text-[13px] text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                    {r.toPlayer}
                  </span>{' '}
                  stole{' '}
                  <span className="text-[var(--color-accent)]">{r.planeName}</span>{' '}
                  from {r.fromPlayer}
                </span>
              </div>
            ))}
            {deletedPlaneName && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-destructive)] bg-[var(--color-bg)] px-3 py-2">
                <span
                  className="text-[13px] text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className="text-[var(--color-destructive)]">{deletedPlaneName}</span>{' '}
                  was destroyed
                </span>
              </div>
            )}
          </div>
        ) : (
          <p
            className="text-center text-[13px] text-[var(--color-text-muted)] py-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No planes were transferred or destroyed.
          </p>
        )}

        <Button
          onClick={onConfirm}
          className="w-full h-11 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
        >
          End Game
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[420px] rounded-[12px] border border-[var(--color-cta)] bg-[var(--color-surface)] p-6 space-y-5 max-h-[80vh] flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {phase === 'choose' && renderChoose()}
            {phase === 'archenemy-steal' && renderArchenemySteal()}
            {phase === 'allies-steal' && renderAlliesSteal()}
            {phase === 'collective-delete' && renderCollectiveDelete()}
            {phase === 'summary' && renderSummary()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
