'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Pencil, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomPlanes, useDeleteCustomPlane } from '@/hooks/useCustomPlanes'
import { getImageUrl } from '@/lib/custom-planes/storage'

export default function CustomPlanesPage() {
  const router = useRouter()
  const { data: planes, isLoading } = useCustomPlanes()
  const deleteMutation = useDeleteCustomPlane()

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
                className="text-[17px] font-bold text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Custom Planes
              </h1>
            </div>
          </div>
          <Button
            onClick={() => router.push('/custom-planes/new')}
            className="h-8 px-3 bg-[var(--color-accent-deep)] text-white text-[12px] gap-1"
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
                        <Image
                          src={imageUrl}
                          alt={custom.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 420px) 50vw, 210px"
                        />
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
                      <p
                        className="text-[11px] text-[var(--color-text-muted)] truncate"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {custom.type_line}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
