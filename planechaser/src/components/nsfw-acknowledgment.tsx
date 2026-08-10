'use client'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Shown for the life of the account once a user has had a plane blocked.
 * Submitting with this checked and still tripping the scan is what escalates a
 * warning into a strike.
 */
export function NsfwAcknowledgment({ checked, onChange }: Props) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 cursor-pointer min-h-[44px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--color-accent)] cursor-pointer"
      />
      <span
        className="text-[12px] text-[var(--color-text-secondary)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        I confirm this plane contains no nudity, gore, or profanity.{' '}
        <span className="text-[var(--color-accent)]">*</span>
      </span>
    </label>
  )
}
