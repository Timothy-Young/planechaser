'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gameReducer } from '@/lib/game/engine'
import { loadGameState, saveGameState, clearGameState } from '@/lib/game/session-storage'
import { PlaneCard } from '@/components/plane-card'
import { DieRoller } from '@/components/die-roller'
import { Button } from '@/components/ui/button'
import type { GameState, DieResult } from '@/lib/game/types'

export default function GamePage() {
  const router = useRouter()
  const [state, setState] = useState<GameState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [showChaos, setShowChaos] = useState(false)

  useEffect(() => {
    const saved = loadGameState()
    if (!saved) {
      router.replace('/setup')
      return
    }
    setState(saved)
    setLoaded(true)
  }, [router])

  // Persist on every state change
  useEffect(() => {
    if (state) saveGameState(state)
  }, [state])

  const handleRoll = useCallback((result: DieResult) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ROLL_DIE', result })
    })

    if (result === 'chaos') {
      setShowChaos(true)
      setTimeout(() => setShowChaos(false), 2000)
    }

    if (result === 'planeswalk') {
      setSlideDirection('right')
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return gameReducer(prev, { type: 'PLANESWALK' })
        })
      }, 1200)
    }
  }, [])

  const handleEndTurn = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'RESET_TURN' })
    })
  }, [])

  const handleEndGame = useCallback(() => {
    clearGameState()
    router.push('/setup')
  }, [router])

  if (!loaded || !state) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Loading game...
        </p>
      </main>
    )
  }

  const currentPlane = state.deck[state.currentPlaneIndex]

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div>
          <span
            className="text-[14px] text-[var(--color-accent)] font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PlaneChaser
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          <span>Plane {state.planesVisited} / {state.deck.length}</span>
          <span>{state.dieRollHistory.length} rolls</span>
        </div>
      </header>

      {/* Chaos flash overlay */}
      {showChaos && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[var(--color-cta)]/10 animate-pulse"
          />
          <span className="text-[48px] animate-bounce">🌀</span>
        </div>
      )}

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-between py-4 px-4 gap-4 overflow-hidden">
        {/* Plane card */}
        <div className="flex-1 flex items-center justify-center w-full max-w-[400px]">
          {currentPlane && (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          )}
        </div>

        {/* Die roller */}
        <div className="pb-2">
          <DieRoller
            rollCount={state.rollCountThisTurn}
            onRoll={handleRoll}
            disabled={state.lastDieResult === 'planeswalk'}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full max-w-[400px] pb-4">
          <Button
            onClick={handleEndTurn}
            variant="outline"
            className="flex-1 h-12 border-[var(--color-border)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Turn
          </Button>
          <Button
            onClick={handleEndGame}
            variant="outline"
            className="h-12 px-4 border-[var(--color-border)] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            End Game
          </Button>
        </div>
      </div>
    </main>
  )
}
