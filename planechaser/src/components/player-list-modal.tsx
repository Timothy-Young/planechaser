'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Skull, Heart } from 'lucide-react'
import type { Player } from '@/lib/game/types'

interface PlayerListModalProps {
  players: Player[]
  turnOrder: string[]
  currentTurnIndex: number
  eliminatedPlayerIds: string[]
  onEliminate: (playerId: string) => void
  onRestore: (playerId: string) => void
  onClose: () => void
}

export function PlayerListModal({
  players,
  turnOrder,
  currentTurnIndex,
  eliminatedPlayerIds,
  onEliminate,
  onRestore,
  onClose,
}: PlayerListModalProps) {
  const currentPlayerId = turnOrder[currentTurnIndex]
  const aliveCount = players.filter((p) => !eliminatedPlayerIds.includes(p.id)).length

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[360px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              className="text-[16px] font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Players
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Player list in turn order */}
          <div className="space-y-2">
            {turnOrder.map((playerId, i) => {
              const player = players.find((p) => p.id === playerId)
              if (!player) return null
              const isEliminated = eliminatedPlayerIds.includes(playerId)
              const isCurrent = playerId === currentPlayerId

              return (
                <div
                  key={playerId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    isEliminated
                      ? 'border-red-500/30 bg-red-500/5 opacity-60'
                      : isCurrent
                        ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8'
                        : 'border-[var(--color-border)] bg-white/3'
                  }`}
                >
                  {/* Turn number */}
                  <span
                    className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      isEliminated
                        ? 'bg-red-500/20 text-red-400'
                        : isCurrent
                          ? 'bg-[var(--color-accent-deep)] text-white'
                          : 'bg-white/10 text-[var(--color-text-muted)]'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isEliminated ? '✕' : i + 1}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] font-medium truncate ${
                        isEliminated
                          ? 'text-red-400 line-through'
                          : 'text-[var(--color-text)]'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {player.display_name}
                    </p>
                    {isCurrent && !isEliminated && (
                      <p className="text-[10px] text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                        Current turn
                      </p>
                    )}
                    {isEliminated && (
                      <p className="text-[10px] text-red-400" style={{ fontFamily: 'var(--font-heading)' }}>
                        Eliminated
                      </p>
                    )}
                  </div>

                  {/* Eliminate/Restore button */}
                  {isEliminated ? (
                    <button
                      onClick={() => onRestore(playerId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <Heart size={12} />
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => onEliminate(playerId)}
                      disabled={aliveCount <= 1}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <Skull size={12} />
                      Kill
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <p
            className="text-[11px] text-[var(--color-text-muted)] text-center"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {aliveCount} of {players.length} players remaining
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
