'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Eye } from 'lucide-react'
import { PlayerList } from '@/components/player-list'
import { TurnIndicator } from '@/components/turn-indicator'
import { useSessionPlayers, useSessionSubscription } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'
import type { GameSession } from '@/lib/game/session-types'
import type { GameState } from '@/lib/game/types'

export default function SpectatePage() {
  const router = useRouter()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('lobby')

  const { data: players } = useSessionPlayers(activeSessionId ?? undefined)

  const handleSessionUpdate = useCallback((session: GameSession) => {
    setSessionStatus(session.status)
    if (session.game_state) {
      setGameState(session.game_state as unknown as GameState)
    }
  }, [])

  useSessionSubscription(activeSessionId ?? undefined, handleSessionUpdate)

  if (!activeSessionId) {
    router.replace('/join')
    return null
  }

  if (sessionStatus === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center flex flex-col gap-4"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
            <Eye className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Waiting for host to start...
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            You&apos;ll see the game in real-time once it begins
          </p>
          {players && (
            <div className="mt-4 max-w-xs mx-auto w-full">
              <PlayerList players={players} />
            </div>
          )}
        </motion.div>
      </main>
    )
  }

  if (sessionStatus === 'ended') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Game Over
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            The host has ended the game.
          </p>
        </div>
      </main>
    )
  }

  if (!gameState) return null

  const currentPlane = gameState.deck[gameState.currentPlaneIndex]
  const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex]
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId)

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] p-4">
      <div className="max-w-md mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-2 justify-center">
          <Eye className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-accent)] uppercase tracking-wider">
            Spectating
          </span>
        </div>

        <TurnIndicator
          playerName={currentPlayer?.display_name ?? 'Unknown'}
        />

        {currentPlane && (
          <div className="relative aspect-[5/7] rounded-xl overflow-hidden">
            <Image
              src={currentPlane.image_uris.border_crop}
              alt={currentPlane.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        )}

        {players && (
          <PlayerList
            players={players}
            currentTurnUserId={currentPlayerId}
            showTurnIndicator
          />
        )}
      </div>
    </main>
  )
}
