'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Music, Home, Sun, Moon, Trees } from 'lucide-react'
import { gameReducer } from '@/lib/game/engine'
import { loadGameState, saveGameState, clearGameState } from '@/lib/game/session-storage'
import { PlaneCard } from '@/components/plane-card'
import { RevealCardsModal } from '@/components/reveal-cards-modal'
import { DieRoller } from '@/components/die-roller'
import { EndGameDialog } from '@/components/end-game-dialog'
import { ArchenemyEndDialog } from '@/components/archenemy-end-dialog'
import { SchemeCard } from '@/components/scheme-card'
import { Button } from '@/components/ui/button'
import { useSyncGameState, useEndSession } from '@/hooks/useGameSession'
import { TurnIndicator } from '@/components/turn-indicator'
import { ChaosOverlay } from '@/components/chaos-overlay'
import { useRecordGameSession, useUserStats } from '@/hooks/usePods'
import { useUserAchievements, useGrantAchievements } from '@/hooks/useAchievements'
import { evaluateAchievements } from '@/lib/achievements/evaluator'
import { AchievementToast } from '@/components/achievement-toast'
import { audioManager } from '@/lib/audio/audio-manager'
import { getPlaneEnvironment, AMBIENT_URLS } from '@/lib/game/plane-environments'
import { useAppStore } from '@/store/app-store'
import type { GameState, DieResult, PlaneCard as PlaneCardType, TurnRecord } from '@/lib/game/types'

