import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }}
        >
          <Compass size={32} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl font-bold title-gradient"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            This Plane Doesn&apos;t Exist
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            You&apos;ve planeswalked somewhere outside the multiverse. Nothing
            here but aether.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Return home
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Open the planar map
          </Link>
        </div>
      </div>
    </main>
  )
}
