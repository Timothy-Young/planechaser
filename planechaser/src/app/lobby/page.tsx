'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Play, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerList } from '@/components/player-list'
import { ArchenemyRoster } from '@/components/game/archenemy-roster'
import {
  useSessionPlayers,
  useUpdateTurnOrder,
  useStartSession,
  useSession,
  useSetSessionArchenemy,
  useAddSessionPlayer,
  useRemoveSessionPlayer,
} from '@/hooks/useGameSession'
import { useFriends } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { usePlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
import { useUserSchemeDecks } from '@/hooks/useSchemeDecks'
import { shuffleDeck } from '@/lib/game/shuffle'
import {
  archenemyFirstTurnOrder,
  buildArchenemyState,
  buildLifeTotals,
} from '@/lib/game/archenemy-setup'
import { saveGameState } from '@/lib/game/session-storage'
import type { GameState, Player } from '@/lib/game/types'

export default function LobbyPage() {
  const router = useRouter()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const user = useAppStore((s) => s.user)
  const isHost = useAppStore((s) => s.isHost)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: players } = useSessionPlayers(activeSessionId ?? undefined)
  const { data: session } = useSession(activeSessionId ?? undefined)
  const updateTurnOrder = useUpdateTurnOrder()
  const { data: corpus } = usePlaneCorpus()
  const startSessionMutation = useStartSession()

  const gameType = session?.game_type ?? 'planechase'
  const archenemyMode = gameType === 'archenemy' || gameType === 'both'
  // A standalone Archenemy game never planeswalks, so it needs no plane corpus.
  const needsPlanes = gameType !== 'archenemy'

  const { data: schemes } = useSchemeCorpus()
  const { data: schemeDecks } = useUserSchemeDecks()
  const { data: friends } = useFriends()
  const setArchenemy = useSetSessionArchenemy()
  const addPlayer = useAddSessionPlayer()
  const removePlayer = useRemoveSessionPlayer()
  const [showAddPlayers, setShowAddPlayers] = useState(false)

  /** The lobby roster as the archenemy picker wants it. */
  const roster: Player[] = useMemo(
    () =>
      (players ?? []).map((p) => ({
        id: p.user_id,
        display_name: p.profile?.display_name ?? 'Player',
      })),
    [players],
  )

  const addableFriends = useMemo(() => {
    const joined = new Set(roster.map((p) => p.id))
    return (friends ?? []).filter((f) => !joined.has(f.user_id))
  }, [roster, friends])

  useEffect(() => {
    if (!activeSessionId) {
      router.replace('/setup')
      return
    }
    const params = new URLSearchParams(window.location.search)
    setSessionCode(params.get('code'))
  }, [activeSessionId, router])

  const handleCopyCode = async () => {
    if (!sessionCode) return
    await navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    if (!players || players.length === 0) return
    if (needsPlanes && (!corpus || corpus.length === 0)) return

    // Built from the session's own configuration, not hardcoded. The lobby used
    // to force 'planechase' here, which silently discarded an Archenemy setup.
    const archenemyState = archenemyMode
      ? buildArchenemyState({
          players: roster,
          designatedArchenemyId: session?.archenemy_user_id ?? null,
          schemes,
          schemeDecks,
          selectedSchemeDeckId: session?.scheme_deck_id ?? null,
        }) ?? undefined
      : undefined

    if (archenemyMode && !archenemyState) return

    // The engine treats turn index 0 as the archenemy's turn, so join order
    // would otherwise hand the first turn to whoever opened the lobby.
    const turnOrder = archenemyState
      ? archenemyFirstTurnOrder(roster, archenemyState.archenemyId)
      : roster.map((p) => p.id)

    const orderedPlayers = turnOrder
      .map((id) => roster.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p))

    const deck = needsPlanes && corpus ? shuffleDeck(corpus) : []

    const state: GameState = {
      id: crypto.randomUUID(),
      config: { playerCount: orderedPlayers.length, deckSize: deck.length, mode: gameType },
      deck,
      currentPlaneIndex: 0,
      secondPlaneIndex: null,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: needsPlanes ? 1 : 0,
      startedAt: Date.now(),
      players: orderedPlayers,
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
      archenemy: archenemyState,
      life: archenemyState
        ? buildLifeTotals(orderedPlayers, archenemyState.archenemyId)
        : undefined,
    }

    saveGameState(state)

    if (activeSessionId) {
      updateTurnOrder.mutate(
        { sessionId: activeSessionId, turnOrder },
        {
          onSuccess: () => {
            startSessionMutation.mutate({
              sessionId: activeSessionId,
              initialState: state,
              firstPlayerId: turnOrder[0],
            })
            router.push('/game')
          },
        }
      )
    } else {
      router.push('/game')
    }
  }

  if (!activeSessionId || !isHost) {
    return null
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] p-6">
      <div className="max-w-md mx-auto w-full flex flex-col gap-6">
        <div className="text-center">
          <h1
            className="text-2xl font-bold title-gradient"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Game Lobby
          </h1>
          <p
            className="text-sm text-[var(--color-text-muted)] mt-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Share the code with your pod
          </p>
        </div>

        {sessionCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
          >
            <p
              className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Session Code
            </p>
            <p
              className="text-4xl font-bold text-[var(--color-accent)] tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {sessionCode}
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-3 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </motion.div>
        )}

        {/* Game type, carried from setup */}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p
              className="text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Game Type
            </p>
            <p className="text-[15px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {gameType === 'both'
                ? 'Planechase + Archenemy'
                : gameType === 'archenemy'
                  ? 'Archenemy'
                  : 'Planechase'}
            </p>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="text-[12px] text-[var(--color-accent)] hover:underline"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Change
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-sm text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Players ({players?.length ?? 0})
            </p>
            {addableFriends.length > 0 && (
              <button
                onClick={() => setShowAddPlayers((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:underline"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {showAddPlayers ? 'Done' : 'Add players'}
              </button>
            )}
          </div>

          {/* Direct add — no pod, no join code. Enabled by the host policy in 033. */}
          {showAddPlayers && (
            <div className="mb-3 space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                Add a friend straight to this game — they do not need the code.
              </p>
              {addableFriends.map((friend) => (
                <button
                  key={friend.user_id}
                  disabled={addPlayer.isPending}
                  onClick={() =>
                    addPlayer.mutate({ sessionId: activeSessionId!, userId: friend.user_id })
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {friend.display_name}
                  </span>
                  <UserPlus className="w-4 h-4 text-[var(--color-accent)]" />
                </button>
              ))}
              {addPlayer.isError && (
                <p className="text-[11px] text-red-400" style={{ fontFamily: 'var(--font-body)' }}>
                  {addPlayer.error instanceof Error ? addPlayer.error.message : 'Could not add that player.'}
                </p>
              )}
            </div>
          )}

          {players && players.length > 0 ? (
            <div className="space-y-2">
              <PlayerList players={players} hostUserId={user?.id} />
              {showAddPlayers && (
                <div className="space-y-1">
                  {roster
                    .filter((p) => p.id !== user?.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          removePlayer.mutate({ sessionId: activeSessionId!, userId: p.id })
                        }
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span>Remove {p.display_name}</span>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">
              Waiting for players to join...
            </p>
          )}
        </div>

        {/* Archenemy designation — only meaningful now that real players exist */}
        {archenemyMode && roster.length > 0 && (
          <ArchenemyRoster
            players={roster}
            designatedArchenemyId={session?.archenemy_user_id ?? null}
            onDesignate={(playerId) =>
              setArchenemy.mutate({
                sessionId: activeSessionId!,
                archenemyUserId: playerId,
              })
            }
          />
        )}

        {archenemyMode && !session?.archenemy_user_id && roster.length > 0 && (
          <p className="text-[12px] text-[var(--color-cta)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
            Designate an archenemy to start.
          </p>
        )}

        <Button
          onClick={handleStartGame}
          disabled={
            !players
            || players.length < 2
            || (needsPlanes && (!corpus || corpus.length === 0))
            || (archenemyMode && (!session?.archenemy_user_id || !schemes || schemes.length === 0))
          }
          className="w-full py-4 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Game ({players?.length ?? 0} players)
        </Button>
      </div>
    </main>
  )
}
