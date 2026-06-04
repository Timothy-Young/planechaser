'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Trash2, Layers, Star, Shield, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserDecks, useCreateDeck, useDeleteDeck, useCreateDefaultDeck } from '@/hooks/useDecks'
import {
  useUserSchemeDecks,
  useCreateSchemeDeck,
  useDeleteSchemeDeck,
  useCreateDefaultSchemeDeck,
} from '@/hooks/useSchemeDecks'
import { usePlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
import { useAppStore } from '@/store/app-store'
import { SCHEME_PRESETS, buildPresetDeck } from '@/lib/scheme-decks/presets'

type DeckTab = 'plane' | 'scheme'
type TemplateName = 'Custom' | 'Aggressive' | 'Balanced' | 'Chaos'

const MIN_PLANE_DECK_SIZE = 10
const MIN_SCHEME_DECK_SIZE = 20

export default function DecksPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const [tab, setTab] = useState<DeckTab>('plane')

  // Plane deck state
  const { data: planeDecks, isLoading: planeLoading } = useUserDecks()
  const { data: planeCorpus } = usePlaneCorpus()
  const createPlaneDeck = useCreateDeck()
  const deletePlaneDeck = useDeleteDeck()
  const createDefaultPlaneDeck = useCreateDefaultDeck()
  const [planeAutoCreating, setPlaneAutoCreating] = useState(false)

  // Scheme deck state
  const { data: schemeDecks, isLoading: schemeLoading } = useUserSchemeDecks()
  const { data: schemeCorpus } = useSchemeCorpus()
  const createSchemeDeck = useCreateSchemeDeck()
  const deleteSchemeDeckMutation = useDeleteSchemeDeck()
  const createDefaultSchemeDeck = useCreateDefaultSchemeDeck()
  const [schemeAutoCreating, setSchemeAutoCreating] = useState(false)

  // Shared create state
  const [showCreate, setShowCreate] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>('Balanced')

  // Auto-create defaults
  useEffect(() => {
    if (!planeLoading && user && planeDecks && planeDecks.length === 0 && planeCorpus && !planeAutoCreating && !createDefaultPlaneDeck.isPending) {
      setPlaneAutoCreating(true)
      const planeOnlyIds = planeCorpus.filter((c) => c.card_type === 'plane').map((c) => c.id)
      createDefaultPlaneDeck.mutate(planeOnlyIds)
    }
  }, [planeLoading, user, planeDecks, planeCorpus, planeAutoCreating, createDefaultPlaneDeck])

  useEffect(() => {
    if (!schemeLoading && user && schemeDecks && schemeDecks.length === 0 && schemeCorpus && !schemeAutoCreating && !createDefaultSchemeDeck.isPending) {
      setSchemeAutoCreating(true)
      const allSchemeIds = schemeCorpus.map((c) => c.id)
      createDefaultSchemeDeck.mutate(allSchemeIds)
    }
  }, [schemeLoading, user, schemeDecks, schemeCorpus, schemeAutoCreating, createDefaultSchemeDeck])

  const isLoading = tab === 'plane' ? planeLoading : schemeLoading
  const decks = tab === 'plane' ? planeDecks : schemeDecks
  const hasDecks = decks && decks.length > 0

  function handleCreateDeck() {
    const name = newDeckName.trim()
    if (!name) return

    if (tab === 'plane') {
      createPlaneDeck.mutate(
        { name, planeIds: [] },
        {
          onSuccess: (deck) => {
            resetCreate()
            router.push(`/decks/${deck.id}`)
          },
        },
      )
    } else {
      let schemeIds: string[] = []
      if (selectedTemplate !== 'Custom' && schemeCorpus) {
        const schemesForPreset = schemeCorpus.map((c) => ({
          id: c.id,
          oracle_text: c.oracle_text,
          is_ongoing: c.isOngoing,
        }))
        schemeIds = buildPresetDeck(selectedTemplate, schemesForPreset)
      }
      createSchemeDeck.mutate(
        { name, schemeIds },
        {
          onSuccess: (deck) => {
            resetCreate()
            router.push(`/scheme-decks/${deck.id}`)
          },
        },
      )
    }
  }

  function handleCreateDefault() {
    if (tab === 'plane') {
      if (!planeCorpus) return
      const planeOnlyIds = planeCorpus.filter((c) => c.card_type === 'plane').map((c) => c.id)
      createDefaultPlaneDeck.mutate(planeOnlyIds)
    } else {
      if (!schemeCorpus) return
      const allSchemeIds = schemeCorpus.map((c) => c.id)
      createDefaultSchemeDeck.mutate(allSchemeIds)
    }
  }

  function handleDelete(deckId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (tab === 'plane') {
      deletePlaneDeck.mutate(deckId)
    } else {
      deleteSchemeDeckMutation.mutate(deckId)
    }
  }

  function resetCreate() {
    setNewDeckName('')
    setSelectedTemplate('Balanced')
    setShowCreate(false)
  }

  const isCreating = tab === 'plane' ? createPlaneDeck.isPending : createSchemeDeck.isPending
  const isDefaultCreating = tab === 'plane' ? createDefaultPlaneDeck.isPending : createDefaultSchemeDeck.isPending
  const templateOptions: TemplateName[] = ['Custom', 'Aggressive', 'Balanced', 'Chaos']

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Sign in to manage your decks.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1
              className="text-[24px] font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              My Decks
            </h1>
            <Button
              onClick={() => setShowCreate(true)}
              className="h-9 px-3 bg-[var(--color-accent-deep)] text-white text-[13px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Plus size={16} className="mr-1" />
              New Deck
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/40">
            <button
              onClick={() => { setTab('plane'); setShowCreate(false) }}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'plane'
                  ? 'bg-[var(--color-accent-deep)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Layers size={14} /> Plane Decks
            </button>
            <button
              onClick={() => { setTab('scheme'); setShowCreate(false) }}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'scheme'
                  ? 'bg-[var(--color-accent-deep)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Shield size={14} /> Scheme Decks
            </button>
          </div>

          {/* Custom Planes button */}
          {tab === 'plane' && (
            <button
              onClick={() => router.push('/custom-planes')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors border border-[var(--color-accent)]/30"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Wand2 className="w-3 h-3" />
              Custom Planes
            </button>
          )}

          {/* Create form */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-3"
            >
              <Input
                placeholder="Deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
                className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-body)' }}
                autoFocus
              />

              {/* Template selector for scheme decks */}
              {tab === 'scheme' && (
                <div className="space-y-1.5">
                  <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    Template
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {templateOptions.map((tmpl) => {
                      const isSelected = selectedTemplate === tmpl
                      const preset = SCHEME_PRESETS.find((p) => p.name === tmpl)
                      return (
                        <button
                          key={tmpl}
                          onClick={() => setSelectedTemplate(tmpl)}
                          className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-accent-deep)] text-white border-[var(--color-accent-deep)]'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                          }`}
                          style={{ fontFamily: 'var(--font-heading)' }}
                          title={preset?.description ?? 'Start with an empty deck'}
                        >
                          {tmpl}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateDeck}
                  disabled={!newDeckName.trim() || isCreating}
                  className="flex-1 h-10 bg-[var(--color-accent-deep)] text-white text-[13px]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isCreating ? 'Creating...' : 'Create & Edit'}
                </Button>
                <Button
                  onClick={() => setShowCreate(false)}
                  variant="outline"
                  className="h-10 px-4 border-[var(--color-border)] text-[var(--color-text-muted)] text-[13px]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                Loading {tab === 'plane' ? '' : 'scheme '}decks...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasDecks && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-8 text-center space-y-4"
            >
              {tab === 'plane' ? (
                <Layers size={40} className="mx-auto text-[var(--color-text-muted)]" />
              ) : (
                <Shield size={40} className="mx-auto text-[var(--color-text-muted)]" />
              )}
              <p className="text-[15px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                No {tab === 'scheme' ? 'scheme ' : ''}decks yet. Create one or generate a starter deck.
              </p>
              <Button
                onClick={handleCreateDefault}
                disabled={isDefaultCreating || (tab === 'plane' ? !planeCorpus : !schemeCorpus)}
                className="h-11 px-6 bg-[var(--color-accent-deep)] text-white text-[14px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isDefaultCreating
                  ? 'Generating...'
                  : tab === 'plane'
                    ? 'Generate Default Deck (10 planes)'
                    : 'Generate Default Deck (20 schemes)'}
              </Button>
            </motion.div>
          )}

          {/* Deck cards */}
          {hasDecks && (
            <div className="space-y-3">
              {decks.map((deck, i) => {
                const isPlane = tab === 'plane'
                const cardCount = isPlane
                  ? (deck as { plane_ids: string[] }).plane_ids.length
                  : (deck as { scheme_ids: string[] }).scheme_ids.length
                const minSize = isPlane ? MIN_PLANE_DECK_SIZE : MIN_SCHEME_DECK_SIZE
                const isDefault = (deck as { is_default: boolean }).is_default
                const detailPath = isPlane ? `/decks/${deck.id}` : `/scheme-decks/${deck.id}`

                return (
                  <motion.button
                    key={deck.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(detailPath)}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 text-left transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isDefault && <Star size={16} className="shrink-0 text-[var(--color-gold)]" />}
                        <div className="min-w-0">
                          <p
                            className="text-[15px] font-semibold text-[var(--color-text)] truncate"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {deck.name}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                            {cardCount} {isPlane ? 'card' : 'scheme'}{cardCount !== 1 ? 's' : ''}
                            {cardCount < minSize && (
                              <span className={`ml-1 ${isPlane ? 'text-[var(--color-cta)]' : 'text-[var(--color-destructive)]'}`}>
                                (need {minSize - cardCount} more)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!isDefault && (
                        <button
                          onClick={(e) => handleDelete(deck.id, e)}
                          className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-cta)] hover:bg-[var(--color-cta)]/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
