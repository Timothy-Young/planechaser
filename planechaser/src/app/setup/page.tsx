'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { usePlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
import { useUserPods, usePodLeaderboard, useUserConquests } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { useCreateSession, useStartSession, useSessionPlayers } from '@/hooks/useGameSession'
import { useUserDecks, useCreateDefaultDeck } from '@/hooks/useDecks'
import { shuffleDeck } from '@/lib/game/shuffle'
import { saveGameState, hasActiveGame } from '@/lib/game/session-storage'
import type { GameState, SchemeCard, ArchenemyState, PlaneCard } from '@/lib/game/types'

const PLAYER_OPTIONS = [2, 3, 4, 5, 6]

type DeckMode = 'saved' | 'random'

export default function SetupPage() {
  const router = useRouter()
  const { data: corpus, isLoading, error } = usePlaneCorpus()
  const { data: schemes } = useSchemeCorpus()
  const activePodId = useAppStore((s) => s.activePodId)
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
  const setIsHost = useAppStore((s) => s.setIsHost)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const createSession = useCreateSession()
  const startSessionMutation = useStartSession()
  const { data: sessionPlayers } = useSessionPlayers(activeSessionId ?? undefined)
  const { data: pods } = useUserPods()
  const activePod = pods?.find((p) => p.id === activePodId)
  const { data: leaderboard } = usePodLeaderboard(activePodId ?? undefined, activePod?.archenemy_threshold ?? 5)
  const { data: conquests } = useUserConquests()

  const archenemy = leaderboard?.find((e) => e.is_archenemy)

  const { data: decks, isLoading: decksLoading } = useUserDecks()
  const createDefaultDeck = useCreateDefaultDeck()
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  const [playerCount, setPlayerCount] = useState(4)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [deckMode, setDeckMode] = useState<DeckMode>('saved')
  const [randomSize, setRandomSize] = useState(40)
  const [deckError, setDeckError] = useState<string | null>(null)
  const SNAP_POINTS = [10, 20, 30, 40]

  const selectedDeck = decks?.find((d) => d.id === selectedDeckId) ?? decks?.[0]

  const deckCards = useMemo(() => {
    if (!corpus || !selectedDeck) return null
    const idSet = new Set(selectedDeck.plane_ids)
    return corpus.filter((c) => idSet.has(c.id))
  }, [corpus, selectedDeck])

  const conqueredPlaneIds = useMemo(() => {
    if (!conquests) return new Set<string>()
    return new Set(conquests.map((c) => c.plane_scryfall_id))
  }, [conquests])

  useEffect(() => {
    setResumeAvailable(hasActiveGame())
  }, [])

  useEffect(() => {
    if (!decksLoading && decks && decks.length === 0 && corpus && corpus.length > 0) {
      const planeOnlyIds = corpus.filter((c) => c.card_type === 'plane').map((c) => c.id)
      createDefaultDeck.mutate(planeOnlyIds)
    }
  }, [decksLoading, decks, corpus])

  useEffect(() => {
    if (decks && decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id)
    }
  }, [decks, selectedDeckId])

  useEffect(() => {
    setDeckError(null)
  }, [selectedDeckId, deckMode])

  function startGame(archenemyMode = false) {
    let cardsToUse: PlaneCard[]
    if (deckMode === 'random') {
      const allPlanes = (corpus ?? []).filter((c) => c.card_type === 'plane')
      const size = randomSize >= allPlanes.length ? allPlanes.length : randomSize
      cardsToUse = shuffleDeck(allPlanes).slice(0, size)
    } else {
      cardsToUse = deckCards ?? corpus ?? []
    }
    if (cardsToUse.length === 0) return

    const playableCards = cardsToUse.filter((card) => !conqueredPlaneIds.has(card.id))

    if (playableCards.length === 0) {
      setDeckError('All planes in this deck are conquered! Add more planes or pick a different deck.')
      return
    }

    const deck = shuffleDeck(playableCards)

    let archenemyState: ArchenemyState | undefined
    if (archenemyMode && archenemy && schemes && schemes.length > 0) {
      const schemeDeck = shuffleDeck(schemes).map((s) => ({
        ...s,
        isOngoing: s.type_line.toLowerCase().includes('ongoing'),
      })) as SchemeCard[]

      archenemyState = {
        archenemyId: archenemy.user_id,
        archenemyName: archenemy.display_name,
        schemeDeck,
        currentSchemeIndex: 0,
        activeSchemes: [],
        schemesPlayed: 0,
      }
    }

    const players = sessionPlayers?.map((sp) => ({
      id: sp.user_id,
      display_name: sp.profile?.display_name ?? 'Player',
    })) ?? [{ id: 'host', display_name: 'Host' }]

    const turnOrder = players.map((p) => p.id)

    const state: GameState = {
      id: crypto.randomUUID(),
      config: { playerCount, deckSize: deck.length, isArchenemy: archenemyMode },
      deck,
      currentPlaneIndex: 0,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: 1,
      startedAt: Date.now(),
      archenemy: archenemyState,
      players,
      turnOrder,
      currentTurnIndex: 0,
      currentTurnRolls: [],
      turnHistory: [],
      stateHistory: [],
      showChaosOverlay: false,
      revealState: null,
      phenomenonActive: false,
    }

    saveGameState(state)

    if (activeSessionId) {
      startSessionMutation.mutate({
        sessionId: activeSessionId,
        initialState: state,
        firstPlayerId: turnOrder[0],
      })
    }

    router.push('/game')
  }

  function resumeGame() {
    router.push('/game')
  }

  function handleArchenemyGame() {
    createSession.mutate(
      { podId: activePodId ?? undefined },
      {
        onSuccess: (session) => {
          setActiveSessionId(session.id)
          setIsHost(true)
          router.push(`/lobby?code=${session.session_code}&archenemy=true`)
        },
      }
    )
  }

  function handleCreateMultiplayerGame() {
    createSession.mutate(
      { podId: activePodId ?? undefined },
      {
        onSuccess: (session) => {
          setActiveSessionId(session.id)
          setIsHost(true)
          router.push(`/lobby?code=${session.session_code}`)
        },
      }
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-gold)]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px] space-y-6"
        >
          {/* Title */}
          <div className="text-center space-y-2">
            <h1
              className="text-[32px] md:text-[40px] font-bold text-[var(--color-accent)] text-glow-purple tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              PlaneChaser
            </h1>
            <p className="text-[13px] text-[var(--color-text-muted)] tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
              New Planechase Session
            </p>
          </div>

          {/* Resume game */}
          {resumeAvailable && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resumeGame}
              className="w-full rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8 p-5 text-center transition-all hover:bg-[var(--color-accent)]/15 glow-purple"
            >
              <p className="text-[17px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Resume Game
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                You have an active session
              </p>
            </motion.button>
          )}

          {/* Archenemy alert */}
          {archenemy && activePod && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              onClick={() => handleArchenemyGame()}
              disabled={createSession.isPending}
              className="w-full rounded-2xl border border-[var(--color-cta)]/40 bg-[var(--color-cta)]/8 p-5 text-center transition-all hover:bg-[var(--color-cta)]/15 glow-red disabled:opacity-50"
            >
              <p className="text-[17px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Archenemy Showdown
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {archenemy.display_name} has {archenemy.conquered_count} conquests
              </p>
            </motion.button>
          )}

          {/* Config card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-6 space-y-6"
          >
            {/* Players */}
            <div className="space-y-3">
              <label className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                Players
              </label>
              <div className="flex gap-2">
                {PLAYER_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className={`flex-1 h-11 rounded-xl text-[15px] font-semibold transition-all ${
                      playerCount === n
                        ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Deck mode toggle */}
            <div className="space-y-3">
              <label className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                Planar Deck
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeckMode('saved')}
                  className={`flex-1 h-10 rounded-xl text-[13px] font-semibold transition-all ${
                    deckMode === 'saved'
                      ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Saved Deck
                </button>
                <button
                  onClick={() => setDeckMode('random')}
                  className={`flex-1 h-10 rounded-xl text-[13px] font-semibold transition-all ${
                    deckMode === 'random'
                      ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Random
                </button>
              </div>
            </div>

            {/* Saved deck mode */}
            {deckMode === 'saved' && (
              <div className="space-y-2">
                {decksLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Loading decks...</span>
                  </div>
                ) : decks && decks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {decks.map((d) => {
                      const conqueredCount = d.plane_ids.filter((id) => conqueredPlaneIds.has(id)).length
                      return (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDeckId(d.id)}
                          className={`h-11 rounded-xl text-[13px] font-semibold px-4 text-left transition-all ${
                            selectedDeck?.id === d.id
                              ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                          }`}
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {d.name} ({d.plane_ids.length} cards{conqueredCount > 0 ? `, ${conqueredCount} conquered` : ''})
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    No decks yet — one will be created automatically.
                  </p>
                )}
                <button
                  onClick={() => router.push('/decks')}
                  className="w-full h-10 rounded-xl text-[13px] font-semibold border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/40 transition-all"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  + Create New Deck
                </button>
              </div>
            )}

            {/* Random mode */}
            {deckMode === 'random' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {(() => {
                      const totalPlanes = corpus?.filter(c => c.card_type === 'plane').length ?? 185
                      return randomSize >= totalPlanes ? 'All planes' : `${randomSize} random planes`
                    })()}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={corpus?.filter(c => c.card_type === 'plane').length ?? 185}
                  value={randomSize}
                  onChange={(e) => setRandomSize(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent-deep)]"
                />
                <div className="flex justify-between">
                  {[...SNAP_POINTS, corpus?.filter(c => c.card_type === 'plane').length ?? 185].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRandomSize(n)}
                      className={`text-[11px] px-2 py-1 rounded-lg transition-all ${
                        randomSize === n
                          ? 'bg-[var(--color-accent-deep)] text-white'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {n >= (corpus?.filter(c => c.card_type === 'plane').length ?? 185) ? 'All' : n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  Loading plane cards...
                </p>
              </div>
            )}
            {error && (
              <p className="text-[12px] text-[var(--color-destructive)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                Failed to load planes. Check connection and refresh.
              </p>
            )}

            {/* Deck error */}
            {deckError && (
              <p className="text-[12px] text-[var(--color-destructive)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                {deckError}
              </p>
            )}

            {/* Start button */}
            <Button
              onClick={() => startGame(false)}
              disabled={isLoading || (deckMode === 'saved' ? (!deckCards || deckCards.length === 0) : (!corpus || corpus.length === 0))}
              className="w-full h-14 text-[17px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white transition-all"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 30px rgba(124, 58, 237, 0.4)' }}
            >
              Start Game
            </Button>
          </motion.div>

          {/* Multiplayer button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleCreateMultiplayerGame}
            disabled={createSession.isPending}
            className="w-full rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5 text-center transition-all hover:bg-[var(--color-accent)]/10 cursor-pointer"
          >
            <p className="text-[17px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {createSession.isPending ? 'Creating...' : 'Create Multiplayer Game'}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Get a code for friends to join
            </p>
          </motion.button>
        </motion.div>
      </div>
    </main>
  )
}
