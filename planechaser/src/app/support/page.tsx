'use client'

import { motion } from 'framer-motion'
import { Heart, Coffee, CreditCard, Coins, Crown, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const SUPPORT_OPTIONS = [
  
  {
    icon: CreditCard,
    name: 'Venmo',
    description: 'Quick tip via Venmo.',
    url: 'https://venmo.com/wherestim',
    color: '#3D95CE',
    cta: 'Tip on Venmo',
  },{
    icon: Coffee,
    name: 'Ko-fi',
    description: 'Buy me a coffee — one-time tips welcome.',
    url: 'https://ko-fi.com/planechaser',
    color: '#FF5E5B',
    cta: 'Support on Ko-fi',
  },
  {
    icon: Crown,
    name: 'Patreon',
    description: 'Monthly support for ongoing development and new features.',
    url: 'https://patreon.com/planechaser',
    color: '#FF424D',
    cta: 'Join on Patreon',
  },
  {
    icon: CreditCard,
    name: 'PayPal',
    description: 'Send a one-time donation via PayPal.',
    url: 'https://paypal.me/wherestim',
    color: '#0070BA',
    cta: 'Donate via PayPal',
  },
  {
    icon: Coins,
    name: 'Crypto',
    description: 'BTC, ETH, or SOL — DM for wallet addresses.',
    url: null,
    color: '#F7931A',
    cta: 'Coming Soon',
  },
]

export default function SupportPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-gold)]/8 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--color-text-muted)]"
        >
          <ArrowLeft size={18} />
        </button>
        <h1
          className="text-[18px] font-bold text-[var(--color-text)] tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Support PlaneChaser
        </h1>
      </header>

      {/* Content */}
      <div className="relative z-10 px-4 pb-24 max-w-[600px] mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-cta)]/15 border border-[var(--color-cta)]/30">
            <Heart size={28} className="text-[var(--color-cta)]" />
          </div>
          <h2
            className="text-[24px] sm:text-[28px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Keep the Planes Flowing
          </h2>
          <p
            className="text-[14px] text-[var(--color-text-muted)] leading-relaxed max-w-[440px] mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            PlaneChaser is free and always will be. No ads, no paywalls. If you enjoy it,
            consider supporting development — every bit helps keep the servers running
            and new features coming.
          </p>
        </motion.div>

        <div className="space-y-3">
          {SUPPORT_OPTIONS.map((opt, i) => (
            <motion.div
              key={opt.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              {opt.url ? (
                <a
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm hover:border-[var(--color-accent)]/30 transition-all group"
                >
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                    style={{ backgroundColor: `${opt.color}15`, border: `1px solid ${opt.color}30` }}
                  >
                    <opt.icon size={20} style={{ color: opt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold text-[var(--color-text)] tracking-wide"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {opt.name}
                    </p>
                    <p
                      className="text-[12px] text-[var(--color-text-muted)] mt-0.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {opt.description}
                    </p>
                  </div>
                  <span
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg shrink-0 transition-opacity group-hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      backgroundColor: `${opt.color}20`,
                      color: opt.color,
                      border: `1px solid ${opt.color}30`,
                    }}
                  >
                    {opt.cta}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 opacity-60">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                    style={{ backgroundColor: `${opt.color}15`, border: `1px solid ${opt.color}30` }}
                  >
                    <opt.icon size={20} style={{ color: opt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold text-[var(--color-text)] tracking-wide"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {opt.name}
                    </p>
                    <p
                      className="text-[12px] text-[var(--color-text-muted)] mt-0.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {opt.description}
                    </p>
                  </div>
                  <span
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg shrink-0"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-muted)' }}
                  >
                    {opt.cta}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* LLC attribution */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-4 space-y-2"
        >
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            PlaneChaser is built and maintained by WheresTim LLC.
          </p>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="text-[13px] border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    </main>
  )
}
