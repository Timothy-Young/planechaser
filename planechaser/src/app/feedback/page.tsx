'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { submitFeedback } from '@/lib/feedback/queries'
import { useAppStore } from '@/store/app-store'
import { Footer } from '@/components/footer'

const CATEGORIES = [
  { key: 'bug' as const, label: 'Bug Report', emoji: '🐛' },
  { key: 'feature' as const, label: 'Feature Request', emoji: '💡' },
  { key: 'general' as const, label: 'General Feedback', emoji: '💬' },
  { key: 'other' as const, label: 'Other', emoji: '📝' },
]

const MAX_CHARS = 1000
const MIN_CHARS = 10

export default function FeedbackPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)

  const [category, setCategory] = useState<'bug' | 'feature' | 'general' | 'other' | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const charCount = message.length
  const isValid = category !== null && charCount >= MIN_CHARS

  async function handleSubmit() {
    if (!user) {
      setError('You must be signed in to submit feedback.')
      return
    }
    if (!isValid) return

    setLoading(true)
    setError(null)

    try {
      await submitFeedback(user.id, { category: category!, message })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSendMore() {
    setCategory(null)
    setMessage('')
    setSubmitted(false)
    setError(null)
  }

  return (
    <main
      className="min-h-screen relative overflow-hidden pb-nav"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] glass-strong">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
          <div>
            <h1
              className="text-lg font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Send Feedback
            </h1>
            <p
              className="text-[11px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Report bugs, request features, or share thoughts
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 py-6 space-y-5 max-w-[520px] mx-auto">
        <AnimatePresence mode="wait">
          {submitted ? (
            /* Success screen */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6 pt-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-[var(--color-accent)]" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <h2
                  className="text-[22px] font-bold text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Feedback Received!
                </h2>
                <p
                  className="text-[13px] text-[var(--color-text-muted)] leading-relaxed max-w-[300px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Thanks for helping make PlaneChaser better. Your feedback has been sent.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 w-full max-w-[280px]"
              >
                <button
                  onClick={handleSendMore}
                  className="py-3 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-[13px] font-semibold hover:bg-[var(--color-accent)]/25 transition-colors"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Send More Feedback
                </button>
                <a
                  href="/support"
                  className="py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[13px] font-semibold hover:bg-white/5 transition-colors text-center"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Back to Support
                </a>
              </motion.div>
            </motion.div>
          ) : (
            /* Form */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Not signed in warning */}
              {!user && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
                  <p
                    className="text-[13px] text-[var(--color-text-muted)] text-center"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    You must be{' '}
                    <a href="/login" className="text-[var(--color-accent)] underline underline-offset-2">
                      signed in
                    </a>{' '}
                    to submit feedback.
                  </p>
                </div>
              )}

              {/* Category selector */}
              <div className="space-y-2">
                <p
                  className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider px-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Category
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key)}
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                        style={{
                          borderColor: isSelected
                            ? 'var(--color-accent)'
                            : 'var(--color-border)',
                          background: isSelected
                            ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                            : 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                        }}
                      >
                        <span className="text-[20px] shrink-0">{cat.emoji}</span>
                        <span
                          className="text-[12px] font-semibold leading-tight"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: isSelected
                              ? 'var(--color-accent)'
                              : 'var(--color-text-secondary)',
                          }}
                        >
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message textarea */}
              <div className="space-y-2">
                <p
                  className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider px-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Message
                </p>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Describe your feedback in detail. Be as specific as possible..."
                    rows={6}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] px-4 py-3 resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <div className="flex items-center justify-between px-1 mt-1">
                    {charCount < MIN_CHARS && charCount > 0 ? (
                      <p
                        className="text-[11px] text-[var(--color-text-muted)]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {MIN_CHARS - charCount} more character{MIN_CHARS - charCount !== 1 ? 's' : ''} required
                      </p>
                    ) : (
                      <span />
                    )}
                    <p
                      className="text-[11px] ml-auto"
                      style={{
                        fontFamily: 'var(--font-body)',
                        color:
                          charCount > MAX_CHARS * 0.9
                            ? 'var(--color-cta)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {charCount} / {MAX_CHARS}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-[var(--color-cta)]/30 bg-[var(--color-cta)]/8 px-4 py-3">
                  <p
                    className="text-[12px] text-[var(--color-cta)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {error}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading || !user}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-heading)',
                  background: isValid && user ? 'var(--color-accent)' : undefined,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: isValid && user ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isValid && user ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </main>
  )
}
