'use client'

import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { useUserStats, useUserConquests, useUserPods } from '@/hooks/usePods'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: stats } = useUserStats()
  const { data: conquests } = useUserConquests()
  const { data: pods } = useUserPods()

  const activePod = pods?.find((p) => p.id === activePodId)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/auth')
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <button onClick={() => router.push('/setup')} className="text-[14px] text-[var(--color-accent)] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          ← Back
        </button>
        <span className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Profile
        </span>
      </header>

      <div className="flex-1 px-4 py-6 max-w-[440px] mx-auto w-full space-y-6">
        {/* User info */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center mx-auto">
            <span className="text-[28px] text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <h1 className="text-[20px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            {user?.user_metadata?.display_name ?? user?.email ?? 'Player'}
          </h1>
          <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            {user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-[28px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.planes_conquered ?? 0}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Planes Conquered
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-[28px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.games_played ?? 0}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Games Played
            </p>
          </div>
        </div>

        {/* Active pod */}
        {activePod && (
          <div className="rounded-[12px] border border-[var(--color-accent)] bg-[var(--color-accent)]/5 p-4">
            <p className="text-[12px] text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
              Active Pod
            </p>
            <p className="text-[16px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {activePod.name}
            </p>
          </div>
        )}

        {/* Conquered planes gallery */}
        <div className="space-y-3">
          <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Conquered Planes
          </h2>
          {conquests && conquests.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {conquests.map((c) => (
                <div key={c.id} className="rounded-[8px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <img
                    src={c.plane_image_uri}
                    alt={c.plane_name}
                    className="w-full aspect-[3/2] object-cover"
                    loading="lazy"
                  />
                  <div className="px-2 py-2">
                    <p className="text-[11px] font-semibold text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {c.plane_name}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                      {new Date(c.conquered_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[13px] text-[var(--color-text-muted)] py-6" style={{ fontFamily: 'var(--font-body)' }}>
              No conquests yet. Win a game and claim a plane!
            </p>
          )}
        </div>

        {/* Navigation + sign out */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => router.push('/pods')}
            variant="outline"
            className="w-full h-11 border-[var(--color-border)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
          >
            Manage Pods
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-11 border-[var(--color-border)] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </main>
  )
}
