'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { useUserStats, useUserConquests, useUserPods, usePlaneVisitHistory } from '@/hooks/usePods'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type ProfileTab = 'conquests' | 'history'

export default function ProfilePage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: stats } = useUserStats()
  const { data: conquests } = useUserConquests()
  const { data: pods } = useUserPods()
  const { data: visitHistory } = usePlaneVisitHistory()
  const [tab, setTab] = useState<ProfileTab>('conquests')

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

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.planes_conquered ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Conquered
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.games_played ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Games
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.total_rolls ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Die Rolls
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.planeswalk_rolls ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Planeswalks
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.total_planes_visited ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Planes Visited
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
            <p className="text-[22px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {stats?.archenemy_games ?? 0}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Archenemy
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

        {/* Achievement badges placeholder */}
        <div className="space-y-2">
          <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Achievements
          </h2>
          <p className="text-center text-[13px] text-[var(--color-text-muted)] py-4 rounded-[12px] border border-dashed border-[var(--color-border)]" style={{ fontFamily: 'var(--font-body)' }}>
            Coming soon — badges will appear here
          </p>
        </div>

        {/* Tabs: Conquests / History */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
          <button
            onClick={() => setTab('conquests')}
            className={`flex-1 py-2 text-[13px] font-semibold transition-colors ${
              tab === 'conquests'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Conquests
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 text-[13px] font-semibold transition-colors ${
              tab === 'history'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Visit History
          </button>
        </div>

        {/* Conquests tab */}
        {tab === 'conquests' && (
          <div className="space-y-3">
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
        )}

        {/* Visit history tab */}
        {tab === 'history' && (
          <div className="space-y-1">
            {visitHistory && visitHistory.length > 0 ? (
              visitHistory.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-4 py-3">
                  <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {v.planeName}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {new Date(v.sessionDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-[13px] text-[var(--color-text-muted)] py-6" style={{ fontFamily: 'var(--font-body)' }}>
                No visit history yet. Play a game to start tracking!
              </p>
            )}
          </div>
        )}

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
