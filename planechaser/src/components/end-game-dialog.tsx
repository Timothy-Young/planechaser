'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useConquerPlane, useUserPods } from '@/hooks/usePods'
import { createClient } from '@/lib/supabase/client'
import type { PlaneCard } from '@/lib/game/types'

interface EndGameDialogProps {
  currentPlane: PlaneCard
  players: { id: string; display_name: string }[]
  onClose: () => void
  onConfirm: () => void
}

type Step = 'select' | 'confirm' | 'success'

export function EndGameDialog({ currentPlane, players, onClose, onConfirm }: EndGameDialogProps) {
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: pods } = useUserPods()
  const conquer = useConquerPlane()

  const [step, setStep] = useState<Step>('select')
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; display_name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [conqueredFrom, setConqueredFrom] = useState<string | null>(null)

  const podId = activePodId ?? pods?.[0]?.id

  async function handleConfirm() {
    if (!selectedPlayer || !podId) return
    setSubmitting(true)

    try {
      const supabase = createClient()

      // Check for existing conquest of this plane in the pod
      const { data: existing } = await supabase
        .from('conquered_planes')
        .select('id, user_id')
        .eq('plane_scryfall_id', currentPlane.id)
        .eq('pod_id', podId)
        .maybeSingle()

      let conqueredFromUserId: string | undefined
      let previousOwnerName: string | null = null

      if (existing && existing.user_id !== selectedPlayer.id) {
        conqueredFromUserId = existing.user_id as string
        // Find name from the players list already in memory
        const prevPlayer = players.find((p) => p.id === conqueredFromUserId)
        previousOwnerName = prevPlayer?.display_name ?? null
      }

      await conquer.mutateAsync({
        userId: selectedPlayer.id,
        podId,
        plane: {
          id: currentPlane.id,
          name: currentPlane.name,
          image_uri: currentPlane.image_uris.border_crop,
        },
        conqueredFromUserId,
      })

      setConqueredFrom(previousOwnerName)
      setStep('success')
    } catch {
      // Conquest failed silently — still transition to allow ending game
      setStep('success')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[380px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6"
      >
        <AnimatePresence mode="wait">

          {/* Step 1: Winner Selection */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <h2
                  className="text-[20px] font-bold text-[var(--color-text)] tracking-wide"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  End Game
                </h2>
                <p
                  className="text-[13px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {currentPlane.name}
                </p>
              </div>

              <div className="space-y-2">
                <p
                  className="text-[12px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest text-center"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Who won this game?
                </p>
                <div className="space-y-2">
                  {players.map((player) => {
                    const isSelected = selectedPlayer?.id === player.id
                    return (
                      <motion.button
                        key={player.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedPlayer(player)}
                        className="w-full h-12 rounded-xl border text-left px-4 transition-colors"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '15px',
                          background: isSelected
                            ? 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))'
                            : 'var(--color-bg)',
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                          color: isSelected ? '#fff' : 'var(--color-text)',
                          boxShadow: isSelected ? '0 4px 20px rgba(124, 58, 237, 0.3)' : 'none',
                        }}
                      >
                        {player.display_name}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-xl"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
                >
                  Keep Playing
                </Button>
                <Button
                  onClick={selectedPlayer ? () => setStep('confirm') : onConfirm}
                  className="flex-1 h-11 bg-[var(--color-cta)] hover:opacity-90 text-[var(--color-text)] rounded-xl"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
                >
                  {selectedPlayer ? 'Next' : 'End Without Conquest'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Confirmation */}
          {step === 'confirm' && selectedPlayer && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <h2
                  className="text-[20px] font-bold text-[var(--color-text)] tracking-wide"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Award Conquest?
                </h2>
              </div>

              <div
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-center"
                style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '1.6' }}
              >
                <span className="text-[var(--color-text-muted)]">Award </span>
                <span className="font-bold text-[var(--color-text)]">{currentPlane.name}</span>
                <span className="text-[var(--color-text-muted)]"> to </span>
                <span className="font-bold text-[var(--color-accent)]">{selectedPlayer.display_name}</span>
                <span className="text-[var(--color-text-muted)]">?</span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('select')}
                  variant="outline"
                  disabled={submitting}
                  className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-xl"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
                >
                  Back
                </Button>
                <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="w-full h-11 rounded-xl hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '14px',
                      background: 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    {submitting ? 'Confirming…' : 'Confirm'}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && selectedPlayer && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="text-5xl"
              >
                ⚔️
              </motion.div>

              <div className="space-y-2">
                <h2
                  className="text-[20px] font-bold text-[var(--color-text)] tracking-wide"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Conquest!
                </h2>
                <p
                  className="text-[15px] text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)', lineHeight: '1.5' }}
                >
                  <span className="font-bold text-[var(--color-accent)]">{selectedPlayer.display_name}</span>
                  {' conquered '}
                  <span className="font-bold">{currentPlane.name}</span>
                  {'!'}
                </p>
                {conqueredFrom && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[12px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Conquered from: {conqueredFrom}
                  </motion.p>
                )}
              </div>

              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={onConfirm}
                  className="w-full h-12 rounded-xl hover:opacity-90"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '15px',
                    background: 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
                  }}
                >
                  End Game
                </Button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
