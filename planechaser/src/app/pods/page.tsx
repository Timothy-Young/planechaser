'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserPods, useCreatePod, useJoinPod } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import type { Pod } from '@/lib/pods/types'

export default function PodsPage() {
  const router = useRouter()
  const { data: pods, isLoading } = useUserPods()
  const createPod = useCreatePod()
  const joinPod = useJoinPod()
  const setActivePodId = useAppStore((s) => s.setActivePodId)

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [podName, setPodName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!podName.trim()) return
    setError(null)
    try {
      const pod = await createPod.mutateAsync(podName.trim())
      setActivePodId(pod.id)
      setPodName('')
      setShowCreate(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create pod')
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return
    setError(null)
    try {
      const pod = await joinPod.mutateAsync(inviteCode.trim())
      setActivePodId(pod.id)
      setInviteCode('')
      setShowJoin(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join pod')
    }
  }

  function selectPod(pod: Pod) {
    setActivePodId(pod.id)
    router.push(`/pods/${pod.id}`)
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 px-4 py-8 max-w-[520px] mx-auto w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="text-[26px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Your Pods
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Playgroups that track conquest standings
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pods && pods.length > 0 ? (
          <div className="space-y-2">
            {pods.map((pod, i) => (
              <motion.button
                key={pod.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => selectPod(pod)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-4 text-left transition-all hover:border-[var(--color-accent)]/40 group flex items-center justify-between"
              >
                <div>
                  <p className="text-[15px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {pod.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    Code: <span className="text-[var(--color-accent)]">{pod.invite_code}</span> · Archenemy at {pod.archenemy_threshold}
                  </p>
                </div>
                <ArrowRight size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="text-center text-[13px] text-[var(--color-text-muted)] py-8" style={{ fontFamily: 'var(--font-body)' }}>
            No pods yet. Create one or join with an invite code.
          </p>
        )}

        {error && (
          <p className="text-center text-[13px] text-[var(--color-destructive)]" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        )}

        {showCreate ? (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-3">
            <Input
              placeholder="Pod name (e.g. Friday Night MTG)"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              className="h-11 text-[14px] rounded-xl border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-body)' }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createPod.isPending || !podName.trim()} className="flex-1 h-11 bg-[var(--color-accent-deep)] hover:opacity-90 text-white rounded-xl" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
                Create
              </Button>
              <Button onClick={() => { setShowCreate(false); setError(null) }} variant="outline" className="h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 rounded-xl" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : showJoin ? (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-3">
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="h-11 text-[14px] rounded-xl border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-body)' }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleJoin} disabled={joinPod.isPending || !inviteCode.trim()} className="flex-1 h-11 bg-[var(--color-accent-deep)] hover:opacity-90 text-white rounded-xl" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
                Join
              </Button>
              <Button onClick={() => { setShowJoin(false); setError(null) }} variant="outline" className="h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 rounded-xl" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <Button onClick={() => setShowCreate(true)} className="flex-1 h-12 bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)' }}>
              <Plus size={16} className="mr-1.5" /> Create Pod
            </Button>
            <Button onClick={() => setShowJoin(true)} variant="outline" className="flex-1 h-12 border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10 rounded-xl" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
              Join Pod
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
