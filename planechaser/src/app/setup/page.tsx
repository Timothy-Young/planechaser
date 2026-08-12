'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArchenemyPicker } from '@/components/archenemy-picker'
import { GameModeSelector } from '@/components/game/game-mode-selector'
import { PlayerRoster } from '@/components/game/player-roster'
import { useFullPlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
import {
  useUserPods,
  usePodLeaderboard,
  useUserConquests,
  usePodMembers,
  useFriends,
} from '@/hooks/usePods'
import { useUserSchemeDecks } from '@/hooks/useSchemeDecks'
import { useAppStore } from '@/store/app-store'
import { useCreateSession, useStartSession, useSessionPlayers } from '@/hooks/useGameSession'
import { useUserDecks, useCreateDefaultDeck } from '@/hooks/useDecks'
import { shuffleDeck } from '@/lib/game/shuffle'
import { buildArchenemyState, buildLifeTotals } from '@/lib/game/archenemy-setup'
import {
  addSlot,
  canStart,
  fillSlot,
  fromPodMembers,
  guestSlot,
  isRostered,
  removeSlot,
  renameSlot,
  reorder,
  seedSolo,
  toPlayers,
  type Roster,
} from '@/lib/game/roster'
import { saveGameState, hasActiveGame } from '@/lib/game/session-storage'
import type { GameState, PlaneCard, GameMode, Player } from '@/lib/game/types'

/** Seats a table starts with when there is no pod to fill it. */
const DEFAULT_TABLE_SIZE = 4

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
  const podIdFromParam = searchParams.get('podId')
  const { data: corpus, isLoading, error } = useFullPlaneCorpus()
  const { data: schemes } = useSchemeCorpus()
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const setActivePodId = useAppStore((s) => s.setActivePodId)
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
  const setIsHost = useAppStore((s) => s.setIsHost)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const includeGoldBorder = useAppStore((s) => s.includeGoldBorder)
  const setIncludeGoldBorder = useAppStore((s) => s.setIncludeGoldBorder)
  const createSession = useCreateSession()
  const startSessionMutation = useStartSession()
  const { data: sessionPlayers } = useSessionPlayers(activeSessionId ?? undefined)
  const { data: pods } = useUserPods()
  const activePod = pods?.find((p) => p.id === activePodId)
  const { data: leaderboard } = usePodLeaderboard(activePodId ?? undefined, activePod?.archenemy_threshold ?? 5)
  const { data: conquests } = useUserConquests()
  const { data: podMembers } = usePodMembers(activePodId ?? undefined)
  const { data: friends } = useFriends()

  const archenemy = leaderboard?.find((e) => e.is_archenemy)

  const { data: decks, isLoading: decksLoading } = useUserDecks()
  const createDefaultDeck = useCreateDefaultDeck()
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  const [roster, setRoster] = useState<Roster>([])
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [deckMode, setDeckMode] = useState<DeckMode>('random')
  const [randomSize, setRandomSize] = useState(40)
  const [deckError, setDeckError] = useState<string | null>(null)
  const [mode, setMode] = useState<GameMode>('planechase')
  const [designatedArchenemyId, setDesignatedArchenemyId] = useState<string | null>(null)
  const [showArchenemyPicker, setShowArchenemyPicker] = useState(false)
  const [selectedSchemeDeckId, setSelectedSchemeDeckId] = useState<string | null>(null)
  const { data: schemeDecks } = useUserSchemeDecks()
  const SNAP_POINTS = [10, 20, 30, 40]

  const archenemyMode = mode === 'archenemy' || mode === 'both'
  const isStandaloneArchenemy = mode === 'archenemy'

  const selfPlayer: Player | null = user
    ? {
        id: user.id,
        display_name:
          user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
      }
    : null

  /**
   * Seeds the roster for whichever table is in play, and reseeds when that
   * changes: a pod fills it with its members, and no pod seeds the signed-in
   * user plus empty seats.
   *
   * Adjusting state during render rather than in an effect — the documented
   * React pattern for "derive from a prop that changed" — because an effect
   * here would render the old pod's roster for a frame before correcting it.
   */
  const seedKey = activePodId ?? (selfPlayer ? 'solo' : null)
  const podReady = !activePodId || !!podMembers
  if (seedKey && podReady && seedKey !== seededFor) {
    setSeededFor(seedKey)
    setRoster((prev) =>
      activePodId
        ? // Switching pods discards manual edits. Selecting a pod is an explicit
          // act, and merging the old table into the new one is guesswork.
          fromPodMembers(podMembers ?? [])
        : // Leaving a pod keeps whoever was added by hand, and only falls back
          // to a fresh table when that leaves nobody.
          (() => {
            const kept = prev.filter((slot) => slot.source !== 'pod')
            return kept.length > 0 ? kept : seedSolo(selfPlayer, DEFAULT_TABLE_SIZE)
          })(),
    )
    if (designatedArchenemyId) setDesignatedArchenemyId(null)
  }

  /** Keeps a designation from surviving the player it points at. */
  function applyRoster(next: Roster) {
    setRoster(next)
    if (designatedArchenemyId && !isRostered(next, designatedArchenemyId)) {
      setDesignatedArchenemyId(null)
    }
  }

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

  // `?podId=` is how the pods page links straight into a game with that pod.
  // It selects the pod and nothing else — the roster follows from that.
  useEffect(() => {
    if (podIdFromParam && podIdFromParam !== activePodId) setActivePodId(podIdFromParam)
  }, [podIdFromParam, activePodId, setActivePodId])

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

  function startGame() {
    // A standalone Archenemy game has no planar deck at all — no planeswalking,
    // so nothing to draw from and nothing to exclude.
    let deck: PlaneCard[] = []

    if (!isStandaloneArchenemy) {
      let cardsToUse: PlaneCard[]
      if (deckMode === 'random') {
        let allPlanes = (corpus ?? []).filter((c) => c.card_type === 'plane')
        if (!includeGoldBorder) allPlanes = allPlanes.filter((c) => c.border_color !== 'gold')
        const size = randomSize >= allPlanes.length ? allPlanes.length : randomSize
        cardsToUse = shuffleDeck(allPlanes).slice(0, size)
      } else {
        let cards = deckCards ?? corpus ?? []
        if (!includeGoldBorder) cards = cards.filter((c) => c.border_color !== 'gold')
        cardsToUse = cards
      }
      if (cardsToUse.length === 0) return

      const playableCards = cardsToUse.filter((card) => !conqueredPlaneIds.has(card.id))

      if (playableCards.length === 0) {
        setDeckError('You have conquered every plane in this deck! Build a new deck or add more planes to keep exploring the multiverse.')
        return
      }

      deck = shuffleDeck(playableCards)
    }

    // A live multiplayer session has real joiners; they outrank the local
    // roster, which was only ever a stand-in for people who are not here.
    const players: Player[] =
      sessionPlayers && sessionPlayers.length > 0
        ? sessionPlayers.map((sp) => ({
            id: sp.user_id,
            display_name: sp.profile?.display_name ?? 'Player',
          }))
        : toPlayers(roster)

    // Shared with the multiplayer lobby so the two cannot drift.
    const archenemyState = archenemyMode
      ? buildArchenemyState({
          players,
          designatedArchenemyId,
          schemes,
          schemeDecks,
          selectedSchemeDeckId,
          fallbackName: leaderboard?.find((e) => e.user_id === designatedArchenemyId)
            ?.display_name,
        }) ?? undefined
      : undefined

    if (archenemyMode && !archenemyState) return

    const turnOrder = players.map((p) => p.id)

    const life = archenemyState
      ? buildLifeTotals(players, archenemyState.archenemyId)
      : undefined

    const state: GameState = {
      id: crypto.randomUUID(),
      config: {
        playerCount: players.length,
        deckSize: deck.length,
        mode,
      },
      deck,
      currentPlaneIndex: 0,
      secondPlaneIndex: null,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: isStandaloneArchenemy ? 0 : 1,
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
      eliminatedPlayerIds: [],
      life,
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
    // Carry the whole configuration onto the session. Previously only podId
    // went across, so an Archenemy setup silently became a Planechase game the
    // moment you chose to play with other people.
    //
    // The designated archenemy is deliberately not sent: it is chosen in the
    // lobby, once the real roster exists.
    createSession.mutate(
      {
        podId: activePodId ?? undefined,
        gameType: mode,
        schemeDeckId: archenemyMode ? selectedSchemeDeckId : null,
      },
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
              className="text-[32px] md:text-[40px] font-bold title-gradient tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              PlaneChaser
            </h1>
            <p className="text-[17px] text-[var(--color-text-secondary)] tracking-wide font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
              {mode === 'archenemy'
                ? 'New Archenemy Session'
                : mode === 'both'
                  ? 'New Planechase + Archenemy Session'
                  : 'New Planechase Session'}
            </p>
          </div>

          {/* Active pod selector — this is what names the table */}
          {pods && pods.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-2"
            >
              <label
                className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Active Pod
              </label>
              <div className="relative">
                <select
                  value={activePodId ?? ''}
                  onChange={(e) => setActivePodId(e.target.value || null)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 pr-8 text-[14px] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] appearance-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <option value="">No Pod (Solo)</option>
                  {pods.map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
              {activePodId && activePod && (
                <p
                  className="text-[12px] text-[var(--color-text-muted)] pt-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {podMembers
                    ? `${activePod.name} fills the player list below.`
                    : 'Loading pod members…'}
                </p>
              )}
            </motion.div>
          )}

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

          {/* Game type */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-5"
          >
            <GameModeSelector
              value={mode}
              onChange={(next) => {
                setMode(next)
                if (next === 'planechase') {
                  setDesignatedArchenemyId(null)
                  setShowArchenemyPicker(false)
                  setSelectedSchemeDeckId(null)
                }
              }}
            />
          </motion.div>

          {/* Archenemy section */}
          {archenemyMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-5 space-y-4"
            >
              {/* Auto-detect banner — only meaningful inside a pod, where the
                  conquest threshold is what nominates an archenemy. */}
              {activePod && archenemy && !designatedArchenemyId && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
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
                    {archenemy.display_name} has {archenemy.conquered_count} conquests. Tap to enable
                  </p>
                </motion.button>
              )}

              {/* Pod path: the conquest leaderboard nominates, with the
                  back-to-back warning. */}
              {activePod && showArchenemyPicker && !designatedArchenemyId && (
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
                  onCancel={() => setShowArchenemyPicker(false)}
                />
              )}

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
            <PlayerRoster
              roster={roster}
              archenemyMode={archenemyMode}
              designatedArchenemyId={designatedArchenemyId}
              friends={friends ?? []}
              onDesignate={setDesignatedArchenemyId}
              onPickFriend={(slotId, friend) =>
                applyRoster(
                  fillSlot(roster, slotId, {
                    id: friend.user_id,
                    display_name: friend.display_name,
                    source: 'friend',
                  }),
                )
              }
              onRename={(slotId, name) => setRoster(renameSlot(roster, slotId, name))}
              onRemove={(slotId) => applyRoster(removeSlot(roster, slotId))}
              onMove={(from, to) => setRoster(reorder(roster, from, to))}
              onAdd={() => {
                const slot = guestSlot(roster)
                setRoster(addSlot(roster, slot))
                return slot.id
              }}
              onRandomize={() => setRoster(shuffleDeck(roster))}
            />

            {/* Deck mode toggle */}
            <div className={`space-y-3 ${isStandaloneArchenemy ? 'hidden' : ''}`}>
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
            {!isStandaloneArchenemy && deckMode === 'saved' && (
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
                    No decks yet. One will be created automatically.
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
            {!isStandaloneArchenemy && deckMode === 'random' && (
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

            {/* Gold border toggle */}
            <div className={`flex items-center justify-between ${isStandaloneArchenemy ? 'hidden' : ''}`}>
              <label
                className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Include Gold Border Cards
              </label>
              <button
                onClick={() => setIncludeGoldBorder(!includeGoldBorder)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  includeGoldBorder
                    ? 'bg-[var(--color-gold)]'
                    : 'bg-[var(--color-border)]'
                }`}
              >
                <motion.div
                  animate={{ x: includeGoldBorder ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm"
                />
              </button>
            </div>

            {/* Archenemy prerequisites */}
            {archenemyMode && roster.length < 2 && (
              <p className="text-[12px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                An Archenemy game needs at least two players.
              </p>
            )}
            {archenemyMode && roster.length >= 2 && !designatedArchenemyId && (
              <p className="text-[12px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                Tap “Make archenemy” on a player above to start.
              </p>
            )}
            {archenemyMode && designatedArchenemyId && schemes && schemes.length === 0 && (
              <p className="text-[12px] text-[var(--color-destructive)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                No scheme cards are available. An Archenemy game needs a scheme deck.
              </p>
            )}

            {/* Status */}
            {!isStandaloneArchenemy && isLoading && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  Loading plane cards...
                </p>
              </div>
            )}
            {!isStandaloneArchenemy && error && (
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
              onClick={startGame}
              disabled={
                !canStart(roster, mode, designatedArchenemyId)
                || (archenemyMode && (!schemes || schemes.length === 0))
                // A standalone game needs no planes, so the plane corpus never
                // gates it.
                || (!isStandaloneArchenemy && (
                  isLoading
                  || (deckMode === 'saved'
                    ? (!deckCards || deckCards.length === 0)
                    : (!corpus || corpus.length === 0))
                ))
              }
              className="w-full h-14 text-[17px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white transition-all"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 30px rgba(124, 58, 237, 0.4)' }}
            >
              Start Game
            </Button>
          </motion.div>

          {/* Multiplayer — a pod game can still be played across devices */}
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
        </motion.div>
      </div>
    </main>
  )
}
