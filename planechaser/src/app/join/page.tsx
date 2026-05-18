'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useJoinSession } from '@/hooks/useGameSession'
import { useAppStore } from '@/store/app-store'
import { isValidSessionCode } from '@/lib/game/session-code'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const joinSession = useJoinSession()
  const setActiveSessionId = useAppStore((s) => s.setActiveSessionId)
  const setIsHost = useAppStore((s) => s.setIsHost)

  const handleJoin = () => {
    setError(null)
    const normalized = code.toUpperCase().trim()

    if (!isValidSessionCode(normalized)) {
      setError('Code must be 6 characters (letters and numbers)')
      return
    }

    joinSession.mutate(normalized, {
      onSuccess: (session) => {
        setActiveSessionId(session.id)
        setIsHost(false)
        router.push('/spectate')
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to join')
      },
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full flex flex-col gap-6"
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Join Game
          </h1>
          <p
            className="text-sm text-[var(--color-text-muted)] mt-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Enter the session code from your host
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            className="
              w-full text-center text-3xl font-bold tracking-[0.3em]
              bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl
              px-4 py-4 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40
              focus:outline-none focus:border-[var(--color-accent)]/60
            "
            style={{ fontFamily: 'var(--font-heading)' }}
            autoFocus
          />

          {error && (
            <p className="text-sm text-[var(--color-destructive)] text-center">
              {error}
            </p>
          )}

          <Button
            onClick={handleJoin}
            disabled={code.length !== 6 || joinSession.isPending}
            className="w-full py-4 text-lg"
          >
            {joinSession.isPending ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </motion.div>
    </main>
  )
}
