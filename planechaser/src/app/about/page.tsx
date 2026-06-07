'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Sparkles, Users, Swords, Crown, Layers, Map, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/footer'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' as const },
  }),
}

const LIVE_FEATURES = [
  { icon: Crown, label: 'Conquest Meta-Game' },
  { icon: Swords, label: 'Archenemy Mode' },
  { icon: Users, label: 'Pods & Friends' },
  { icon: Layers, label: 'Custom Decks' },
  { icon: Wand2, label: 'Custom Plane Builder' },
  { icon: Map, label: 'Planar Map' },
]

const PLANNED_FEATURES = [
  { icon: Sparkles, label: 'Eternities Map' },
]

const TECH_BADGES = [
  { label: 'Next.js', href: null },
  { label: 'React', href: null },
  { label: 'TypeScript', href: null },
  { label: 'Supabase', href: null },
  { label: 'Tailwind CSS', href: null },
  { label: 'Framer Motion', href: null },
  { label: 'Scryfall API', href: 'https://scryfall.com/docs/api' },
  { label: 'Vercel', href: null },
]

export default function AboutPage() {
  const router = useRouter()

  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
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
            className="text-lg font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            About PlaneChaser
          </h1>
          <p
            className="text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Mission, roadmap &amp; the story behind the app
          </p>
        </div>
      </div>

      <div className="relative z-10 px-4 py-4 space-y-3 max-w-[520px] mx-auto pb-nav">

        {/* Mission card */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-5 space-y-3"
        >
          <h2
            className="text-[17px] font-bold text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            The Multiplanar Conquest Companion
          </h2>
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            PlaneChaser started with a frustration: managing Planechase with a stack of physical
            cards, a separate die, and someone trying to keep track of who controls what is a mess.
            There had to be a better way to run a Planechase game at the table.
          </p>
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            But the goal wasn&apos;t just another die-roller app. The{' '}
            <span className="text-[var(--color-accent)] font-medium">conquest system</span> is what
            makes PlaneChaser different — it turns every Commander game into part of an ongoing
            campaign. Win a game on a plane and you own it. Lose enough planes and you become a
            target.
          </p>
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            When one player dominates too many planes, the whole pod fights back — and the game
            escalates into a full{' '}
            <span className="text-[var(--color-accent)] font-medium">Archenemy showdown</span>.
            Every session has stakes.
          </p>
        </motion.div>

        {/* Roadmap card */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-5 space-y-4"
        >
          <h2
            className="text-[15px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            What&apos;s Built &amp; What&apos;s Coming
          </h2>

          <div className="space-y-2">
            {LIVE_FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <span
                  className="text-[13px] text-[var(--color-text-secondary)] flex-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                  Live
                </span>
              </div>
            ))}
            {PLANNED_FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                <span
                  className="text-[13px] text-[var(--color-text-secondary)] flex-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                  Planned
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Builder card */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-5 space-y-3"
        >
          <h2
            className="text-[15px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Built By a Player, For Players
          </h2>
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            PlaneChaser is built by{' '}
            <span className="text-[var(--color-text)] font-medium">WheresTim LLC</span> — a
            one-person shop that plays way too much Commander. Every feature in the app was born out
            of real playtesting sessions with the pod, not a product roadmap.
          </p>
          <p
            className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            PlaneChaser is free and has no ads — and it never will. If you want to keep development
            going,{' '}
            <button
              onClick={() => router.push('/support')}
              className="text-[var(--color-accent)] hover:underline font-medium"
            >
              supporting the project
            </button>{' '}
            goes a long way.
          </p>
        </motion.div>

        {/* Tech card */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-5 space-y-3"
        >
          <h2
            className="text-[15px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Under the Hood
          </h2>
          <div className="flex flex-wrap gap-2">
            {TECH_BADGES.map(({ label, href }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] hover:bg-white/5 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </a>
              ) : (
                <span
                  key={label}
                  className="text-[12px] px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="pt-1 pb-2"
        >
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => router.push('/support')}
          >
            <Heart className="w-4 h-4" />
            Support Development
          </Button>
        </motion.div>

      </div>

      <Footer />
    </main>
  )
}
