'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Swords, Users, Trophy, Dice5, ChevronRight, Sparkles, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

const FEATURES = [
  {
    icon: Dice5,
    title: 'Planar Die',
    description: 'Roll with animated 3D physics. Sound effects bring every chaos trigger to life.',
  },
  {
    icon: Trophy,
    title: 'Conquest Meta-Game',
    description: 'Win Commander games. Claim planes. Build your multiverse collection across sessions.',
  },
  {
    icon: Users,
    title: 'Pods & Leaderboards',
    description: 'Create playgroups. Track standings. See who dominates your pod.',
  },
  {
    icon: Swords,
    title: 'Archenemy Mode',
    description: 'When one player conquers too many planes, the pod rises up for an Archenemy showdown.',
  },
]

export default function Home() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[var(--color-accent-deep)]/12 blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[var(--color-gold)]/6 blur-[150px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[var(--color-cta)]/4 blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-[600px] space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 text-[11px] text-[var(--color-accent)] font-medium tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
            <Sparkles size={12} /> MTG Planechase Companion
          </div>

          <h1
            className="text-[44px] sm:text-[56px] md:text-[68px] font-bold text-[var(--color-accent)] text-glow-purple leading-[1.1] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PlaneChaser
          </h1>

          <p className="text-[16px] sm:text-[18px] text-[var(--color-text-secondary)] leading-relaxed max-w-[480px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            The multiplanar conquest companion for Magic: The Gathering.
            Track planes, roll dice, conquer worlds — turn every Commander game into a campaign.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => router.push(user ? '/setup' : '/auth')}
              className="h-13 px-8 text-[16px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 40px rgba(124, 58, 237, 0.4)', height: 52 }}
            >
              {user ? 'Start Playing' : 'Get Started'} <ChevronRight size={18} className="ml-1" />
            </Button>
            {!user && (
              <Button
                onClick={() => router.push('/auth')}
                variant="outline"
                className="h-13 px-8 text-[15px] border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10 rounded-xl"
                style={{ fontFamily: 'var(--font-body)', height: 52 }}
              >
                Sign In
              </Button>
            )}
          </div>
        </motion.div>

      </section>

      {/* Game preview */}
      <section className="relative z-10 px-4 pb-12 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="w-full max-w-[360px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-sm overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 20px 80px rgba(124, 58, 237, 0.15), 0 0 40px rgba(0,0,0,0.4)' }}
        >
          {/* Mock header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[11px] font-bold text-[var(--color-accent)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>PlaneChaser</span>
            <span className="text-[9px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>5/78 · 3 rolls</span>
          </div>

          {/* Mock plane card */}
          <div className="relative aspect-[3/2] overflow-hidden">
            <Image
              src="https://cards.scryfall.io/art_crop/front/d/8/d8da872d-55e0-4596-ba8e-f9ff7b2c0a86.jpg?1680815480"
              alt="Nyx — Plane of Theros"
              fill
              className="object-cover"
              sizes="360px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-[14px] font-bold text-white drop-shadow-lg" style={{ fontFamily: 'var(--font-heading)' }}>Nyx</p>
              <p className="text-[9px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>Plane — Theros</p>
            </div>
          </div>

          {/* Mock oracle text */}
          <div className="px-3 py-2 border-t border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              As long as you control an enchantment, creatures you control get +1/+1. Whenever chaos ensues, you may put an enchantment card from your hand onto the battlefield.
            </p>
          </div>

          {/* Mock controls */}
          <div className="flex items-center justify-center gap-3 px-3 py-3 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]" style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="text-[9px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Free roll</span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 py-20 max-w-[900px] mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-[28px] sm:text-[36px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Every Game Matters
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mt-2 max-w-[400px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            More than a die roller — a persistent conquest across your playgroup.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 hover:border-[var(--color-accent)]/30 transition-all group"
            >
              <f.icon size={24} className="text-[var(--color-accent)] mb-3 transition-transform group-hover:scale-110" />
              <h3 className="text-[16px] font-bold text-[var(--color-text)] mb-1.5 tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                {f.title}
              </h3>
              <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[500px] mx-auto space-y-6"
        >
          <h2 className="text-[28px] sm:text-[32px] font-bold text-[var(--color-accent)] text-glow-purple tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Ready to Chase Planes?
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Free to use. No ads. Share one device at the table.
          </p>
          <Button
            onClick={() => router.push(user ? '/setup' : '/auth')}
            className="h-13 px-10 text-[16px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 40px rgba(124, 58, 237, 0.4)', height: 52 }}
          >
            {user ? 'Go to Game' : 'Create Free Account'}
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] px-4 py-6 text-center space-y-3">
        <button
          onClick={() => router.push('/support')}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Heart size={12} /> Support PlaneChaser
        </button>
        <div className="flex items-center justify-center gap-3 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
          <button onClick={() => router.push('/privacy')} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">Privacy</button>
          <span className="text-[var(--color-border)]">·</span>
          <button onClick={() => router.push('/terms')} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">Terms</button>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] max-w-[500px] mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60" style={{ fontFamily: 'var(--font-body)' }}>
          Built by WheresTim LLC
        </p>
      </footer>
    </main>
  )
}
