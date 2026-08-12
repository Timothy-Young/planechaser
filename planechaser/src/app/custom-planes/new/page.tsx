'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload, Lock } from 'lucide-react'
import { useCreateCustomPlane } from '@/hooks/useCustomPlanes'
import { useCustomPlaneLimit } from '@/hooks/useLimits'
import { useModerationStatus } from '@/hooks/useModerationStatus'
import { CustomPlanePreview } from '@/components/custom-plane-preview'
import { ModerationNotice } from '@/components/moderation-notice'
import { NsfwAcknowledgment } from '@/components/nsfw-acknowledgment'
import { ModerationError, PlaneRequestError } from '@/lib/custom-planes/submit'
import type { ModerationRejection } from '@/lib/moderation/contract'
import type { TextField } from '@/lib/moderation/types'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_TYPE_LINE = 'Plane — Custom'

export default function CreateCustomPlanePage() {
  const router = useRouter()
  const createMutation = useCreateCustomPlane()
  const limit = useCustomPlaneLimit()
  const moderation = useModerationStatus()

  const [name, setName] = useState('')
  const [typeLine, setTypeLine] = useState(DEFAULT_TYPE_LINE)
  const [oracleText, setOracleText] = useState('')
  const [chaosText, setChaosText] = useState('')
  const [flavorText, setFlavorText] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rejection, setRejection] = useState<ModerationRejection | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // The flag is sticky server-side; a rejection in this session turns it on
  // immediately so the checkbox appears without waiting for a refetch.
  const ackRequired = moderation.ackRequired || rejection !== null

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /**
   * Clears only the fields the server named, not the whole form. One flagged
   * word in flavor text should not cost someone a fully composed card — the
   * penalty ladder is what handles deliberate abuse.
   */
  function clearFlaggedFields(fields: TextField[]) {
    const setters: Record<TextField, (value: string) => void> = {
      name: setName,
      type_line: () => setTypeLine(DEFAULT_TYPE_LINE),
      oracle_text: setOracleText,
      chaos_text: setChaosText,
      flavor_text: setFlavorText,
    }
    for (const field of fields) setters[field]('')
  }

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
    setRejection(null)

    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (limit.atLimit) {
      setFormError(
        `You've reached the limit of ${limit.max} custom planes. Delete one to make room.`,
      )
      return
    }
    if (ackRequired && !acknowledged) {
      setFormError('Please confirm this plane is safe for work.')
      return
    }

    setSaving(true)
    try {
      await createMutation.mutateAsync({
        file: imageFile,
        fields: {
          name: name.trim(),
          type_line: typeLine.trim() || DEFAULT_TYPE_LINE,
          oracle_text: oracleText.trim(),
          chaos_text: chaosText.trim(),
          flavor_text: flavorText.trim() || undefined,
          is_public: isPublic,
          acknowledged,
        },
      })

      router.push('/custom-planes')
    } catch (err) {
      if (err instanceof ModerationError) {
        setRejection(err.rejection)
        if (err.rejection.image_flagged) clearImage()
        clearFlaggedFields(err.rejection.text_fields)
        setAcknowledged(false)
        // A simulated rejection is the owner's — detection ran but nothing was
        // written to the ledger, so there is no penalty to mirror.
        if (!err.rejection.simulated) {
          moderation.applyPenalty({
            ackRequired: true,
            cooldownUntil: err.rejection.cooldown_until ?? null,
          })
        }
        moderation.refetch()
      } else if (err instanceof PlaneRequestError) {
        setFormError(err.message)
        if (err.response.error === 'cooldown') {
          moderation.applyPenalty({ cooldownUntil: err.response.cooldown_until ?? null })
        }
        if (err.response.error === 'cooldown' || err.response.error === 'banned') {
          moderation.refetch()
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      setSaving(false)
    }
  }

  const blocked = limit.atLimit || moderation.cooldownActive

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
          className="text-[17px] font-bold title-gradient"
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

            {/* Cooldown banner — mirrors the at-limit banner below */}
            {moderation.cooldownActive && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-cta)]/30 bg-[var(--color-cta)]/8 px-4 py-3">
                <Lock size={16} className="text-[var(--color-cta)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p
                    className="text-[12px] font-semibold text-[var(--color-cta)]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Plane creation paused — {moderation.cooldownLabel} remaining
                  </p>
                  <p
                    className="text-[11px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    This plane was paused after a content violation.
                  </p>
                </div>
              </div>
            )}

            {/* At-limit banner */}
            {limit.atLimit && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-cta)]/30 bg-[var(--color-cta)]/8 px-4 py-3">
                <Lock size={16} className="text-[var(--color-cta)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p
                    className="text-[12px] font-semibold text-[var(--color-cta)]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Custom plane limit reached ({limit.count} of {limit.max})
                  </p>
                  <p
                    className="text-[11px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Delete an existing plane before creating a new one.
                  </p>
                </div>
              </div>
            )}

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

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3">
              <div>
                <p
                  className="text-[13px] font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p
                  className="text-[11px] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {isPublic ? 'Visible to all players' : 'Only you can see this plane'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200"
                style={{ background: isPublic ? 'var(--color-accent)' : 'var(--color-border)' }}
                role="switch"
                aria-checked={isPublic}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: isPublic ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
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
                    clearImage()
                    setImageError(null)
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

            {/* Moderation warning / violation */}
            {rejection && <ModerationNotice rejection={rejection} />}

            {/* Sticky acknowledgment, shown for the life of the account */}
            {ackRequired && (
              <NsfwAcknowledgment checked={acknowledged} onChange={setAcknowledged} />
            )}

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
              disabled={saving || blocked}
              className="flex items-center justify-center gap-2 w-full bg-[var(--color-accent)] text-white rounded-xl py-3 text-[14px] font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking content…
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
