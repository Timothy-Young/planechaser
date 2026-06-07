'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Undo2, Shuffle, RotateCcw, Compass, Sparkles, ChevronUp, ChevronDown, BookOpen, Users, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react'

interface GameControlsToolbarProps {
  onUndo: () => void
  onShuffle: () => void
  onResetRolls: () => void
  onPlaneswalk: () => void
  onChaos: () => void
  onShowPlayers?: () => void
  onAddRoll: () => void
  onRemoveRoll: () => void
  canUndo: boolean
  rollCount: number
  eliminatedCount?: number
  disabled?: boolean
}

export function GameControlsToolbar({
  onUndo,
  onShuffle,
  onResetRolls,
  onPlaneswalk,
  onChaos,
  onShowPlayers,
  onAddRoll,
  onRemoveRoll,
  canUndo,
  rollCount,
  eliminatedCount = 0,
  disabled = false,
}: GameControlsToolbarProps) {
  const [expanded, setExpanded] = useState(false)

  const controls = [
    { icon: Undo2, label: 'Undo', action: onUndo, enabled: canUndo, color: 'var(--color-text-muted)', badge: null },
    { icon: Shuffle, label: 'Shuffle', action: onShuffle, enabled: true, color: 'var(--color-text-muted)', badge: null },
    { icon: RotateCcw, label: 'Reset Rolls', action: onResetRolls, enabled: true, color: 'var(--color-text-muted)', badge: null },
    { icon: Plus, label: '+1 Roll', action: onAddRoll, enabled: true, color: 'var(--color-text-muted)', badge: null },
    { icon: Minus, label: '-1 Roll', action: onRemoveRoll, enabled: rollCount > 0, color: 'var(--color-text-muted)', badge: null },
    { icon: Compass, label: 'Planeswalk', action: onPlaneswalk, enabled: true, color: 'var(--color-accent)', badge: null },
    { icon: Sparkles, label: 'Chaos', action: onChaos, enabled: true, color: '#ef4444', badge: null },
    ...(onShowPlayers ? [{ icon: Users, label: 'Players', action: onShowPlayers, enabled: true, color: 'var(--color-text-muted)', badge: eliminatedCount > 0 ? eliminatedCount : null }] : []),
  ]

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        Game Controls
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full"
          >
            <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
              {controls.map(({ icon: Icon, label, action, enabled, color, badge }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled || !enabled}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                             bg-white/5 border border-white/10
                             hover:bg-white/10 active:bg-white/15
                             disabled:opacity-30 disabled:pointer-events-none
                             transition-all min-w-[56px]"
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span
                    className="text-[9px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {label}
                  </span>
                  {badge !== null && badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-center pb-1">
              <a
                href="/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <BookOpen className="w-3 h-3" />
                How to Play
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
