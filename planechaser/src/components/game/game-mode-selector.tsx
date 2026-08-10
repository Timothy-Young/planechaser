'use client'

import type { GameMode } from '@/lib/game/types'

interface GameModeSelectorProps {
  value: GameMode
  onChange: (mode: GameMode) => void
}

const MODES: { mode: GameMode; label: string; blurb: string }[] = [
  { mode: 'planechase', label: 'Planechase', blurb: 'Planar deck and die' },
  { mode: 'archenemy', label: 'Archenemy', blurb: 'Schemes only — no planeswalking' },
  { mode: 'both', label: 'Both', blurb: 'Planeswalk and schemes together' },
]

/** Picks which format a session runs: Planechase, Archenemy, or both at once. */
export function GameModeSelector({ value, onChange }: GameModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label
        className="text-[12px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Game Type
      </label>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((option) => {
          const isSelected = value === option.mode
          return (
            <button
              key={option.mode}
              onClick={() => onChange(option.mode)}
              aria-pressed={isSelected}
              className={`rounded-xl px-2 py-2.5 text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-accent-deep)] text-white glow-purple'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
              }`}
            >
              <span
                className="block text-[13px] font-semibold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {option.label}
              </span>
              <span
                className={`block text-[10px] leading-tight mt-0.5 ${isSelected ? 'opacity-80' : 'opacity-70'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {option.blurb}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
