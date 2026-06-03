'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaneCard } from '@/lib/game/types'

interface RevealCardsModalProps {
  cards: PlaneCard[]
  effectType: string
  onDismiss: () => void
  onReorder?: (cardIds: string[]) => void
  onReorderTop?: (cardIds: string[]) => void
}

export function RevealCardsModal({ cards, effectType, onDismiss, onReorder, onReorderTop }: RevealCardsModalProps) {
  const [orderedCards, setOrderedCards] = useState(cards)
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
  const showReorder = effectType === 'reveal_and_chaos' || effectType === 'reveal_and_choose'

  function moveCard(index: number, direction: 'up' | 'down') {
    const newOrder = [...orderedCards]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    setOrderedCards(newOrder)
  }

  function handleConfirm() {
    const ids = orderedCards.map((c) => c.id)
    if (placement === 'top' && onReorderTop) {
      onReorderTop(ids)
    } else if (onReorder) {
      onReorder(ids)
    }
    onDismiss()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/90 p-4"
    >
      <div className="w-full max-w-[400px] flex flex-col gap-4">
        <div className="text-center">
          <h2
            className="text-lg font-bold text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {effectType === 'reveal_and_chaos' && 'Revealed Cards — Chaos Triggers!'}
            {effectType === 'scry_top' && 'Top of Planar Deck'}
            {effectType === 'reveal_and_choose' && 'Choose a Plane'}
          </h2>
          {showReorder && (
            <>
              <p className="text-xs text-white/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Reorder, then choose where to place them
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={() => setPlacement('bottom')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    placement === 'bottom'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Bottom of Deck
                </button>
                <button
                  onClick={() => setPlacement('top')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    placement === 'top'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Top of Deck
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {orderedCards.map((card, i) => (
            <motion.div
              key={card.id}
              layout
              className="flex items-center gap-3 bg-white/5 rounded-xl p-2 border border-white/10"
            >
              <div className="relative w-20 aspect-[7/5] rounded-lg overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[140%] aspect-[5/7] rotate-90">
                    <Image
                      src={card.image_uris.border_crop}
                      alt={card.name}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  {card.name}
                </p>
                <p className="text-[10px] text-white/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {card.type_line}
                </p>
              </div>
              {showReorder && orderedCards.length > 1 && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveCard(i, 'up')}
                    disabled={i === 0}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-20 px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveCard(i, 'down')}
                    disabled={i === orderedCards.length - 1}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-20 px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    &#9660;
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm transition-opacity hover:opacity-90 cursor-pointer"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {showReorder
            ? `Place on ${placement === 'top' ? 'Top' : 'Bottom'} & Continue`
            : 'Continue'}
        </button>
      </div>
    </motion.div>
  )
}
