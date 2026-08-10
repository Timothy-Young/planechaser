'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SchemeBoard } from '@/components/game/scheme-board'
import type { ArchenemyState } from '@/lib/game/types'

interface SchemeSheetProps {
  archenemy: ArchenemyState
  onSetSchemeInMotion: () => void
  onDismissScheme: (instanceId: string) => void
}

/**
 * The scheme board for a combined Planechase + Archenemy game.
 *
 * The plane card owns the screen there, so the board lives behind a pill and
 * opens as a bottom sheet. Previously an inline row of schemes squeezed the
 * plane card down to 300px tall as soon as one ongoing scheme was out.
 */
export function SchemeSheet({ archenemy, onSetSchemeInMotion, onDismissScheme }: SchemeSheetProps) {
  const [open, setOpen] = useState(false)
  const count = archenemy.schemesInMotion.length

  return (
    <>
      <div className="w-full max-w-[440px] flex items-center justify-between gap-2">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-full border border-[var(--color-cta)]/40 bg-[var(--color-cta)]/10 text-[12px] text-[var(--color-cta)] transition-colors hover:bg-[var(--color-cta)]/20 cursor-pointer"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Schemes ({count})
        </button>
        <Button
          onClick={onSetSchemeInMotion}
          disabled={archenemy.schemeDeck.length === 0}
          className="h-9 px-4 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '12px' }}
        >
          Set Scheme in Motion
        </Button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-x border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p
                  className="text-[10px] text-[var(--color-cta)] uppercase tracking-widest font-bold"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Schemes in Motion
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Close
                </button>
              </div>

              <p
                className="text-[11px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {archenemy.schemeDeck.length} left in the scheme deck
              </p>

              <SchemeBoard schemesInMotion={archenemy.schemesInMotion} onDismiss={onDismissScheme} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
