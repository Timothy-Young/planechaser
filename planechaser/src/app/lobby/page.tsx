'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerList } from '@/components/player-list'
import { useSessionPlayers, useUpdateTurnOrder } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'

export default function LobbyPage() {
  const router = useRouter()
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const user = useAppStore((s) => s.user)
  const isHost = useAppStore((s) => s.isHost)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: players } = useSessionPlayers(activeSessionId ?? undefined)
  const updateTurnOrder = useUpdateTurnOrder()

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
    const turnOrder = players.map((p) => p.user_id)
    if (activeSessionId) {
      updateTurnOrder.mutate(
        { sessionId: activeSessionId, turnOrder },
        { onSuccess: () => router.push('/setup?fromLobby=true') }
      )
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
            className="text-2xl font-bold text-white"
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

        <div>
          <p
            className="text-sm text-[var(--color-text-muted)] mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Players ({players?.length ?? 0})
          </p>
          {players && players.length > 0 ? (
            <PlayerList
              players={players}
              hostUserId={user?.id}
            />
          ) : (
            <p className="text-sm text-white/40 text-center py-8">
              Waiting for players to join...
            </p>
          )}
        </div>

        <Button
          onClick={handleStartGame}
          disabled={!players || players.length < 2}
          className="w-full py-4 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Game ({players?.length ?? 0} players)
        </Button>
      </div>
    </main>
  )
}
