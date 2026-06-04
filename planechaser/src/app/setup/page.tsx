'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArchenemyPicker } from '@/components/archenemy-picker'
import { useFullPlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
import { useUserPods, usePodLeaderboard, useUserConquests, usePodMembers } from '@/hooks/usePods'
import { useUserSchemeDecks } from '@/hooks/useSchemeDecks'
import { useAppStore } from '@/store/app-store'
import { useCreateSession, useStartSession, useSessionPlayers } from '@/hooks/useGameSession'
import { useUserDecks, useCreateDefaultDeck } from '@/hooks/useDecks'
import { shuffleDeck } from '@/lib/game/shuffle'
import { saveGameState, hasActiveGame } from '@/lib/game/session-storage'
import type { GameState, SchemeCard, ArchenemyState, PlaneCard } from '@/lib/game/types'

const PLAYER_OPTIONS = [2, 3, 4, 5, 6]

type DeckMode = 'saved' | 'random'

export default function SetupPage() {
  return (
    <Suspense>
      <SetupPageInner />
    </Suspense>
  )
}

function SetupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const podStartMode = searchParams.get('podStart') === 'true'
  const podIdFromParam = searchParams.get('podId')
  const { data: corpus, isLoading, error } = useFullPlaneCorpus()
  const { data: schemes } = useSchemeCorpus()
  const user = useAppStore((s) => s.user)
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
  const podStartPodId = podIdFromParam ?? activePodId ?? undefined
  const { data: podMembers } = usePodMembers(podStartMode ? podStartPodId : undefined)
  const podStartPod = pods?.find((p) => p.id === podStartPodId)

  const archenemy = leaderboard?.find((e) => e.is_archenemy)

  const { data: decks, isLoading: decksLoading } = useUserDecks()
  const createDefaultDeck = useCreateDefaultDeck()
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  const [playerCount, setPlayerCount] = useState(4)
  const [selectedPodPlayerIds, setSelectedPodPlayerIds] = useState<Set<string>>(new Set())
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [deckMode, setDeckMode] = useState<DeckMode>('random')
  const [randomSize, setRandomSize] = useState(40)
  const [deckError, setDeckError] = useState<string | null>(null)
  const [archenemyMode, setArchenemyMode] = useState(false)
  const [designatedArchenemyId, setDesignatedArchenemyId] = useState<string | null>(null)
  const [showArchenemyPicker, setShowArchenemyPicker] = useState(false)
  const [selectedSchemeDeckId, setSelectedSchemeDeckId] = useState<string | null>(null)
  const { data: schemeDecks } = useUserSchemeDecks()
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
    if (podStartMode && podMembers && podMembers.length > 0 && selectedPodPlayerIds.size === 0) {
      setSelectedPodPlayerIds(new Set(podMembers.map((m) => m.user_id)))
    }
  }, [podMembers, podStartMode])

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
      setDeckError('You have conquered every plane in this deck! Build a new deck or add more planes to keep exploring the multiverse.')
      return
    }

    const deck = shuffleDeck(playableCards)

    const players = podStartMode && podMembers && podMembers.length > 0
      ? podMembers
          .filter((m) => selectedPodPlayerIds.has(m.user_id))
          .map((m) => ({
            id: m.user_id,
            display_name: m.profile?.display_name ?? 'Player',
          }))
      : sessionPlayers?.map((sp) => ({
          id: sp.user_id,
          display_name: sp.profile?.display_name ?? 'Player',
        })) ?? [{ id: user?.id ?? 'host', display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player' }]

    let archenemyState: ArchenemyState | undefined
    if (archenemyMode && designatedArchenemyId && schemes && schemes.length > 0) {
      const designatedPlayer = players.find((p) => p.id === designatedArchenemyId)
        ?? leaderboard?.find((e) => e.user_id === designatedArchenemyId)

      let schemesToUse = schemes
      if (selectedSchemeDeckId) {
        const schemeDeck = schemeDecks?.find((d) => d.id === selectedSchemeDeckId)
        if (schemeDeck) {
          const deckSchemeSet = new Set(schemeDeck.scheme_ids)
          schemesToUse = schemes.filter((s) => deckSchemeSet.has(s.id))
        }
      }

      const schemeDeck = shuffleDeck(schemesToUse).map((s) => ({
        ...s,
        isOngoing: s.type_line.toLowerCase().includes('ongoing'),
      })) as SchemeCard[]

      archenemyState = {
        archenemyId: designatedArchenemyId,
        archenemyName: designatedPlayer?.display_name ?? 'Archenemy',
        schemeDeck,
        currentSchemeIndex: 0,
        activeSchemes: [],
        schemesPlayed: 0,
      }
    }

    const turnOrder = players.map((p) => p.id)

    const state: GameState = {
      id: crypto.randomUUID(),
      config: { playerCount: podStartMode ? selectedPodPlayerIds.size : playerCount, deckSize: deck.length, isArchenemy: archenemyMode },
      deck,
      currentPlaneIndex: 0,
      secondPlaneIndex: null,
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
      turnStartPlaneIndex: 0,
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
            {podStartMode && podStartPod && (
              <p className="text-[12px] text-[var(--color-accent)] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                Starting with pod: {podStartPod.name} ({podMembers?.length ?? '…'} players)
              </p>
            )}
          </div>

          {/* Resume game */}
          {resumeAvailable && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.97 }}
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

          {/* Archenemy section */}
          {activePod && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-5 space-y-4"
            >
              {/* Auto-detect banner */}
              {archenemy && !archenemyMode && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setArchenemyMode(true)
                    const eligible = leaderboard?.filter((e) => e.is_archenemy) ?? []
                    if (eligible.length === 1 && eligible[0].user_id !== activePod.last_archenemy_user_id) {
                      setDesignatedArchenemyId(eligible[0].user_id)
                    } else {
                      setShowArchenemyPicker(true)
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--color-cta)]/40 bg-[var(--color-cta)]/8 p-4 text-center transition-all hover:bg-[var(--color-cta)]/15"
                >
                  <p className="text-[15px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    Archenemy Detected
                  </p>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                    {archenemy.display_name} has {archenemy.conquered_count} conquests — tap to enable
                  </p>
                </motion.button>
              )}

              {/* Manual toggle */}
              <div className="flex items-center justify-between">
                <label
                  className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Archenemy Mode
                </label>
                <button
                  onClick={() => {
                    const next = !archenemyMode
                    setArchenemyMode(next)
                    if (!next) {
                      setDesignatedArchenemyId(null)
                      setShowArchenemyPicker(false)
                      setSelectedSchemeDeckId(null)
                    } else {
                      const eligible = archenemy
                        ? (leaderboard?.filter((e) => e.is_archenemy) ?? [])
                        : (leaderboard ?? [])
                      if (eligible.length === 1 && eligible[0].user_id !== activePod.last_archenemy_user_id) {
                        setDesignatedArchenemyId(eligible[0].user_id)
                      } else if (eligible.length > 0) {
                        setShowArchenemyPicker(true)
                      }
                    }
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    archenemyMode
                      ? 'bg-[var(--color-cta)]'
                      : 'bg-[var(--color-border)]'
                  }`}
                >
                  <motion.div
                    animate={{ x: archenemyMode ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Archenemy Picker */}
              {archenemyMode && showArchenemyPicker && !designatedArchenemyId && (
                <ArchenemyPicker
                  eligiblePlayers={
                    (archenemy
                      ? (leaderboard?.filter((e) => e.is_archenemy) ?? [])
                      : (leaderboard ?? [])
                    ).map((e) => ({ id: e.user_id, display_name: e.display_name, conquered_count: e.conquered_count }))
                  }
                  lastArchenemyId={activePod.last_archenemy_user_id}
                  onSelect={(playerId) => {
                    setDesignatedArchenemyId(playerId)
                    setShowArchenemyPicker(false)
                  }}
                  onCancel={() => {
                    setArchenemyMode(false)
                    setShowArchenemyPicker(false)
                  }}
                />
              )}

              {/* Designated archenemy display + scheme deck selector */}
              {archenemyMode && designatedArchenemyId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--color-cta)]/30 bg-[var(--color-cta)]/8 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
                        Archenemy: {
                          leaderboard?.find((e) => e.user_id === designatedArchenemyId)?.display_name ?? 'Unknown'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDesignatedArchenemyId(null)
                        setShowArchenemyPicker(true)
                      }}
                      className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Scheme deck selector */}
                  <div className="space-y-2">
                    <label
                      className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Scheme Deck
                    </label>
                    <select
                      value={selectedSchemeDeckId ?? ''}
                      onChange={(e) => setSelectedSchemeDeckId(e.target.value || null)}
                      className="w-full h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[13px] px-3 transition-colors focus:border-[var(--color-cta)]/50 focus:outline-none"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <option value="">All Schemes (default)</option>
                      {schemeDecks?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.scheme_ids.length} schemes)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => router.push('/scheme-decks')}
                      className="text-[12px] text-[var(--color-accent)] hover:underline"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Manage scheme decks
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Config card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-6 space-y-6"
          >
            {/* Players */}
            {podStartMode && podMembers && podMembers.length > 0 ? (
              <div className="space-y-3">
                <p
                  className="text-[13px] font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Players in this game
                </p>
                <div className="space-y-2">
                  {podMembers.map((member) => {
                    const memberId = member.user_id
                    const displayName = member.profile?.display_name ?? 'Player'
                    const isSelected = selectedPodPlayerIds.has(memberId)
                    return (
                      <button
                        key={memberId}
                        onClick={() => {
                          setSelectedPodPlayerIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(memberId)) {
                              next.delete(memberId)
                            } else {
                              next.add(memberId)
                            }
                            return next
                          })
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                            : 'border-[var(--color-text-muted)]'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-[14px] text-[var(--color-text)]"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {displayName}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {selectedPodPlayerIds.size} player{selectedPodPlayerIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            ) : (
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
            )}

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

            {/* All conquered message */}
            {deckError && (
              <div className="rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/8 p-4 text-center space-y-1">
                <p className="text-[14px] font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Total Domination!
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {deckError}
                </p>
              </div>
            )}

            {/* Start button */}
            <Button
              onClick={() => startGame(archenemyMode)}
              disabled={isLoading || (podStartMode && selectedPodPlayerIds.size < 2) || (deckMode === 'saved' ? (!deckCards || deckCards.length === 0) : (!corpus || corpus.length === 0))}
              className="w-full h-14 text-[17px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white transition-all"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 30px rgba(124, 58, 237, 0.4)' }}
            >
              Start Game
            </Button>
          </motion.div>

          {/* Multiplayer button — hidden when starting directly from pod */}
          {!podStartMode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.97 }}
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
          )}
        </motion.div>
      </div>
    </main>
  )
}
