'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface SubtypeAutocompleteProps {
  value: string
  onChange: (value: string) => void
  subtypes: string[]
  /** Extra fixed options prepended before subtypes (e.g. { value: 'custom', label: 'Custom' }) */
  extraOptions?: { value: string; label: string }[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}

export function SubtypeAutocomplete({
  value,
  onChange,
  subtypes,
  extraOptions = [],
  placeholder = 'All Subtypes',
  className = '',
  size = 'md',
}: SubtypeAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const textSize = size === 'sm' ? 'text-[12px]' : 'text-[13px]'
  const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-3 py-2'

  // All options: "All Subtypes" + extras + real subtypes
  const allOptions = useMemo(() => {
    const base = [{ value: 'all', label: placeholder }, ...extraOptions]
    return [...base, ...subtypes.map((s) => ({ value: s, label: s }))]
  }, [subtypes, extraOptions, placeholder])

  // Filtered by search query
  const filtered = useMemo(() => {
    if (!query) return allOptions
    const q = query.toLowerCase()
    return allOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [allOptions, query])

  // Display text for current value
  const displayLabel = value === 'all'
    ? placeholder
    : allOptions.find((o) => o.value === value)?.label ?? value

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('all')
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen((p) => !p)
          if (!open) setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className={`w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg ${padding} pr-8 ${textSize} text-left text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors cursor-pointer`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className={value === 'all' ? 'text-[var(--color-text-muted)]' : ''}>
          {displayLabel}
        </span>
      </button>

      {/* Icons */}
      {value !== 'all' ? (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <X size={size === 'sm' ? 12 : 14} />
        </button>
      ) : (
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl shadow-lg shadow-black/30 overflow-hidden"
          style={{ maxHeight: 260 }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--color-border)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter..."
              className={`w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 ${textSize} text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors`}
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <p
                className={`${textSize} text-[var(--color-text-muted)] text-center py-4`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                No matches
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 ${textSize} transition-colors ${
                    option.value === value
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 font-semibold'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-accent)]/5'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
