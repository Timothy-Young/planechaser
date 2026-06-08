'use client'

import { Ban } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useBannedCheck } from '@/hooks/useAdmin'
import { createClient } from '@/lib/supabase/client'

export function BannedGuard({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const { data: banStatus } = useBannedCheck(user?.id)

  if (!banStatus?.banned) return <>{children}</>

  function handleSignOut() {
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      setUser(null)
      window.location.href = '/'
    })
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--color-cta) 15%, transparent)' }}
        >
          <Ban size={32} style={{ color: 'var(--color-cta)' }} />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
        >
          Account Suspended
        </h1>

        {/* Reason */}
        <div
          className="rounded-xl border px-4 py-3 text-left"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-cta) 30%, transparent)',
            background: 'color-mix(in srgb, var(--color-cta) 5%, transparent)',
          }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-bold mb-1"
            style={{ color: 'var(--color-cta)', fontFamily: 'var(--font-heading)' }}
          >
            Reason
          </p>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            {banStatus.reason || 'Your account has been suspended by an administrator.'}
          </p>
        </div>

        {/* Info */}
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          If you believe this was a mistake, please contact us at{' '}
          <a
            href="mailto:codetimcode@gmail.com?subject=PlaneChaser%20Ban%20Appeal"
            className="underline transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            codetimcode@gmail.com
          </a>
        </p>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="h-10 px-6 rounded-xl border text-[13px] font-semibold transition-colors"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border)',
          }}
        >
          Sign Out
        </button>
      </div>
    </main>
  )
}