export default function GamePage() {
  const router = useRouter()
  const [state, setState] = useState<GameState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [showEndGame, setShowEndGame] = useState(false)
  const [lastDrawnScheme, setLastDrawnScheme] = useState<string | null>(null)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [musicOn, setMusicOn] = useState(false)
  const [sfxOn, setSfxOn] = useState(true)
  const [ambientOn, setAmbientOn] = useState(true)
  const recordSession = useRecordGameSession()
  const grantAchievements = useGrantAchievements()
  const { data: userStats } = useUserStats()
  const { data: earnedAchievements } = useUserAchievements()
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const syncState = useSyncGameState()
  const endSessionMutation = useEndSession()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const isHost = useAppStore((s) => s.isHost)
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)

  useEffect(() => {
    audioManager.init()
    setMusicOn(audioManager.musicEnabled)
    setSfxOn(audioManager.sfxEnabled)
    setAmbientOn(audioManager.ambientEnabled)
  }, [])

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

  useEffect(() => {
    if (!state || !activeSessionId || !isHost) return

    const timeout = setTimeout(() => {
      const currentPlayerId = state.turnOrder?.[state.currentTurnIndex] ?? ''
      syncState.mutate({
        sessionId: activeSessionId,
        state,
        currentTurnUserId: currentPlayerId,
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [state, activeSessionId, isHost])

  useEffect(() => {
    if (!state) return
    const plane = state.deck[state.currentPlaneIndex]
    if (!plane) return
    const env = getPlaneEnvironment(plane.name)
    const url = AMBIENT_URLS[env]
    audioManager.playAmbient(url)
  }, [state?.currentPlaneIndex])

  useEffect(() => {
    if (!state?.phenomenonActive) return

    const timer = setTimeout(() => {
      setSlideDirection('right')
      setState((prev) => {
        if (!prev) return prev
        const next = gameReducer(prev, { type: 'RESOLVE_PHENOMENON' })
        const landedCard = next.deck[next.currentPlaneIndex]
        if (landedCard?.card_type === 'phenomenon') {
          return { ...next, phenomenonActive: true }
        }
        return next
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [state?.phenomenonActive, state?.currentPlaneIndex])

  const handleRoll = useCallback((result: DieResult) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ROLL_DIE', result })
    })

    if (result === 'planeswalk') {
      setSlideDirection('right')
      audioManager.playPlaneswalkLayered()
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          const next = gameReducer(prev, { type: 'PLANESWALK' })
          const landedCard = next.deck[next.currentPlaneIndex]
          if (landedCard?.card_type === 'phenomenon') {
            return { ...next, phenomenonActive: true }
          }
          return next
        })
      }, 1200)
    }
  }, [])

  const handleSpecialChaos = useCallback((plane: PlaneCardType) => {
    if (plane.chaos_effect_type === 'reveal_and_chaos') {
      const revealCount = (plane.chaos_effect_config as { revealCount: number })?.revealCount ?? 3
      setState((prev) => {
        if (!prev) return prev
        const startIdx = (prev.currentPlaneIndex + 1) % prev.deck.length
        const revealed: PlaneCardType[] = []
        for (let i = 0; i < revealCount && i < prev.deck.length - 1; i++) {
          revealed.push(prev.deck[(startIdx + i) % prev.deck.length])
        }
        return gameReducer(prev, { type: 'BEGIN_REVEAL_CHAOS', cards: revealed, effectType: 'reveal_and_chaos' })
      })
    } else if (plane.chaos_effect_type === 'scry_top') {
      setState((prev) => {
        if (!prev) return prev
        const nextIdx = (prev.currentPlaneIndex + 1) % prev.deck.length
        const topCard = prev.deck[nextIdx]
        return gameReducer(prev, { type: 'BEGIN_REVEAL_CHAOS', cards: [topCard], effectType: 'scry_top' })
      })
    } else if (plane.chaos_effect_type === 'force_planeswalk') {
      setSlideDirection('right')
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return gameReducer(prev, { type: 'PLANESWALK' })
        })
      }, 1200)
    }
  }, [])

  const handleReorderBottom = useCallback((cardIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'REORDER_BOTTOM', cardIds })
    })
  }, [])

  const handleDismissReveal = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'DISMISS_REVEAL' })
    })
  }, [])

  const handleDismissChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const plane = prev.deck[prev.currentPlaneIndex]
      const dismissed = gameReducer(prev, { type: 'DISMISS_CHAOS' })
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        setTimeout(() => handleSpecialChaos(plane), 300)
      }
      return dismissed
    })
  }, [handleSpecialChaos])

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'UNDO' })
    })
  }, [])

  const handleEndTurn = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'END_TURN' })
    })
  }, [])

  const handleEndGame = useCallback(() => {
    if (state && user) {
      const visitedPlanes = state.deck
        .slice(0, state.planesVisited)
        .map((p) => p.name)

      const finalTurnLog = [...state.turnHistory]
      if (state.currentTurnRolls.length > 0) {
        const currentPlayerId = state.turnOrder[state.currentTurnIndex]
        const currentPlayer = state.players.find((p) => p.id === currentPlayerId)
        const startPlane = state.deck[state.turnStartPlaneIndex]
        const currentPlane = state.deck[state.currentPlaneIndex]
        const didPlaneswalk = state.currentTurnRolls.some((r) => r.result === 'planeswalk')
        const chaosRolls = state.currentTurnRolls.filter((r) => r.result === 'chaos')

        finalTurnLog.push({
          playerId: currentPlayerId ?? 'unknown',
          playerName: currentPlayer?.display_name || 'Unknown',
          rolls: state.currentTurnRolls,
          planeswalked: didPlaneswalk,
          chaosTriggered: chaosRolls.length > 0,
          planeAtStart: startPlane?.name ?? 'Unknown',
          planeAtStartId: startPlane?.id ?? '',
          newPlane: didPlaneswalk ? currentPlane?.name : undefined,
          newPlaneId: didPlaneswalk ? currentPlane?.id : undefined,
          chaosEffects: [],
          conquests: [],
          endedAt: Date.now(),
        })
      }

      recordSession.mutate({
        hostUserId: user.id,
        planesVisited: visitedPlanes,
        dieRollHistory: state.dieRollHistory,
        isArchenemy: !!state.archenemy,
        podId: activePodId ?? undefined,
        turnLog: finalTurnLog,
        players: state.players,
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
          audioManager.playSFX('achievement')
        }
      }
    }
    audioManager.stopAll()
    if (activeSessionId && isHost) {
      endSessionMutation.mutate(activeSessionId)
      setActiveSessionId(null)
    }
    clearGameState()
    router.push('/setup')
  }, [router, state, user, activePodId, activeSessionId, isHost, recordSession, userStats, earnedAchievements, grantAchievements, endSessionMutation, setActiveSessionId])

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

  const toggleMusic = useCallback(() => {
    audioManager.toggleMusic()
    setMusicOn(audioManager.musicEnabled)
  }, [])

  const toggleSfx = useCallback(() => {
    audioManager.toggleSFX()
    setSfxOn(audioManager.sfxEnabled)
  }, [])

  const toggleAmbient = useCallback(() => {
    audioManager.toggleAmbient()
    setAmbientOn(audioManager.ambientEnabled)
  }, [])

  const visitedBreadcrumb = useMemo(() => {
    if (!state) return []
    return state.deck.slice(0, state.planesVisited).map((p) => p.name).reverse().slice(0, 6)
  }, [state])

  if (!loaded || !state) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)] text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
            Loading game...
          </p>
        </div>
      </main>
    )
  }

  const currentPlane = state.deck[state.currentPlaneIndex]
  const isArchenemy = !!state.archenemy
  const lastScheme = lastDrawnScheme && state.archenemy
    ? state.archenemy.schemeDeck.find((s) => s.id === lastDrawnScheme)
    : null

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Full-bleed plane art background */}
      {currentPlane && (
        <div className="fixed inset-0 z-0">
          <Image
            src={currentPlane.image_uris.art_crop}
            alt=""
            fill
            className="object-cover blur-2xl scale-110 opacity-25"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/70 via-[var(--color-bg)]/50 to-[var(--color-bg)]/90" />
        </div>
      )}

      {/* Achievement toast */}
      {newBadges.length > 0 && (
        <AchievementToast achievementKeys={newBadges} onDone={() => setNewBadges([])} />
      )}

      {/* Chaos overlay - tap to dismiss */}
      <AnimatePresence>
        {state.showChaosOverlay && currentPlane && (
          <ChaosOverlay plane={currentPlane} onDismiss={handleDismissChaos} />
        )}
      </AnimatePresence>

      {/* Phenomenon indicator */}
      <AnimatePresence>
        {state.phenomenonActive && currentPlane && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center pb-32 pointer-events-none"
          >
            <div className="bg-amber-900/90 backdrop-blur-sm border border-amber-500/40 rounded-xl px-6 py-3 text-center">
              <p className="text-amber-400 font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                Phenomenon!
              </p>
              <p className="text-amber-200/70 text-xs mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Planeswalking again in a moment...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal cards modal */}
      <AnimatePresence>
        {state.revealState && !state.revealState.resolved && (
          <RevealCardsModal
            cards={state.revealState.cards}
            effectType={state.revealState.effectType}
            onDismiss={handleDismissReveal}
            onReorder={handleReorderBottom}
          />
        )}
      </AnimatePresence>

      {/* End game dialog */}
      {showEndGame && currentPlane && !isArchenemy && (
        <EndGameDialog
          currentPlane={currentPlane}
          players={state.players}
          onClose={() => setShowEndGame(false)}
          onConfirm={handleEndGame}
        />
      )}

      {showEndGame && currentPlane && isArchenemy && state.archenemy && activePodId && (
        <ArchenemyEndDialog
          archenemyId={state.archenemy.archenemyId}
          archenemyName={state.archenemy.archenemyName}
          players={state.players}
          podId={activePodId}
          onClose={() => setShowEndGame(false)}
          onConfirm={handleEndGame}
        />
      )}

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 glass-strong">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/setup')} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
            <Home size={14} className="text-[var(--color-accent)]" />
            <span className="text-[14px] text-[var(--color-accent)] font-bold tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
              PlaneChaser
            </span>
          </button>
          {isArchenemy && (
            <span className="text-[10px] text-[var(--color-cta)] font-bold px-2 py-0.5 rounded-full border border-[var(--color-cta)]/40 bg-[var(--color-cta)]/10 uppercase tracking-widest" style={{ fontFamily: 'var(--font-heading)' }}>
              Archenemy
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            <span>{state.planesVisited}/{state.deck.length}</span>
            <span>{state.dieRollHistory.length} rolls</span>
          </div>
          <button onClick={toggleSfx} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            {sfxOn ? <Volume2 size={16} className="text-[var(--color-text-muted)]" /> : <VolumeX size={16} className="text-[var(--color-text-muted)] opacity-40" />}
          </button>
          <button onClick={toggleMusic} className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${musicOn ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
            <Music size={16} />
          </button>
          <button onClick={toggleAmbient} className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${ambientOn ? 'text-green-400' : 'text-[var(--color-text-muted)] opacity-40'}`}>
            <Trees size={16} />
          </button>
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-[var(--color-text-muted)]">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Visited planes breadcrumb */}
      {visitedBreadcrumb.length > 1 && (
        <div className="relative z-10 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            {visitedBreadcrumb.map((name, i) => (
              <span key={i} className={`whitespace-nowrap ${i === 0 ? 'text-[var(--color-accent)] font-semibold' : 'opacity-60'}`}>
                {i > 0 && <span className="mx-1">←</span>}
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Game content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-4 px-4 gap-3 overflow-hidden">
        {/* Archenemy: active schemes bar */}
        {isArchenemy && state.archenemy && state.archenemy.activeSchemes.length > 0 && (
          <div className="w-full max-w-[440px] space-y-2">
            <p className="text-[10px] text-[var(--color-cta)] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
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

        {/* Turn indicator */}
        {state.players && state.players.length > 1 && (
          <TurnIndicator
            playerName={
              state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex])?.display_name ?? 'Player'
            }
          />
        )}

        {/* Plane card */}
        <div className={`flex-1 flex items-center justify-center w-full max-w-[440px] ${isArchenemy && state.archenemy?.activeSchemes.length ? 'max-h-[300px]' : ''}`}>
          {currentPlane && (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 pb-2">
          {isArchenemy && (
            <Button
              onClick={handleDrawScheme}
              className="h-12 px-5 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white glow-red"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
            >
              Draw Scheme
            </Button>
          )}
          <DieRoller
            rollCount={state.rollCountThisTurn}
            currentTurnRolls={state.currentTurnRolls}
            playerName={state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex])?.display_name ?? 'Player'}
            onRoll={handleRoll}
            disabled={state.lastDieResult === 'planeswalk' || state.showChaosOverlay}
          />
        </div>

        <div className="flex gap-3 w-full max-w-[440px] pb-4">
          <Button
            onClick={handleUndo}
            variant="outline"
            disabled={state.stateHistory.length === 0}
            className="h-12 px-4 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 disabled:opacity-30"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            Undo
          </Button>
          <Button
            onClick={handleEndTurn}
            variant="outline"
            className="flex-1 h-12 border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            End Turn
          </Button>
          <Button
            onClick={() => setShowEndGame(true)}
            variant="outline"
            className="h-12 px-5 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            End Game
          </Button>
        </div>
      </div>
    </main>
  )
}
