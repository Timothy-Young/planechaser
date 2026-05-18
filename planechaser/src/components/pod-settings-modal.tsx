'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdatePod } from '@/hooks/usePods'

interface PodSettingsModalProps {
  pod: { id: string; name: string; archenemy_threshold: number }
  onClose: () => void
}

const THRESHOLD_OPTIONS = [3, 5, 8, 10, 15, 20]

export function PodSettingsModal({ pod, onClose }: PodSettingsModalProps) {
  const [name, setName] = useState(pod.name)
  const [threshold, setThreshold] = useState(pod.archenemy_threshold)
  const updatePod = useUpdatePod()

  async function handleSave() {
    await updatePod.mutateAsync({ podId: pod.id, updates: { name, archenemy_threshold: threshold } })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 space-y-5"
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
            Number of planes a player must conquer to trigger Archenemy mode.
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

        {/* Actions */}
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
            {updatePod.isPending ? 'Saving…' : 'Save'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
