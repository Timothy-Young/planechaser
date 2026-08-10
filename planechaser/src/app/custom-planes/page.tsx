'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Pencil, Trash2, Wand2, Globe, Lock, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagePreviewModal } from '@/components/image-preview-modal'
import { useCustomPlanes, useDeleteCustomPlane } from '@/hooks/useCustomPlanes'
import { useCustomPlaneLimit } from '@/hooks/useLimits'
import { getImageUrl } from '@/lib/custom-planes/storage'

export default function CustomPlanesPage() {
  const router = useRouter()
  const { data: planes, isLoading } = useCustomPlanes()
  const limit = useCustomPlaneLimit()
  const deleteMutation = useDeleteCustomPlane()
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  function handleDelete(id: string, imagePath: string | null, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate({ id, imagePath })
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-20 glass-strong border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between max-w-[420px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Wand2 size={18} className="text-[var(--color-accent)]" />
              <h1
                className="text-[17px] font-bold title-gradient"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Custom Planes
              </h1>
            </div>
          </div>
          <Button
            onClick={() => router.push('/custom-planes/new')}
            disabled={limit.atLimit}
            title={limit.atLimit ? `Limit reached (${limit.max} planes)` : undefined}
            className="h-8 px-3 bg-[var(--color-accent-deep)] text-white text-[12px] gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Plus size={14} />
            Create
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 py-6">
        <div className="max-w-[420px] mx-auto">
          {/* Usage counter — hidden when signed out and for staff, who have no cap */}
          {limit.showUsage && (
            <div className="mb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <p
                  className="text-[12px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className="text-[var(--color-text)] font-semibold">{limit.count}</span> of{' '}
                  {limit.max} planes used
                </p>
                {limit.atLimit && (
                  <p
                    className="text-[11px] font-semibold text-[var(--color-cta)]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Limit reached
                  </p>
                )}
              </div>
              <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (limit.count / limit.max) * 100)}%`,
                    background: limit.atLimit ? 'var(--color-cta)' : 'var(--color-accent)',
                  }}
                />
              </div>
              {limit.atLimit && (
                <p
                  className="text-[11px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Delete a plane to make room for a new one.
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16">
              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p
                className="text-[13px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Loading custom planes...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && (!planes || planes.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-10 text-center space-y-5 mt-4"
            >
              <div className="text-5xl">🖼️</div>
              <div className="space-y-1">
                <p
                  className="text-[16px] font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  No custom planes yet
                </p>
                <p
                  className="text-[13px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  You haven&apos;t created any custom planes yet.
                </p>
              </div>
              <Button
                onClick={() => router.push('/custom-planes/new')}
                className="h-11 px-6 bg-[var(--color-accent-deep)] text-white text-[14px] gap-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Plus size={16} />
                Create Your First Plane
              </Button>
            </motion.div>
          )}

          {/* Planes grid */}
          {!isLoading && planes && planes.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {planes.map((custom, i) => {
                const imageUrl = custom.image_path ? getImageUrl(custom.image_path) : null

                return (
                  <motion.div
                    key={custom.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden"
                  >
                    {/* Thumbnail with overlay buttons */}
                    <div className="relative aspect-[16/9] bg-[var(--color-surface)]">
                      {imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreview({ url: imageUrl, name: custom.name })}
                          className="absolute inset-0 cursor-zoom-in group"
                          aria-label={`View ${custom.name} image`}
                        >
                          <Image
                            src={imageUrl}
                            alt={custom.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 420px) 50vw, 210px"
                          />
                          <span className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-opacity">
                            <Maximize2 size={12} />
                          </span>
                        </button>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl text-[var(--color-text-muted)]">
                          🖼️
                        </div>
                      )}

                      {/* Edit / Delete overlay */}
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        <button
                          onClick={() => router.push(`/custom-planes/${custom.id}/edit`)}
                          className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                          aria-label={`Edit ${custom.name}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(custom.id, custom.image_path, custom.name)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors backdrop-blur-sm"
                          aria-label={`Delete ${custom.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="px-2.5 py-2 space-y-0.5">
                      <p
                        className="text-[13px] font-semibold text-[var(--color-text)] truncate leading-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {custom.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <p
                          className="text-[11px] text-[var(--color-text-muted)] truncate flex-1"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {custom.type_line}
                        </p>
                        {custom.is_public ? (
                          <span title="Public"><Globe size={10} className="text-[var(--color-accent)] shrink-0" /></span>
                        ) : (
                          <span title="Private"><Lock size={10} className="text-[var(--color-text-muted)] shrink-0" /></span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <ImagePreviewModal
          url={preview.url}
          name={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </main>
  )
}
