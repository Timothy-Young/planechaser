'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdatePod, useRegenerateInviteCode, useDeletePod } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'

interface PodSettingsModalProps {
  pod: { id: string; name: string; archenemy_threshold: number; max_players: number; invite_code: string }
  onClose: () => void
}

const THRESHOLD_OPTIONS = [3, 5, 8, 10, 15, 20]

export function PodSettingsModal({ pod, onClose }: PodSettingsModalProps) {
  const router = useRouter()
  const setActivePodId = useAppStore((s) => s.setActivePodId)
  const [name, setName] = useState(pod.name)
  const [threshold, setThreshold] = useState(pod.archenemy_threshold)
  const [maxPlayers, setMaxPlayers] = useState(pod.max_players)
  const updatePod = useUpdatePod()
  const regenerateCode = useRegenerateInviteCode()
  const deletePodMutation = useDeletePod()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSave() {
    await updatePod.mutateAsync({
      podId: pod.id,
      updates: { name, archenemy_threshold: threshold, max_players: maxPlayers },
    })
    onClose()
  }

  async function handleRegenCode() {
    await regenerateCode.mutateAsync(pod.id)
    onClose()
  }

  async function handleDelete() {
    await deletePodMutation.mutateAsync(pod.id)
    setActivePodId(null)
    router.push('/pods')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 space-y-5 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="text-[18px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Pod Settings
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pod name */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Pod Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter pod name"
            className="h-11 rounded-xl border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Max players */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Max Players
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {[2, 3, 4, 5, 6, 7, 8].map((val) => (
              <motion.button
                key={val}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMaxPlayers(val)}
                className={`w-10 h-10 rounded-xl text-[14px] font-bold border transition-colors ${
                  maxPlayers === val
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text)]'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {val}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Archenemy threshold */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Archenemy Threshold
          </label>
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Planes a player must conquer to trigger Archenemy mode.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {THRESHOLD_OPTIONS.map((val) => (
              <motion.button
                key={val}
                whileTap={{ scale: 0.95 }}
                onClick={() => setThreshold(val)}
                className={`w-10 h-10 rounded-xl text-[14px] font-bold border transition-colors ${
                  threshold === val
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text)]'
                }`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {val}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Invite code management */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Invite Code
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-mono text-[var(--color-accent)]">{pod.invite_code}</span>
            <button
              onClick={handleRegenCode}
              disabled={regenerateCode.isPending}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
              title="Generate new code"
            >
              <RefreshCw size={14} className={regenerateCode.isPending ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 pt-1">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 rounded-xl border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
          >
            Cancel
          </Button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={updatePod.isPending || !name.trim()}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            {updatePod.isPending ? 'Saving...' : 'Save'}
          </motion.button>
        </div>

        {/* Danger zone */}
        <div className="pt-2 border-t border-[var(--color-border)]">
          {showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-body)' }}>
                This will permanently delete the pod, all members, and conquest history. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleDelete}
                  disabled={deletePodMutation.isPending}
                  className="flex-1 h-10 bg-[var(--color-cta)] text-white rounded-xl"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
                >
                  {deletePodMutation.isPending ? 'Deleting...' : 'Yes, Delete Pod'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="h-10 px-4 border-[var(--color-border)] text-[var(--color-text-muted)] rounded-xl"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Trash2 size={14} /> Delete Pod
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
