'use client'

import { useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'

/**
 * Full-screen image preview. `landscape` rotates a portrait Scryfall card image
 * 90° into plane orientation; without it the image keeps its natural aspect,
 * which is what user-uploaded custom plane art needs.
 */
export function ImagePreviewModal({
  url,
  name,
  onClose,
  landscape,
}: {
  url: string
  name: string
  onClose: () => void
  landscape?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      {/* Close button — always visible at top-right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        aria-label="Close preview"
      >
        <X size={20} />
      </button>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {/* Skeleton loader */}
        {!loaded && (
          <div
            className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse flex items-center justify-center ${landscape ? 'w-[min(400px,85vw)] aspect-[7/5]' : 'w-[280px] h-[400px]'}`}
          >
            <ImageIcon size={48} className="text-[var(--color-text-muted)] opacity-30" />
          </div>
        )}

        {landscape ? (
          /* Plane cards: rotate portrait Scryfall image 90° to display landscape */
          <div className={`w-[min(400px,85vw)] aspect-[7/5] rounded-xl overflow-hidden border border-[var(--color-border)] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <img
                  src={url}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={() => setLoaded(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={url}
            alt={name}
            className={`max-w-full max-h-[75vh] rounded-xl border border-[var(--color-border)] object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>

      <p
        className="text-center text-[12px] text-[var(--color-text-muted)] mt-3"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {name}
      </p>
    </div>
  )
}
