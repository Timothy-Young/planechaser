'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Trash2, Layers, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useUserSchemeDecks,
  useCreateSchemeDeck,
  useDeleteSchemeDeck,
  useCreateDefaultSchemeDeck,
} from '@/hooks/useSchemeDecks'
import { useSchemeCorpus } from '@/hooks/useCardCorpus'
import { useAppStore } from '@/store/app-store'
import { SCHEME_PRESETS, buildPresetDeck } from '@/lib/scheme-decks/presets'

const MIN_DECK_SIZE = 20

type TemplateName = 'Custom' | 'Aggressive' | 'Balanced' | 'Chaos'

export default function SchemeDecksPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const { data: decks, isLoading } = useUserSchemeDecks()
  const { data: corpus } = useSchemeCorpus()
  const createDeck = useCreateSchemeDeck()
  const deleteDeckMutation = useDeleteSchemeDeck()
  const createDefaultDeck = useCreateDefaultSchemeDeck()
  const [newDeckName, setNewDeckName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>('Balanced')
  const [showCreate, setShowCreate] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)

  useEffect(() => {
    if (!isLoading && user && decks && decks.length === 0 && corpus && !autoCreating && !createDefaultDeck.isPending) {
      setAutoCreating(true)
      const allSchemeIds = corpus.map((c) => c.id)
      createDefaultDeck.mutate(allSchemeIds)
    }
  }, [isLoading, user, decks, corpus, autoCreating, createDefaultDeck])

  const hasDecks = decks && decks.length > 0
  const templateOptions: TemplateName[] = ['Custom', 'Aggressive', 'Balanced', 'Chaos']

  function handleCreateDeck() {
    const name = newDeckName.trim()
    if (!name) return

    let schemeIds: string[] = []
    if (selectedTemplate !== 'Custom' && corpus) {
      const schemesForPreset = corpus.map((c) => ({
        id: c.id,
        oracle_text: c.oracle_text,
        is_ongoing: c.isOngoing,
      }))
      schemeIds = buildPresetDeck(selectedTemplate, schemesForPreset)
    }

    createDeck.mutate(
      { name, schemeIds },
      {
        onSuccess: (deck) => {
          setNewDeckName('')
          setSelectedTemplate('Balanced')
          setShowCreate(false)
          router.push(`/scheme-decks/${deck.id}`)
        },
      },
    )
  }

  function handleCreateDefault() {
    if (!corpus) return
    const allSchemeIds = corpus.map((c) => c.id)
    createDefaultDeck.mutate(allSchemeIds)
  }

  function handleDelete(deckId: string, e: React.MouseEvent) {
    e.stopPropagation()
    deleteDeckMutation.mutate(deckId)
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Sign in to manage your scheme decks.
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
              My Scheme Decks
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

              {/* Template selector */}
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

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateDeck}
                  disabled={!newDeckName.trim() || createDeck.isPending}
                  className="flex-1 h-10 bg-[var(--color-accent-deep)] text-white text-[13px]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {createDeck.isPending ? 'Creating...' : 'Create & Edit'}
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
                Loading scheme decks...
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
              <Layers size={40} className="mx-auto text-[var(--color-text-muted)]" />
              <p className="text-[15px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                No scheme decks yet. Create one or generate a default deck.
              </p>
              <Button
                onClick={handleCreateDefault}
                disabled={!corpus || createDefaultDeck.isPending}
                className="h-11 px-6 bg-[var(--color-accent-deep)] text-white text-[14px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {createDefaultDeck.isPending ? 'Generating...' : 'Generate Default Deck (20 schemes)'}
              </Button>
            </motion.div>
          )}

          {/* Deck cards */}
          {hasDecks && (
            <div className="space-y-3">
              {decks.map((deck, i) => (
                <motion.button
                  key={deck.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/scheme-decks/${deck.id}`)}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 text-left transition-all hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {deck.is_default && <Star size={16} className="shrink-0 text-[var(--color-gold)]" />}
                      <div className="min-w-0">
                        <p
                          className="text-[15px] font-semibold text-[var(--color-text)] truncate"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {deck.name}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                          {deck.scheme_ids.length} scheme{deck.scheme_ids.length !== 1 ? 's' : ''}
                          {deck.scheme_ids.length < MIN_DECK_SIZE && (
                            <span className="text-[var(--color-destructive)] ml-1">
                              (need {MIN_DECK_SIZE - deck.scheme_ids.length} more)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {!deck.is_default && (
                      <button
                        onClick={(e) => handleDelete(deck.id, e)}
                        className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
