'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import { useCreateCustomPlane, useUploadPlaneImage } from '@/hooks/useCustomPlanes'
import { CustomPlanePreview } from '@/components/custom-plane-preview'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_TYPE_LINE = 'Plane — Custom'

export default function CreateCustomPlanePage() {
  const router = useRouter()
  const createMutation = useCreateCustomPlane()
  const uploadMutation = useUploadPlaneImage()

  const [name, setName] = useState('')
  const [typeLine, setTypeLine] = useState(DEFAULT_TYPE_LINE)
  const [oracleText, setOracleText] = useState('')
  const [chaosText, setChaosText] = useState('')
  const [flavorText, setFlavorText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('File must be JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('File must be under 5MB.')
      return
    }

    setImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  async function handleSave() {
    setFormError(null)
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }

    setSaving(true)
    try {
      let imagePath: string | null = null
      if (imageFile) {
        imagePath = await uploadMutation.mutateAsync(imageFile)
      }

      await createMutation.mutateAsync({
        name: name.trim(),
        type_line: typeLine.trim() || DEFAULT_TYPE_LINE,
        oracle_text: oracleText.trim(),
        chaos_text: chaosText.trim(),
        flavor_text: flavorText.trim() || undefined,
        image_path: imagePath,
      })

      router.push('/custom-planes')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      className="min-h-screen relative pb-nav"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] glass-strong">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-[17px] font-bold text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Create Custom Plane
        </h1>
      </header>

      {/* Layout: mobile stacked, desktop side-by-side */}
      <div className="relative z-10 px-4 py-6 max-w-[900px] mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Form (left on desktop) */}
          <div className="flex-1 space-y-5">

            {/* Name */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Name <span className="text-[var(--color-accent)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 100))}
                placeholder="e.g. The Shattered Vale"
                maxLength={100}
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl px-4 py-3 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Type Line */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Type Line
              </label>
              <input
                type="text"
                value={typeLine}
                onChange={(e) => setTypeLine(e.target.value)}
                placeholder={DEFAULT_TYPE_LINE}
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl px-4 py-3 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Oracle Text */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Oracle Text
              </label>
              <textarea
                value={oracleText}
                onChange={(e) => setOracleText(e.target.value)}
                placeholder="The plane's static ability..."
                rows={4}
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl px-4 py-3 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Chaos Text */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                🌀 Chaos Text
              </label>
              <textarea
                value={chaosText}
                onChange={(e) => setChaosText(e.target.value)}
                placeholder="What happens when chaos is rolled..."
                rows={3}
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl px-4 py-3 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Flavor Text */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Flavor Text <span className="text-[var(--color-text-muted)] normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={flavorText}
                onChange={(e) => setFlavorText(e.target.value)}
                placeholder="Italic flavor text..."
                rows={2}
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl px-4 py-3 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none italic"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Card Art <span className="text-[var(--color-text-muted)] normal-case font-normal">(optional, max 5MB)</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drop zone / preview */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 hover:bg-[var(--color-surface)]/70 transition-colors overflow-hidden"
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Card art preview"
                    className="w-full aspect-[16/9] object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Upload size={24} className="text-[var(--color-text-muted)]" />
                    <p
                      className="text-[12px] text-[var(--color-text-muted)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Upload Card Art
                    </p>
                    <p
                      className="text-[11px] text-[var(--color-text-muted)]/60"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      JPG, PNG, or WebP · max 5MB
                    </p>
                  </div>
                )}
              </button>

              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setImageError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Remove image
                </button>
              )}

              {imageError && (
                <p
                  className="text-[11px] text-red-400"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {imageError}
                </p>
              )}
            </div>

            {/* Form error */}
            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                <p
                  className="text-[12px] text-red-400"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {formError}
                </p>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full bg-[var(--color-accent)] text-white rounded-xl py-3 text-[14px] font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={16} />
                  Create Plane
                </>
              )}
            </button>
          </div>

          {/* Live Preview (right on desktop, top on mobile via order) */}
          <div className="w-full md:w-[300px] md:sticky md:top-[60px] md:self-start order-first md:order-last">
            <p
              className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Live Preview
            </p>
            <CustomPlanePreview
              name={name}
              typeLine={typeLine}
              oracleText={oracleText}
              chaosText={chaosText}
              flavorText={flavorText || undefined}
              imageUrl={imagePreview}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
