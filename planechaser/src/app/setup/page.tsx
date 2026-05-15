'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
              onClick={() => startGame(true)}
              disabled={isLoading || !corpus || corpus.length === 0 || !schemes}
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

            {/* Deck size */}
            <div className="space-y-3">
              <label className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                Deck Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DECK_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setDeckSize(size)}
                    className={`h-11 rounded-xl text-[13px] font-semibold transition-all ${
                      deckSize === size
                        ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {size === 0 ? `All (${corpus?.length ?? '...'})` : `${size} planes`}
                  </button>
                ))}
              </div>
            </div>

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

            {/* Start button */}
            <Button
              onClick={() => startGame(false)}
              disabled={isLoading || !corpus || corpus.length === 0}
              className="w-full h-14 text-[17px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white transition-all"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 30px rgba(124, 58, 237, 0.4)' }}
            >
              Start Game
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}
