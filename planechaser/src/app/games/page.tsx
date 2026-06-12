'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Swords, MapPin, Dice5, Users, Shield } from 'lucide-react'
import { useGameSessions } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'

export default function GamesPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const { data: games, isLoading } = useGameSessions()

  const hasGames = games && games.length > 0

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getGameTitle(winCondition: string | null) {
    if (winCondition && winCondition.toLowerCase().includes('archenemy')) {
      return 'Archenemy Game'
    }
    return 'Planechase Game'
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Sign in to view game history.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1
              className="text-[24px] font-bold title-gradient"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Game History
            </h1>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                Loading games...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasGames && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-8 text-center space-y-4"
            >
              <Swords size={40} className="mx-auto text-[var(--color-text-muted)]" />
              <p className="text-[15px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                No games played yet. Start a game from the home screen!
              </p>
            </motion.div>
          )}

          {/* Game cards */}
          {hasGames && (
            <div className="space-y-3">
              {games.map((game, i) => (
                <motion.button
                  key={game.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/games/${game.id}`)}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 text-left transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]"
                >
                  <div className="space-y-2">
                    {/* Title and date */}
                    <div>
                      <p
                        className="text-[15px] font-semibold text-[var(--color-text)]"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {getGameTitle(game.win_condition)}
                      </p>
                      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                        <span>{formatDate(game.started_at)}</span>
                        {(() => {
                          const pod = game.pods as unknown as { name: string } | null
                          return pod?.name ? (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-[var(--color-accent)]">
                                <Shield size={11} />
                                {pod.name}
                              </span>
                            </>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {game.planes_visited?.length ?? 0} plane{(game.planes_visited?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dice5 size={13} />
                        {game.die_roll_history?.length ?? 0} roll{(game.die_roll_history?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Players */}
                    {game.players_snapshot && game.players_snapshot.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                        <Users size={13} className="shrink-0" />
                        <span className="truncate">
                          {(game.players_snapshot as { id: string; display_name: string }[]).map((p) => p.display_name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
