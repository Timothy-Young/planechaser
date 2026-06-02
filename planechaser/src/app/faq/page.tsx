'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { FAQ_SECTIONS } from '@/lib/faq/content'
import { Footer } from '@/components/footer'

export default function FAQPage() {
  const router = useRouter()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <main
      className="min-h-screen pb-nav"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
        </button>
        <div>
          <h1
            className="text-lg font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Tips & Tricks
          </h1>
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Everything you need to know about PlaneChaser
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-[520px] mx-auto">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2
              className="text-[14px] font-semibold text-[var(--color-accent)] flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span>{section.icon}</span>
              {section.title}
            </h2>

            <div className="space-y-1">
              {section.items.map((item) => {
                const key = `${section.title}-${item.question}`
                const isOpen = openItems.has(key)

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span
                        className="text-[13px] font-medium text-[var(--color-text)]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
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
                          <p
                            className="px-4 pb-3 text-[12px] leading-relaxed text-[var(--color-text-muted)]"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </main>
  )
}
