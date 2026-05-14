'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { usePlaneCorpus } from '@/hooks/usePlaneCorpus'
import { useSchemeCorpus } from '@/hooks/useSchemeCorpus'
import { useUserPods, usePodLeaderboard } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { shuffleDeck } from '@/lib/game/shuffle'
import { saveGameState, hasActiveGame } from '@/lib/game/session-storage'
import type { GameState, PlaneCard, SchemeCard, ArchenemyState } from '@/lib/game/types'

const PLAYER_OPTIONS = [2, 3, 4, 5, 6]
const DECK_SIZES = [10, 20, 30, 0]

export default function SetupPage() {
  const router = useRouter()
  const { data: corpus, isLoading, error } = usePlaneCorpus()
  const { data: schemes } = useSchemeCorpus()
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: pods } = useUserPods()
  const activePod = pods?.find((p) => p.id === activePodId)
  const { data: leaderboard } = usePodLeaderboard(activePodId ?? undefined, activePod?.archenemy_threshold ?? 5)

  const archenemy = leaderboard?.find((e) => e.is_archenemy)

  const [playerCount, setPlayerCount] = useState(4)
  const [deckSize, setDeckSize] = useState(0)
  const [resumeAvailable, setResumeAvailable] = useState(false)

  useEffect(() => {
    setResumeAvailable(hasActiveGame())
  }, [])

  function startGame(archenemyMode = false) {
    if (!corpus || corpus.length === 0) return

    const size = deckSize === 0 ? corpus.length : Math.min(deckSize, corpus.length)
    const deck = shuffleDeck(corpus).slice(0, size) as PlaneCard[]

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

    const state: GameState = {
      id: crypto.randomUUID(),
      config: { playerCount, deckSize: size, isArchenemy: archenemyMode },
      deck,
      currentPlaneIndex: 0,
      dieState: 'idle',
      lastDieResult: null,
      rollCountThisTurn: 0,
      dieRollHistory: [],
      planesVisited: 1,
      startedAt: Date.now(),
      archenemy: archenemyState,
    }

    saveGameState(state)
    router.push('/game')
  }

  function resumeGame() {
    router.push('/game')
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <span className="text-[14px] text-[var(--color-accent)] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          PlaneChaser
        </span>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/pods')} className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
            Pods
          </button>
          <button onClick={() => router.push('/profile')} className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
            Profile
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center space-y-1">
          <h1
            className="text-[28px] font-bold text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-heading)', textShadow: '0 0 12px #7C3AED' }}
          >
            PlaneChaser
          </h1>
          <p className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            New Planechase Session
          </p>
        </div>

        {resumeAvailable && (
          <button
            onClick={resumeGame}
            className="w-full rounded-[12px] border border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-4 text-center transition-colors hover:bg-[var(--color-accent)]/20"
          >
            <p className="text-[16px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Resume Game
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              You have an active session
            </p>
          </button>
        )}

        {/* Archenemy alert */}
        {archenemy && activePod && (
          <button
            onClick={() => startGame(true)}
            disabled={isLoading || !corpus || corpus.length === 0 || !schemes}
            className="w-full rounded-[12px] border border-[var(--color-cta)] bg-[var(--color-cta)]/10 p-4 text-center transition-colors hover:bg-[var(--color-cta)]/20 disabled:opacity-50"
          >
            <p className="text-[16px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
              ⚔️ Archenemy Showdown
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {archenemy.display_name} has {archenemy.conquered_count} conquests — start an Archenemy game!
            </p>
          </button>
        )}

        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              Players
            </label>
            <div className="flex gap-2">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 h-12 rounded-lg text-[16px] font-semibold transition-colors ${
                    playerCount === n
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              Deck Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DECK_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setDeckSize(size)}
                  className={`h-12 rounded-lg text-[14px] font-semibold transition-colors ${
                    deckSize === size
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {size === 0 ? `All (${corpus?.length ?? '...'})` : `${size} planes`}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <p className="text-[13px] text-[var(--color-text-muted)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
              Loading plane cards from Scryfall...
            </p>
          )}
          {error && (
            <p className="text-[13px] text-[var(--color-destructive)] text-center" style={{ fontFamily: 'var(--font-body)' }}>
              Failed to load planes. Check your connection and refresh.
            </p>
          )}

          <Button
            onClick={() => startGame(false)}
            disabled={isLoading || !corpus || corpus.length === 0}
            className="w-full h-14 text-[18px] bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Start Game
          </Button>
        </div>
      </div>
      </div>
    </main>
  )
}
