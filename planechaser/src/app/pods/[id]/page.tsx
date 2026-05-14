'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { usePodMembers, usePodLeaderboard, useLeavePod, useUserPods } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'

export default function PodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: podId } = use(params)
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const setActivePodId = useAppStore((s) => s.setActivePodId)
  const { data: pods } = useUserPods()
  const pod = pods?.find((p) => p.id === podId)
  const { data: members } = usePodMembers(podId)
  const { data: leaderboard } = usePodLeaderboard(podId, pod?.archenemy_threshold ?? 5)
  const leavePod = useLeavePod()

  async function handleLeave() {
    await leavePod.mutateAsync(podId)
    setActivePodId(null)
    router.push('/pods')
  }

  function handleSetActive() {
    setActivePodId(podId)
    router.push('/setup')
  }

  const isOwner = pod?.created_by === user?.id
  const archenemy = leaderboard?.find((e) => e.is_archenemy)

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <button onClick={() => router.push('/pods')} className="text-[14px] text-[var(--color-accent)] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          ← Pods
        </button>
        <button onClick={() => router.push('/profile')} className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Profile
        </button>
      </header>

      <div className="flex-1 px-4 py-6 max-w-[440px] mx-auto w-full space-y-6">
        {/* Pod info */}
        <div className="text-center space-y-2">
          <h1 className="text-[24px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            {pod?.name ?? 'Loading...'}
          </h1>
          {pod && (
            <div className="flex items-center justify-center gap-4 text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              <span>Code: <span className="text-[var(--color-accent)] font-semibold">{pod.invite_code}</span></span>
              <span>Archenemy at {pod.archenemy_threshold}</span>
            </div>
          )}
        </div>

        {/* Archenemy alert */}
        {archenemy && (
          <div className="rounded-[12px] border border-[var(--color-cta)] bg-[var(--color-cta)]/10 p-4 text-center">
            <p className="text-[16px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
              ⚔️ Archenemy: {archenemy.display_name}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {archenemy.conquered_count} planes conquered — next game is an Archenemy showdown!
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2">
          <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Leaderboard
          </h2>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    entry.is_archenemy
                      ? 'border border-[var(--color-cta)] bg-[var(--color-cta)]/5'
                      : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-bold text-[var(--color-text-muted)] w-6" style={{ fontFamily: 'var(--font-heading)' }}>
                      {i + 1}
                    </span>
                    <span className="text-[15px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                      {entry.display_name}
                      {entry.user_id === user?.id && <span className="text-[var(--color-accent)]"> (you)</span>}
                    </span>
                  </div>
                  <span className={`text-[16px] font-bold ${entry.is_archenemy ? 'text-[var(--color-cta)]' : 'text-[var(--color-accent)]'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                    {entry.conquered_count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[13px] text-[var(--color-text-muted)] py-4" style={{ fontFamily: 'var(--font-body)' }}>
              No conquests yet. Play a game and conquer some planes!
            </p>
          )}
        </div>

        {/* Members */}
        <div className="space-y-2">
          <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Members ({members?.length ?? 0})
          </h2>
          <div className="space-y-1">
            {members?.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-4 py-3">
                <span className="text-[14px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {m.profile?.display_name ?? 'Unknown'}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSetActive} className="flex-1 h-12 bg-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] text-white" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
            Play in this Pod
          </Button>
          {!isOwner && (
            <Button onClick={handleLeave} variant="outline" className="h-12 px-4 border-[var(--color-border)] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
              Leave
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
