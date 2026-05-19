'use client'

import { useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, Save, X, RefreshCw, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSchemeDeck, useUpdateSchemeDeck } from '@/hooks/useSchemeDecks'
import { useSchemeCorpus } from '@/hooks/useCardCorpus'
import { CardZoomModal } from '@/components/card-zoom-modal'

const MIN_DECK_SIZE = 20

type FilterMode = 'all' | 'ongoing' | 'oneshot'

export default function SchemeDeckBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.id as string

  const { data: deck, isLoading: deckLoading } = useSchemeDeck(deckId)
  const { data: corpus, isLoading: corpusLoading } = useSchemeCorpus()
  const updateDeck = useUpdateSchemeDeck()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [deckName, setDeckName] = useState<string | null>(null)
  const [showDeckPanel, setShowDeckPanel] = useState(false)
  const [zoomCard, setZoomCard] = useState<{ src: string; name: string } | null>(null)

  const currentIds = selectedIds ?? new Set(deck?.scheme_ids ?? [])
  const currentName = deckName ?? deck?.name ?? ''

  const filteredCards = useMemo(() => {
    if (!corpus) return []
    let cards = corpus
    if (filterMode === 'ongoing') cards = cards.filter((c) => c.isOngoing === true)
    if (filterMode === 'oneshot') cards = cards.filter((c) => c.isOngoing === false)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cards = cards.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.oracle_text.toLowerCase().includes(q),
      )
    }
    return cards
  }, [corpus, filterMode, searchQuery])

  const toggleCard = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev ?? new Set(deck?.scheme_ids ?? []))
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [deck?.scheme_ids])

  const hasChanges = useMemo(() => {
    if (!deck) return false
    if ((deckName ?? deck.name) !== deck.name) return true
    const current = selectedIds ?? new Set(deck.scheme_ids)
    if (current.size !== deck.scheme_ids.length) return true
    return !deck.scheme_ids.every((id) => current.has(id))
  }, [deck, selectedIds, deckName])

  function handleSave() {
    if (!deck) return
    const updates: { name?: string; scheme_ids?: string[] } = {}
    if ((deckName ?? deck.name) !== deck.name) updates.name = deckName ?? deck.name
    if (selectedIds) updates.scheme_ids = Array.from(selectedIds)
    if (Object.keys(updates).length === 0) return

    updateDeck.mutate(
      { deckId: deck.id, updates },
      { onSuccess: () => router.push('/scheme-decks') },
    )
  }

  if (deckLoading || corpusLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Loading...
          </p>
        </div>
      </main>
    )
  }

  if (!deck) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Deck not found.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <CardZoomModal
        src={zoomCard?.src ?? null}
        alt={zoomCard?.name ?? ''}
        onClose={() => setZoomCard(null)}
        rotate={false}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 glass-strong border-b border-[var(--color-border)] px-4 py-3">
        <div className="max-w-[420px] mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/scheme-decks')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <ArrowLeft size={20} />
            </button>
            <Input
              value={currentName}
              onChange={(e) => setDeckName(e.target.value)}
              className="flex-1 mx-3 h-8 text-[15px] font-semibold bg-transparent border-none text-center text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            />
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateDeck.isPending || currentIds.size < MIN_DECK_SIZE}
              className="h-8 px-3 bg-[var(--color-accent-deep)] text-white text-[12px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Save size={14} className="mr-1" />
              {updateDeck.isPending ? '...' : 'Save'}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input
              placeholder="Search schemes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] text-[13px]"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters + deck count */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['all', 'ongoing', 'oneshot'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filterMode === mode
                      ? 'bg-[var(--color-accent-deep)] text-white'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {mode === 'all' ? 'All' : mode === 'ongoing' ? 'Ongoing' : 'One-shot'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDeckPanel(!showDeckPanel)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                currentIds.size >= MIN_DECK_SIZE
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'bg-[var(--color-cta)]/15 text-[var(--color-cta)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {currentIds.size} card{currentIds.size !== 1 ? 's' : ''}
              {currentIds.size < MIN_DECK_SIZE && ` (min ${MIN_DECK_SIZE})`}
            </button>
          </div>

          {/* Result count */}
          <div className="flex items-center">
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Deck panel (selected cards) */}
      <AnimatePresence>
        {showDeckPanel && currentIds.size > 0 && corpus && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 overflow-hidden"
          >
            <div className="max-w-[420px] mx-auto px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {corpus
                  .filter((c) => currentIds.has(c.id))
                  .map((card) => (
                    <button
                      key={card.id}
                      onClick={() => toggleCard(card.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] hover:bg-[var(--color-cta)]/15 hover:text-[var(--color-cta)] transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {card.name}
                      <X size={10} />
                    </button>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card grid */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[420px] mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {filteredCards.map((card) => {
              const isSelected = currentIds.has(card.id)

              return (
                <motion.button
                  key={card.id}
                  layout
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleCard(card.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50'
                      : 'border-transparent hover:border-[var(--color-border)]'
                  }`}
                >
                  {/* Card image — portrait, no rotation */}
                  <div className="relative w-full aspect-[5/7] overflow-hidden">
                    <img
                      src={card.image_uris.border_crop}
                      alt={card.name}
                      className={`absolute inset-0 w-full h-full object-cover ${isSelected ? 'brightness-100' : 'brightness-75'}`}
                      loading="lazy"
                    />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                    {card.isOngoing && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold"
                        style={{ fontFamily: 'var(--font-heading)' }}>
                        <RefreshCw size={9} /> Ongoing
                      </span>
                    )}
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                      <span className="text-white text-[11px] font-bold">&#10003;</span>
                    </div>
                  )}

                  {/* Zoom button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoomCard({ src: card.image_uris.border_crop, name: card.name })
                    }}
                    className="absolute bottom-8 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <ZoomIn size={12} className="text-white" />
                  </button>

                  {/* Card name overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                    <p className="text-white text-[10px] font-semibold truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {card.name}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {filteredCards.length === 0 && (
            <p className="text-center text-[var(--color-text-muted)] text-[13px] py-8" style={{ fontFamily: 'var(--font-body)' }}>
              No cards match your search.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
