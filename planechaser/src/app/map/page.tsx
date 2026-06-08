'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Map as MapIcon, ChevronDown, Search, X } from 'lucide-react'
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
import { usePodConquests, useUserPods } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { CardZoomModal } from '@/components/card-zoom-modal'
import { SubtypeAutocomplete } from '@/components/subtype-autocomplete'
import type { MapConquest } from '@/lib/map/queries'
import { extractSubtype, getUniqueSubtypes } from '@/lib/cards/subtypes'

// 8 colors: gold for current user, then 7 for podmates
const MEMBER_COLORS = [
  // index 0 = current user (gold)
  { border: 'border-yellow-500', label: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  // podmates
  { border: 'border-blue-500', label: 'text-blue-300', bg: 'bg-blue-500/20' },
  { border: 'border-emerald-500', label: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  { border: 'border-rose-500', label: 'text-rose-300', bg: 'bg-rose-500/20' },
  { border: 'border-purple-500', label: 'text-purple-300', bg: 'bg-purple-500/20' },
  { border: 'border-orange-500', label: 'text-orange-300', bg: 'bg-orange-500/20' },
  { border: 'border-cyan-500', label: 'text-cyan-300', bg: 'bg-cyan-500/20' },
  { border: 'border-pink-500', label: 'text-pink-300', bg: 'bg-pink-500/20' },
]

type FilterValue = 'all' | 'mine' | 'unclaimed' | string // string = podmate user_id

interface PlaneThumbProps {
  id: string
  name: string
  normalUrl: string
  borderCropUrl: string
  conquest: MapConquest | undefined
  colorIndex: number | null // null = unclaimed
  isCurrentUser: boolean
  onTap: (src: string, name: string) => void
}

function PlaneThumbnail({
  name,
  normalUrl,
  borderCropUrl,
  conquest,
  colorIndex,
  onTap,
}: PlaneThumbProps) {
  const color = colorIndex !== null ? MEMBER_COLORS[colorIndex % MEMBER_COLORS.length] : null

  return (
    <button
      type="button"
      className={`relative aspect-[7/5] rounded-lg overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-transform active:scale-95 ${
        color ? color.border : 'border-[var(--color-border)] opacity-50'
      }`}
      onClick={() => onTap(borderCropUrl, name)}
      aria-label={name}
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={normalUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: 'rotate(90deg) scale(1.42)',
            transformOrigin: 'center center',
          }}
          loading="lazy"
        />
      </div>
      {conquest && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 flex items-center justify-center">
          <span
            className={`text-[7px] font-semibold truncate ${color ? color.label : 'text-white'}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {conquest.display_name}
          </span>
        </div>
      )}
    </button>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[7/5] rounded-lg bg-[var(--color-surface)] animate-pulse border-2 border-[var(--color-border)]"
        />
      ))}
    </div>
  )
}

export default function MapPage() {
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const setActivePodId = useAppStore((s) => s.setActivePodId)
  const { data: planes, isLoading: planesLoading } = usePlaneCorpus()
  const { data: conquests, isLoading: conquestsLoading } = usePodConquests(activePodId ?? undefined)
  const { data: pods } = useUserPods()

  const [filter, setFilter] = useState<FilterValue>('all')
  const [subtypeFilter, setSubtypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [zoomAlt, setZoomAlt] = useState('')

  // Only show planes (not phenomena)
  const planeCards = useMemo(
    () => (planes ?? []).filter((p) => p.card_type === 'plane'),
    [planes],
  )

  // Build a map: plane_scryfall_id -> conquest
  const conquestMap = useMemo(() => {
    return new Map<string, MapConquest>((conquests ?? []).map((c) => [c.plane_scryfall_id, c]))
  }, [conquests])

  // Build ordered list of unique conquerors (current user first, then others in appearance order)
  const orderedConquerors = useMemo(() => {
    const seen = new Set<string>()
    const result: { user_id: string; display_name: string }[] = []

    // Current user first (if they have any conquests)
    if (user) {
      for (const c of conquests ?? []) {
        if (c.user_id === user.id && !seen.has(c.user_id)) {
          seen.add(c.user_id)
          result.push({ user_id: c.user_id, display_name: c.display_name })
          break
        }
      }
    }

    // Then remaining conquerors in order of appearance
    for (const c of conquests ?? []) {
      if (!seen.has(c.user_id)) {
        seen.add(c.user_id)
        result.push({ user_id: c.user_id, display_name: c.display_name })
      }
    }
    return result
  }, [conquests, user])

  // Map user_id -> color index (current user always 0)
  const colorIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    if (user) {
      map.set(user.id, 0)
      idx = 1
    }
    for (const c of orderedConquerors) {
      if (!map.has(c.user_id)) {
        map.set(c.user_id, idx % MEMBER_COLORS.length)
        idx++
      }
    }
    return map
  }, [orderedConquerors, user])

  // Filter options for the select
  const filterOptions = useMemo(() => {
    const opts: { value: FilterValue; label: string }[] = [
      { value: 'all', label: 'All Planes' },
      { value: 'mine', label: 'Mine' },
      { value: 'unclaimed', label: 'Unclaimed' },
    ]
    for (const c of orderedConquerors) {
      if (c.user_id !== user?.id) {
        opts.push({ value: c.user_id, label: c.display_name })
      }
    }
    return opts
  }, [orderedConquerors, user])

  // Subtypes for dropdown
  const subtypes = useMemo(() => getUniqueSubtypes(planeCards), [planeCards])

  // Apply filter
  const filteredPlanes = useMemo(() => {
    let cards = planeCards
    // Conquest/ownership filter
    if (filter === 'mine') {
      cards = cards.filter((p) => {
        const c = conquestMap.get(p.id)
        return c && c.user_id === user?.id
      })
    } else if (filter === 'unclaimed') {
      cards = cards.filter((p) => !conquestMap.has(p.id))
    } else if (filter !== 'all') {
      // Podmate filter (user_id string)
      cards = cards.filter((p) => {
        const c = conquestMap.get(p.id)
        return c && c.user_id === filter
      })
    }
    // Subtype filter
    if (subtypeFilter !== 'all') {
      cards = cards.filter((p) => extractSubtype(p.type_line) === subtypeFilter)
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cards = cards.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.oracle_text.toLowerCase().includes(q)
      )
    }
    return cards
  }, [planeCards, filter, subtypeFilter, searchQuery, conquestMap, user])

  // Stats
  const myCount = useMemo(
    () => (conquests ?? []).filter((c) => c.user_id === user?.id).length,
    [conquests, user],
  )
  const totalClaimed = useMemo(
    () => new Set((conquests ?? []).map((c) => c.plane_scryfall_id)).size,
    [conquests],
  )
  const totalPlanes = planeCards.length

  function handleTap(src: string, name: string) {
    setZoomSrc(src)
    setZoomAlt(name)
  }

  const isLoading = planesLoading || conquestsLoading

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[100px]" />
      </div>

      <div className="relative z-10 flex-1 px-4 py-6 max-w-[640px] mx-auto w-full space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <MapIcon className="w-6 h-6 text-[var(--color-accent)]" />
          <h1
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Planar Map
          </h1>
        </motion.div>

        {/* Pod selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative">
            <select
              value={activePodId ?? ''}
              onChange={(e) => setActivePodId(e.target.value || null)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 pr-8 text-[14px] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] appearance-none"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="">Select a Pod...</option>
              {(pods ?? []).map((pod) => (
                <option key={pod.id} value={pod.id}>
                  {pod.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
          </div>
        </motion.div>

        {/* Stats bar */}
        {!isLoading && activePodId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 text-sm text-[var(--color-text-muted)] flex-wrap"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="text-yellow-400 font-semibold">{myCount} yours</span>
            <span>·</span>
            <span>{totalClaimed} claimed</span>
            <span>·</span>
            <span>{totalPlanes} total</span>
          </motion.div>
        )}

        {/* No pod message */}
        {!activePodId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Select a pod above to see conquest data on the planar map.
          </motion.p>
        )}

        {/* Filters */}
        {activePodId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            {/* Conquest filter */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterValue)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 pr-8 text-[14px] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] appearance-none"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
            </div>

            {/* Subtype + search row */}
            <div className="flex gap-2">
              <SubtypeAutocomplete
                value={subtypeFilter}
                onChange={setSubtypeFilter}
                subtypes={subtypes}
                className="flex-1"
              />
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-8 pr-8 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Subtype + search for no-pod view */}
        {!activePodId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2"
          >
            <SubtypeAutocomplete
              value={subtypeFilter}
              onChange={setSubtypeFilter}
              subtypes={subtypes}
              className="flex-1"
            />
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-8 pr-8 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <SkeletonGrid />
          ) : filteredPlanes.length === 0 ? (
            <div
              className="py-16 text-center text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <p className="text-lg font-semibold text-[var(--color-text-secondary)] mb-1">
                No planes found
              </p>
              <p className="text-sm">Try a different filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {filteredPlanes.map((plane) => {
                const conquest = conquestMap.get(plane.id)
                const colorIndex = conquest ? (colorIndexMap.get(conquest.user_id) ?? null) : null
                const isCurrentUser = !!conquest && conquest.user_id === user?.id
                return (
                  <PlaneThumbnail
                    key={plane.id}
                    id={plane.id}
                    name={plane.name}
                    normalUrl={plane.image_uris.normal}
                    borderCropUrl={plane.image_uris.border_crop}
                    conquest={conquest}
                    colorIndex={colorIndex}
                    isCurrentUser={isCurrentUser}
                    onTap={handleTap}
                  />
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Zoom modal — rotate=true for landscape plane display */}
      <CardZoomModal src={zoomSrc} alt={zoomAlt} onClose={() => setZoomSrc(null)} rotate={true} />
    </main>
  )
}
