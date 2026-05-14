'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gameReducer } from '@/lib/game/engine'
import { loadGameState, saveGameState, clearGameState } from '@/lib/game/session-storage'
import { PlaneCard } from '@/components/plane-card'
import { DieRoller } from '@/components/die-roller'
import { EndGameDialog } from '@/components/end-game-dialog'
import { ArchenemyEndDialog } from '@/components/archenemy-end-dialog'
import { SchemeCard } from '@/components/scheme-card'
import { Button } from '@/components/ui/button'
import { useRecordGameSession, useUserStats } from '@/hooks/usePods'
import { useUserAchievements, useGrantAchievements } from '@/hooks/useAchievements'
import { evaluateAchievements } from '@/lib/achievements/evaluator'
import { AchievementToast } from '@/components/achievement-toast'
import { useAppStore } from '@/store/app-store'
import type { GameState, DieResult } from '@/lib/game/types'

export default function GamePage() {
  const router = useRouter()
  const [state, setState] = useState<GameState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [showChaos, setShowChaos] = useState(false)
  const [showEndGame, setShowEndGame] = useState(false)
  const [lastDrawnScheme, setLastDrawnScheme] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const recordSession = useRecordGameSession()
  const grantAchievements = useGrantAchievements()
  const { data: userStats } = useUserStats()
  const { data: earnedAchievements } = useUserAchievements()
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)

  useEffect(() => {
    const saved = loadGameState()
    if (!saved) {
      router.replace('/setup')
      return
    }
    setState(saved)
    setLoaded(true)
  }, [router])

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
    if (state && user) {
      const visitedPlanes = state.deck
        .slice(0, state.planesVisited)
        .map((p) => p.name)

      recordSession.mutate({
        hostUserId: user.id,
        planesVisited: visitedPlanes,
        dieRollHistory: state.dieRollHistory,
        isArchenemy: !!state.archenemy,
        podId: activePodId ?? undefined,
      })

      if (userStats && earnedAchievements) {
        const updatedStats = {
          ...userStats,
          games_played: userStats.games_played + 1,
          total_rolls: userStats.total_rolls + state.dieRollHistory.length,
          planeswalk_rolls: userStats.planeswalk_rolls + state.dieRollHistory.filter((r) => r.result === 'planeswalk').length,
          total_planes_visited: userStats.total_planes_visited + state.planesVisited,
          archenemy_games: userStats.archenemy_games + (state.archenemy ? 1 : 0),
        }

        const alreadyEarned = new Set(earnedAchievements.map((a) => a.achievement_key))
        const sessionContext = {
          planesVisited: state.planesVisited,
          dieRolls: state.dieRollHistory.length,
          chaosRolls: state.dieRollHistory.filter((r) => r.result === 'chaos').length,
          planeswalkRolls: state.dieRollHistory.filter((r) => r.result === 'planeswalk').length,
          playerCount: state.config.playerCount,
          isArchenemy: !!state.archenemy,
        }

        const newlyEarned = evaluateAchievements(updatedStats, sessionContext, alreadyEarned)
        if (newlyEarned.length > 0) {
          grantAchievements.mutate({ userId: user.id, keys: newlyEarned })
          setNewBadges(newlyEarned)
        }
      }
    }
    clearGameState()
    router.push('/setup')
  }, [router, state, user, activePodId, recordSession, userStats, earnedAchievements, grantAchievements])

  const handleDrawScheme = useCallback(() => {
    setState((prev) => {
      if (!prev?.archenemy) return prev
      const next = gameReducer(prev, { type: 'DRAW_SCHEME' })
      const drawn = next.archenemy!.schemeDeck[prev.archenemy.currentSchemeIndex % prev.archenemy.schemeDeck.length]
      setLastDrawnScheme(drawn.id)
      setTimeout(() => setLastDrawnScheme(null), 3000)
      return next
    })
  }, [])

  const handleAbandonScheme = useCallback((schemeId: string) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ABANDON_SCHEME', schemeId })
    })
  }, [])

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
  const isArchenemy = !!state.archenemy
  const lastScheme = lastDrawnScheme && state.archenemy
    ? state.archenemy.schemeDeck.find((s) => s.id === lastDrawnScheme)
    : null

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span
            className="text-[14px] text-[var(--color-accent)] font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PlaneChaser
          </span>
          {isArchenemy && (
            <span className="text-[11px] text-[var(--color-cta)] font-bold px-2 py-0.5 rounded-full border border-[var(--color-cta)]/40" style={{ fontFamily: 'var(--font-heading)' }}>
              ARCHENEMY
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          <span>Plane {state.planesVisited} / {state.deck.length}</span>
          <span>{state.dieRollHistory.length} rolls</span>
          {state.archenemy && (
            <span>{state.archenemy.schemesPlayed} schemes</span>
          )}
        </div>
      </header>

      {/* Achievement toast */}
      {newBadges.length > 0 && (
        <AchievementToast achievementKeys={newBadges} onDone={() => setNewBadges([])} />
      )}

      {/* Chaos flash overlay */}
      {showChaos && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--color-cta)]/10 animate-pulse" />
          <span className="text-[48px] animate-bounce">🌀</span>
        </div>
      )}

      {/* End game dialog */}
      {showEndGame && currentPlane && !isArchenemy && (
        <EndGameDialog
          currentPlane={currentPlane}
          onClose={() => setShowEndGame(false)}
          onConfirm={handleEndGame}
        />
      )}

      {showEndGame && currentPlane && isArchenemy && state.archenemy && (
        <ArchenemyEndDialog
          currentPlane={currentPlane}
          archenemyId={state.archenemy.archenemyId}
          archenemyName={state.archenemy.archenemyName}
          onClose={() => setShowEndGame(false)}
          onConfirm={handleEndGame}
        />
      )}

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-between py-4 px-4 gap-3 overflow-hidden">
        {/* Archenemy: active schemes bar */}
        {isArchenemy && state.archenemy && state.archenemy.activeSchemes.length > 0 && (
          <div className="w-full max-w-[400px] space-y-2">
            <p className="text-[11px] text-[var(--color-cta)] uppercase tracking-wide font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Active Schemes
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {state.archenemy.activeSchemes.map((s) => (
                <div key={s.id} className="w-[140px] flex-shrink-0">
                  <SchemeCard card={s} onAbandon={() => handleAbandonScheme(s.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last drawn scheme flash */}
        {lastScheme && (
          <div className="w-full max-w-[300px]">
            <SchemeCard card={lastScheme} />
          </div>
        )}

        {/* Plane card */}
        <div className={`flex-1 flex items-center justify-center w-full max-w-[400px] ${isArchenemy && state.archenemy?.activeSchemes.length ? 'max-h-[300px]' : ''}`}>
          {currentPlane && (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 pb-2">
          {isArchenemy && (
            <Button
              onClick={handleDrawScheme}
              className="h-12 px-5 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
            >
              Draw Scheme
            </Button>
          )}
          <DieRoller
            rollCount={state.rollCountThisTurn}
            onRoll={handleRoll}
            disabled={state.lastDieResult === 'planeswalk'}
          />
        </div>

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
            onClick={() => setShowEndGame(true)}
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
