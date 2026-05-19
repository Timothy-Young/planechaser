'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Trash2, Layers, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserDecks, useCreateDeck, useDeleteDeck, useCreateDefaultDeck } from '@/hooks/useDecks'
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
import { useAppStore } from '@/store/app-store'

const MIN_DECK_SIZE = 10

export default function DecksPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const { data: decks, isLoading } = useUserDecks()
  const { data: corpus } = usePlaneCorpus()
  const createDeck = useCreateDeck()
  const deleteDeckMutation = useDeleteDeck()
  const createDefaultDeck = useCreateDefaultDeck()
  const [newDeckName, setNewDeckName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)

  useEffect(() => {
    if (!isLoading && user && decks && decks.length === 0 && corpus && !autoCreating && !createDefaultDeck.isPending) {
      setAutoCreating(true)
      const planeOnlyIds = corpus.filter((c) => c.card_type === 'plane').map((c) => c.id)
      createDefaultDeck.mutate(planeOnlyIds)
    }
  }, [isLoading, user, decks, corpus, autoCreating, createDefaultDeck])

  const hasDecks = decks && decks.length > 0

  function handleCreateDeck() {
    const name = newDeckName.trim()
    if (!name) return
    createDeck.mutate(
      { name, planeIds: [] },
      {
        onSuccess: (deck) => {
          setNewDeckName('')
          setShowCreate(false)
          router.push(`/decks/${deck.id}`)
        },
      },
    )
  }

  function handleCreateDefault() {
    if (!corpus) return
    const planeOnlyIds = corpus.filter((c) => c.card_type === 'plane').map((c) => c.id)
    createDefaultDeck.mutate(planeOnlyIds)
  }

  function handleDelete(deckId: string, e: React.MouseEvent) {
    e.stopPropagation()
    deleteDeckMutation.mutate(deckId)
  }

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
                Loading decks...
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
                No decks yet. Create one or generate a starter deck.
              </p>
              <Button
                onClick={handleCreateDefault}
                disabled={!corpus || createDefaultDeck.isPending}
                className="h-11 px-6 bg-[var(--color-accent-deep)] text-white text-[14px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {createDefaultDeck.isPending ? 'Generating...' : 'Generate Default Deck (10 planes)'}
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
                  onClick={() => router.push(`/decks/${deck.id}`)}
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
                          {deck.plane_ids.length} card{deck.plane_ids.length !== 1 ? 's' : ''}
                          {deck.plane_ids.length < MIN_DECK_SIZE && (
                            <span className="text-[var(--color-cta)] ml-1">
                              (need {MIN_DECK_SIZE - deck.plane_ids.length} more)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {!deck.is_default && (
                      <button
                        onClick={(e) => handleDelete(deck.id, e)}
                        className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-cta)] hover:bg-[var(--color-cta)]/10 transition-colors"
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
