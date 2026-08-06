'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

/**
 * Route-level error boundary. Catches render/effect throws in any page under
 * the root layout so a single bad card row or undefined index can't white-screen
 * a game in progress.
 *
 * Note: in-progress game state lives in sessionStorage, not React state, so
 * "Try again" re-mounts the tree without losing the current game.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // No error-reporting service is wired up yet; console keeps the digest
    // reachable from a user's devtools when they report a bug.
    console.error('[PlaneChaser] Unhandled error:', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--color-cta) 15%, transparent)' }}
        >
          <AlertTriangle size={32} style={{ color: 'var(--color-cta)' }} />
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-bold title-gradient"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            The Blind Eternities Shifted
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            Something went wrong rendering this page. Your game in progress is
            saved — resuming should pick up where you left off.
          </p>
        </div>

        {error.digest && (
          <p
            className="text-xs font-mono px-3 py-2 rounded-lg border"
            style={{
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <RotateCcw size={16} />
            Try again
          </button>
          <Link
            href="/setup"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors active:scale-[0.97]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Home size={16} />
            Back to setup
          </Link>
        </div>
      </div>
    </main>
  )
}
