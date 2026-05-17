'use client'

import { motion } from 'framer-motion'
import type { SessionPlayer } from '@/lib/game/session-types'

interface PlayerListProps {
  players: SessionPlayer[]
  currentTurnUserId?: string | null
  hostUserId?: string
  showTurnIndicator?: boolean
}

export function PlayerList({
  players,
  currentTurnUserId,
  hostUserId,
  showTurnIndicator = false,
}: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((player) => {
        const isCurrentTurn = showTurnIndicator && player.user_id === currentTurnUserId
        const isHost = player.user_id === hostUserId
        const name = player.profile?.display_name ?? 'Player'

        return (
          <motion.div
            key={player.user_id}
            layout
            className={`
              flex items-center gap-3 rounded-xl px-4 py-3
              ${isCurrentTurn
                ? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40'
                : 'bg-white/5 border border-white/10'}
            `}
          >
            {player.profile?.avatar_url ? (
              <img
                src={player.profile.avatar_url}
                alt={name}
                className={`w-8 h-8 rounded-full ${isCurrentTurn ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isCurrentTurn ? 'bg-[var(--color-accent)] text-white' : 'bg-white/10 text-white/60'}
                `}
              >
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium text-white truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {name}
                {isHost && (
                  <span className="ml-2 text-xs text-[var(--color-accent)]">Host</span>
                )}
              </p>
            </div>
            {isCurrentTurn && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
