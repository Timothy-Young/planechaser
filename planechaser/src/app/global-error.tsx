'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary: catches throws in the root layout itself. It replaces
 * the whole document, so it cannot use the app's CSS custom properties (the
 * layout that imports globals.css is exactly what failed). Colours here are
 * literal copies of the Blind Eternities tokens.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PlaneChaser] Root layout error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0813',
          color: '#f2f0f7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 12px',
              color: '#b18aff',
            }}
          >
            PlaneChaser failed to load
          </h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#b8b3cc', margin: '0 0 24px' }}>
            Something went wrong before the app could start. Reloading usually
            fixes it.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                color: '#756f8f',
                border: '1px solid #675a99',
                borderRadius: '8px',
                padding: '8px 12px',
                margin: '0 0 24px',
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: '#b18aff',
              color: '#0a0813',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
