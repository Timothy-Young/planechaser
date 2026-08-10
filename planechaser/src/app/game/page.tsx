'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Music, Home, Sun, Moon, Trees } from 'lucide-react'
import { gameReducer } from '@/lib/game/engine'
import { loadGameState, saveGameState, clearGameState } from '@/lib/game/session-storage'
import { RevealCardsModal } from '@/components/reveal-cards-modal'
import { EndGameDialog } from '@/components/end-game-dialog'
import { ArchenemyEndDialog } from '@/components/archenemy-end-dialog'
import { StandaloneArchenemyEndDialog } from '@/components/game/standalone-archenemy-end-dialog'
import { ArchenemyBoard } from '@/components/game/archenemy-board'
import { PlanechaseBoard } from '@/components/game/planechase-board'
import { SchemeSheet } from '@/components/game/scheme-sheet'
import { Button } from '@/components/ui/button'
import { useSyncGameState, useEndSession } from '@/hooks/useGameSession'
import { ChaosOverlay } from '@/components/chaos-overlay'
import { CardZoomModal } from '@/components/card-zoom-modal'
import { PlayerListModal } from '@/components/player-list-modal'
import { useRecordGameSession } from '@/hooks/usePods'
import { useGrantSessionAchievements } from '@/hooks/useAchievements'
import { AchievementToast } from '@/components/achievement-toast'
import { audioManager } from '@/lib/audio/audio-manager'
import { getPlaneEnvironment, AMBIENT_URLS } from '@/lib/game/plane-environments'
import { useAppStore } from '@/store/app-store'
import type {
  GameState,
  DieResult,
  PlaneCard as PlaneCardType,
  ArchenemySide,
} from '@/lib/game/types'

function planeswalkAndCheckPhenomenon(prev: GameState): GameState {
  const next = gameReducer(prev, { type: 'PLANESWALK' })
  const landedCard = next.deck[next.currentPlaneIndex]
  if (landedCard?.card_type === 'phenomenon') {
    return { ...next, phenomenonActive: true }
  }
  return next
}

