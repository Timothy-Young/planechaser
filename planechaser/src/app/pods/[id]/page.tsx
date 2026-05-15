'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, LogOut, Crown } from 'lucide-react'
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
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center px-4 py-3 glass-strong border-b border-[var(--color-border)]">
        <button onClick={() => router.push('/pods')} className="flex items-center gap-1 text-[13px] text-[var(--color-accent)] font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
          <ArrowLeft size={16} /> Pods
        </button>
      </header>

      <div className="relative z-10 flex-1 px-4 py-6 max-w-[520px] mx-auto w-full space-y-6">
        {/* Pod info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="text-[24px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            {pod?.name ?? 'Loading...'}
          </h1>
          {pod && (
            <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              <span>Code: <span className="text-[var(--color-accent)] font-semibold">{pod.invite_code}</span></span>
              <span>Archenemy at {pod.archenemy_threshold}</span>
            </div>
          )}
        </motion.div>

        {/* Archenemy alert */}
        {archenemy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-[var(--color-cta)]/40 bg-[var(--color-cta)]/8 p-4 text-center glow-red"
          >
            <p className="text-[15px] font-bold text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Archenemy: {archenemy.display_name}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {archenemy.conquered_count} planes conquered — next game is an Archenemy showdown!
            </p>
          </motion.div>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-[14px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Leaderboard
          </h2>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-1.5">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    entry.is_archenemy
                      ? 'border border-[var(--color-cta)]/30 bg-[var(--color-cta)]/5'
                      : 'bg-[var(--color-surface)]/60 border border-[var(--color-border-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-[var(--color-text-muted)] w-5" style={{ fontFamily: 'var(--font-heading)' }}>
                      {i === 0 ? <Crown size={14} className="text-[var(--color-gold)]" /> : i + 1}
                    </span>
                    <span className="text-[14px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                      {entry.display_name}
                      {entry.user_id === user?.id && <span className="text-[var(--color-accent)] ml-1 text-[11px]">(you)</span>}
                    </span>
                  </div>
                  <span className={`text-[15px] font-bold ${entry.is_archenemy ? 'text-[var(--color-cta)]' : 'text-[var(--color-accent)]'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                    {entry.conquered_count}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[12px] text-[var(--color-text-muted)] py-4" style={{ fontFamily: 'var(--font-body)' }}>
              No conquests yet. Play a game and conquer some planes!
            </p>
          )}
        </div>

        {/* Members */}
        <div className="space-y-3">
          <h2 className="text-[14px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Members ({members?.length ?? 0})
          </h2>
          <div className="space-y-1">
            {members?.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]">
                <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {m.profile?.display_name ?? 'Unknown'}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSetActive} className="flex-1 h-12 bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)' }}>
            <Play size={16} className="mr-1.5" /> Play in this Pod
          </Button>
          {!isOwner && (
            <Button onClick={handleLeave} variant="outline" className="h-12 px-4 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 rounded-xl" style={{ fontFamily: 'var(--font-body)', fontSize: '12px' }}>
              <LogOut size={14} className="mr-1" /> Leave
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
