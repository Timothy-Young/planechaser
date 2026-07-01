'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { PLANECHASE_SECTIONS } from '@/lib/rules/content'
import { Footer } from '@/components/footer'

export default function PlanechaseRulesPage() {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['Planechase Basics'])
  )

  function toggleSection(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[150px]" />
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
        </button>
        <div>
          <h1
            className="text-lg font-bold title-gradient"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Planechase Rules
          </h1>
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Planar deck, the die, phenomena &amp; merging
          </p>
        </div>
      </div>

      <div className="relative z-10 px-4 py-4 space-y-3 max-w-[520px] mx-auto pb-nav">
        {/* Intro card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-4">
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Planechase is played with a shared{' '}
            <span className="text-[var(--color-accent)] font-medium">planar deck</span> and a{' '}
            <span className="text-[var(--color-accent)] font-medium">planar die</span>. Roll the die
            to planeswalk between planes and trigger phenomena and chaos effects that shake up the
            whole table.
          </p>
        </div>

        {/* Accordion sections */}
        {PLANECHASE_SECTIONS.map((section) => {
          const isOpen = openSections.has(section.title)

          return (
            <div
              key={section.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[18px] shrink-0">{section.icon}</span>
                  <div className="min-w-0">
                    <div
                      className="text-[13px] font-semibold text-[var(--color-text)]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {section.title}
                    </div>
                    {!isOpen && (
                      <div
                        className="text-[11px] text-[var(--color-text-muted)] truncate"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {section.intro}
                      </div>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      <p
                        className="text-[12px] text-[var(--color-text-muted)] italic mb-3"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {section.intro}
                      </p>
                      <ol className="space-y-2">
                        {section.steps.map((step, index) => (
                          <li key={index} className="flex gap-3">
                            <span
                              className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px] font-bold flex items-center justify-center mt-0.5"
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              {index + 1}
                            </span>
                            <p
                              className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]"
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              {step.text}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <Footer />
    </main>
  )
}