export default function GamePage() {
  const router = useRouter()
  const [state, setState] = useState<GameState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [showEndGame, setShowEndGame] = useState(false)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [breadcrumbPreview, setBreadcrumbPreview] = useState<{ src: string; name: string } | null>(null)
  const [pendingSecondChaos, setPendingSecondChaos] = useState(false)
  const [showPlayerList, setShowPlayerList] = useState(false)
  const [chaosPlaneOverride, setChaosPlaneOverride] = useState<PlaneCardType | null>(null)
  const [musicOn, setMusicOn] = useState(false)
  const [sfxOn, setSfxOn] = useState(true)
  const [ambientOn, setAmbientOn] = useState(true)
  const recordSession = useRecordGameSession()
  const grantAchievements = useGrantSessionAchievements()
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

  // After the last game the badge toast owns navigation (see handleEndGame).
  // This is the safety net: if the toast is interrupted and never calls
  // onDone, the player would be stranded on an already-cleared game screen.
  // AchievementToast shows each badge for 2.5s plus a 400ms exit.
  useEffect(() => {
    if (newBadges.length === 0) return
    const timer = setTimeout(
      () => router.push('/setup'),
      newBadges.length * 2900 + 2000,
    )
    return () => clearTimeout(timer)
  }, [newBadges, router])

  useEffect(() => {
    const saved = loadGameState()
    if (!saved) {
      router.replace('/setup')
      return
    }
    setState({ ...saved, secondPlaneIndex: saved.secondPlaneIndex ?? null })
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

    const currentCard = state.deck[state.currentPlaneIndex]
    const isSpatialMerge = currentCard?.chaos_effect_type === 'spatial_merge'

    const timer = setTimeout(() => {
      setSlideDirection('right')
      setState((prev) => {
        if (!prev) return prev
        const actionType = isSpatialMerge ? 'RESOLVE_SPATIAL_MERGE' : 'RESOLVE_PHENOMENON'
        const next = gameReducer(prev, { type: actionType })
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
          return planeswalkAndCheckPhenomenon(prev)
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
      audioManager.playPlaneswalkLayered()
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return planeswalkAndCheckPhenomenon(prev)
        })
      }, 1200)
    } else if (plane.chaos_effect_type === 'planeswalk_no_leave') {
      // Norn's Seedcore: planeswalk to the next plane without leaving this one
      setSlideDirection('right')
      audioManager.playPlaneswalkLayered()
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          // PLANESWALK_NO_LEAVE scans to the next plane card (bottoming
          // phenomena), so it can never land on a phenomenon
          return gameReducer(prev, { type: 'PLANESWALK_NO_LEAVE' })
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

  const handleReorderTop = useCallback((cardIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'REORDER_TOP', cardIds })
    })
  }, [])

  const handleDismissReveal = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'DISMISS_REVEAL' })
    })
  }, [])

  const handleDismissChaos = useCallback(() => {
    if (!state) return
    // Which plane's overlay is being dismissed: the override (second plane of
    // a dual state) or the primary plane.
    const plane = chaosPlaneOverride ?? state.deck[state.currentPlaneIndex]
    if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
      setTimeout(() => handleSpecialChaos(plane), 300)
    }
    // Queue the second plane's chaos only when dismissing the PRIMARY
    // overlay — dismissing the second plane's overlay must not re-queue it.
    if (chaosPlaneOverride === null && state.secondPlaneIndex !== null) {
      setPendingSecondChaos(true)
    }
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'DISMISS_CHAOS' })
    })
    setChaosPlaneOverride(null)
  }, [state, chaosPlaneOverride, handleSpecialChaos])

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

  const handleManualPlaneswalk = useCallback(() => {
    setSlideDirection('right')
    setState((prev) => {
      if (!prev) return prev
      return planeswalkAndCheckPhenomenon(prev)
    })
  }, [])

  const handleManualChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return { ...prev, showChaosOverlay: true }
    })
  }, [])

  const handleShuffle = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'SHUFFLE_REMAINING' })
    })
  }, [])

  const handleEliminatePlayer = useCallback((playerId: string) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ELIMINATE_PLAYER', playerId })
    })
  }, [])

  const handleRestorePlayer = useCallback((playerId: string) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'RESTORE_PLAYER', playerId })
    })
  }, [])

  const handleResetRolls = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'RESET_ROLL_COUNT' })
    })
  }, [])

  const handleAddRoll = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ADD_ROLL' })
    })
  }, [])

  const handleRemoveRoll = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'REMOVE_ROLL' })
    })
  }, [])

  const handleEndGame = useCallback(async (winnerSide?: ArchenemySide) => {
    let earnedBadges = false
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

      // Record the game, then ask the server which badges that earned. The
      // client no longer evaluates criteria or names keys — see
      // supabase/migrations/025_server_side_achievements.sql.
      try {
        const sessionId = await recordSession.mutateAsync({
          hostUserId: user.id,
          planesVisited: visitedPlanes,
          dieRollHistory: state.dieRollHistory,
          isArchenemy: !!state.archenemy,
          podId: activePodId ?? undefined,
          turnLog: finalTurnLog,
          players: state.players,
          startedAt: state.startedAt,
          winnerSide,
        })

        const newlyEarned = await grantAchievements.mutateAsync(sessionId)
        if (newlyEarned.length > 0) {
          setNewBadges(newlyEarned)
          audioManager.playSFX('achievement')
          earnedBadges = true
        }
      } catch (err) {
        // A failed write must not strand the player on a finished game.
        console.error('[PlaneChaser] Failed to record game or grant achievements:', err)
      }
    }
    audioManager.stopAll()
    if (activeSessionId && isHost) {
      endSessionMutation.mutate(activeSessionId)
      setActiveSessionId(null)
    }
    clearGameState()

    // When badges were earned, stay put so AchievementToast can actually play;
    // it calls onDone after cycling through them, which navigates. Previously
    // this pushed immediately and unmounted the toast before it was ever seen.
    if (!earnedBadges) {
      router.push('/setup')
    }
  }, [router, state, user, activePodId, activeSessionId, isHost, recordSession, grantAchievements, endSessionMutation, setActiveSessionId])

  const handleSetSchemeInMotion = useCallback(() => {
    setState((prev) => (prev ? gameReducer(prev, { type: 'SET_SCHEME_IN_MOTION' }) : prev))
  }, [])

  const handleDismissScheme = useCallback((instanceId: string) => {
    setState((prev) => (prev ? gameReducer(prev, { type: 'DISMISS_SCHEME', instanceId }) : prev))
  }, [])

  const handleEndArchenemyTurn = useCallback(() => {
    setState((prev) => (prev ? gameReducer(prev, { type: 'END_ARCHENEMY_TURN' }) : prev))
  }, [])

  const handleAdjustLife = useCallback((playerId: string, delta: number) => {
    setState((prev) => (prev ? gameReducer(prev, { type: 'ADJUST_LIFE', playerId, delta }) : prev))
  }, [])

  const handleSetLife = useCallback((playerId: string, value: number) => {
    setState((prev) => (prev ? gameReducer(prev, { type: 'SET_LIFE', playerId, value }) : prev))
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

  useEffect(() => {
    if (!pendingSecondChaos || !state || state.secondPlaneIndex === null) return
    if (state.showChaosOverlay) return
    const secondPlaneCard = state.deck[state.secondPlaneIndex]
    if (secondPlaneCard) {
      setChaosPlaneOverride(secondPlaneCard)
      setState((prev) => prev ? { ...prev, showChaosOverlay: true } : prev)
    }
    setPendingSecondChaos(false)
  }, [pendingSecondChaos, state?.showChaosOverlay, state?.secondPlaneIndex])

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
  const archenemy = state.archenemy
  const isArchenemy = !!archenemy
  // A standalone Archenemy game has no planar deck, so nothing on the
  // Planechase board has anything to render.
  const isStandaloneArchenemy = state.config.mode === 'archenemy'

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
        <AchievementToast
          achievementKeys={newBadges}
          onDone={() => {
            setNewBadges([])
            router.push('/setup')
          }}
        />
      )}

      {/* Chaos overlay - tap to dismiss */}
      <AnimatePresence>
        {state.showChaosOverlay && currentPlane && (
          <ChaosOverlay
            plane={chaosPlaneOverride ?? currentPlane}
            onDismiss={handleDismissChaos}
          />
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
            onReorderTop={handleReorderTop}
          />
        )}
      </AnimatePresence>

      {/* End game dialog.
          A standalone game records a winning side and nothing else — there is
          no plane to conquer and no pod involved. A combined game keeps the
          conquest dialog, but only when a pod is actually active; without one
          it falls back to the plain dialog rather than rendering nothing. */}
      {showEndGame && isStandaloneArchenemy && archenemy && (
        <StandaloneArchenemyEndDialog
          archenemyName={archenemy.archenemyName}
          turnNumber={archenemy.turnNumber}
          onClose={() => setShowEndGame(false)}
          onConfirm={(winner) => handleEndGame(winner)}
        />
      )}

      {showEndGame && !isStandaloneArchenemy && currentPlane && isArchenemy && archenemy && activePodId && (
        <ArchenemyEndDialog
          archenemyId={archenemy.archenemyId}
          archenemyName={archenemy.archenemyName}
          players={state.players}
          podId={activePodId}
          onClose={() => setShowEndGame(false)}
          onConfirm={() => handleEndGame()}
        />
      )}

      {showEndGame && !isStandaloneArchenemy && currentPlane && !(isArchenemy && activePodId) && (
        <EndGameDialog
          currentPlane={currentPlane}
          players={state.players}
          onClose={() => setShowEndGame(false)}
          onConfirm={() => handleEndGame()}
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
            {isStandaloneArchenemy && archenemy ? (
              <>
                <span>{archenemy.schemesInMotion.length} in motion</span>
                <span>{archenemy.schemesPlayed} played</span>
              </>
            ) : (
              <>
                <span>{state.planesVisited}/{state.deck.length}</span>
                <span>{state.dieRollHistory.length} rolls</span>
              </>
            )}
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

      {/* Board — one mode's worth of UI, never a stack of conditionals */}
      {isStandaloneArchenemy && archenemy ? (
        <ArchenemyBoard
          archenemy={archenemy}
          players={state.players}
          life={state.life ?? {}}
          eliminatedPlayerIds={state.eliminatedPlayerIds ?? []}
          onSetSchemeInMotion={handleSetSchemeInMotion}
          onDismissScheme={handleDismissScheme}
          onEndArchenemyTurn={handleEndArchenemyTurn}
          onAdjustLife={handleAdjustLife}
          onSetLife={handleSetLife}
          onEliminatePlayer={handleEliminatePlayer}
          onRestorePlayer={handleRestorePlayer}
        />
      ) : (
        <PlanechaseBoard
          state={state}
          slideDirection={slideDirection}
          visitedBreadcrumb={visitedBreadcrumb}
          onRoll={handleRoll}
          onEndTurn={handleEndTurn}
          onUndo={handleUndo}
          onShuffle={handleShuffle}
          onResetRolls={handleResetRolls}
          onAddRoll={handleAddRoll}
          onRemoveRoll={handleRemoveRoll}
          onManualPlaneswalk={handleManualPlaneswalk}
          onManualChaos={handleManualChaos}
          onShowPlayers={state.players.length > 1 ? () => setShowPlayerList(true) : undefined}
          onPreviewPlane={(card) =>
            setBreadcrumbPreview({ src: card.image_uris.border_crop, name: card.name })
          }
          schemeSlot={
            archenemy ? (
              <SchemeSheet
                archenemy={archenemy}
                onSetSchemeInMotion={handleSetSchemeInMotion}
                onDismissScheme={handleDismissScheme}
              />
            ) : undefined
          }
        />
      )}

      <div className="relative z-10 flex gap-3 w-full max-w-[440px] mx-auto px-4 pb-4">
        <Button
          onClick={() => setShowEndGame(true)}
          variant="outline"
          className="flex-1 h-12 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
          style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
        >
          End Game
        </Button>
      </div>

      {/* Player list modal */}
      {showPlayerList && (
        <PlayerListModal
          players={state.players}
          turnOrder={state.turnOrder}
          currentTurnIndex={state.currentTurnIndex}
          eliminatedPlayerIds={state.eliminatedPlayerIds ?? []}
          onEliminate={handleEliminatePlayer}
          onRestore={handleRestorePlayer}
          onClose={() => setShowPlayerList(false)}
        />
      )}

      <CardZoomModal
        src={breadcrumbPreview?.src ?? null}
        alt={breadcrumbPreview?.name ?? ''}
        onClose={() => setBreadcrumbPreview(null)}
      />
    </main>
  )
}
