'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <button onClick={() => router.push('/setup')} className="text-[14px] text-[var(--color-accent)] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          PlaneChaser
        </button>
        <button onClick={() => router.push('/profile')} className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Profile
        </button>
      </header>

      <div className="flex-1 px-4 py-6 max-w-[440px] mx-auto w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[24px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Your Pods
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Playgroups that track conquest standings
          </p>
        </div>

        {/* Pod list */}
        {isLoading ? (
          <p className="text-center text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Loading...</p>
        ) : pods && pods.length > 0 ? (
          <div className="space-y-2">
            {pods.map((pod) => (
              <button
                key={pod.id}
                onClick={() => selectPod(pod)}
                className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-accent)]"
              >
                <p className="text-[16px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {pod.name}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Code: {pod.invite_code} · Archenemy at {pod.archenemy_threshold} planes
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            No pods yet. Create one or join with an invite code.
          </p>
        )}

        {error && (
          <p className="text-center text-[14px] text-[var(--color-destructive)]" style={{ fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        )}

        {/* Create pod */}
        {showCreate ? (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <Input
              placeholder="Pod name (e.g. Friday Night MTG)"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              className="h-11 text-[15px] border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-body)' }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createPod.isPending || !podName.trim()} className="flex-1 h-11 bg-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] text-white" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
                Create
              </Button>
              <Button onClick={() => { setShowCreate(false); setError(null) }} variant="outline" className="h-11 border-[var(--color-border)] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : showJoin ? (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="h-11 text-[15px] border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-body)' }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleJoin} disabled={joinPod.isPending || !inviteCode.trim()} className="flex-1 h-11 bg-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] text-white" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}>
                Join
              </Button>
              <Button onClick={() => { setShowJoin(false); setError(null) }} variant="outline" className="h-11 border-[var(--color-border)] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button onClick={() => setShowCreate(true)} className="flex-1 h-12 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white" style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}>
              Create Pod
            </Button>
            <Button onClick={() => setShowJoin(true)} variant="outline" className="flex-1 h-12 border-[var(--color-border)] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)', fontSize: '15px' }}>
              Join Pod
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
