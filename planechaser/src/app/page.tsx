'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasActiveGame } from '@/lib/game/session-storage'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (hasActiveGame()) {
      router.replace('/game')
    } else {
      router.replace('/setup')
    }
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center space-y-2">
        <h1
          className="text-[32px] font-bold text-[var(--color-accent)]"
          style={{ fontFamily: 'var(--font-heading)', textShadow: '0 0 12px #7C3AED' }}
        >
          PlaneChaser
        </h1>
        <p className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Loading...
        </p>
      </div>
    </main>
  )
}
