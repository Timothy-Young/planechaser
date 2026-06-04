# Phase 9: Content Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all content pages for PlaneChaser — a marketing-grade landing page, How to Play rules reference, About page, and proper SEO/Open Graph metadata — making the app launch-ready for public discovery.

**Architecture:** Each content page is a standalone Next.js App Router page under `src/app/`. All pages follow the existing pattern: `'use client'` components with Framer Motion animations, CSS variable theming (`var(--color-*)`, `var(--font-*)`), ambient background blurs, and a sticky header with back navigation. The home page gets a full marketing overhaul with improved hero, social proof, "how it works" stepper, and footer with links to all content pages. SEO metadata is added via Next.js `generateMetadata` or exported `metadata` objects in `layout.tsx` and per-page.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4 (CSS variables), Framer Motion 11, Lucide React icons

---

## Triage & Task Overview

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1 | Home page marketing overhaul | P0 | `src/app/page.tsx` |
| 2 | How to Play / Rules page | P0 | `src/app/rules/page.tsx`, `src/lib/rules/content.ts` |
| 3 | About page | P1 | `src/app/about/page.tsx` |
| 4 | Footer component extraction + links | P1 | `src/components/footer.tsx`, `src/app/page.tsx` |
| 5 | SEO metadata & Open Graph tags | P1 | `src/app/layout.tsx`, `src/app/rules/layout.tsx`, `src/app/about/layout.tsx`, `src/app/faq/layout.tsx`, `src/app/support/layout.tsx` |
| 6 | Footer links on all content pages | P2 | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/faq/page.tsx`, `src/app/support/page.tsx`, `src/app/about/page.tsx`, `src/app/rules/page.tsx` |

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/page.tsx` | Modify | Marketing overhaul: hero, how-it-works, social proof, features, CTA, footer |
| `src/app/rules/page.tsx` | Create | How to Play page — Planechase rules, Archenemy rules, conquest system |
| `src/lib/rules/content.ts` | Create | Structured rules content data (sections, steps) |
| `src/app/about/page.tsx` | Create | About PlaneChaser — vision, developer, tech, roadmap |
| `src/components/footer.tsx` | Create | Shared footer component extracted from home page |
| `src/app/layout.tsx` | Modify | Add global OG metadata, structured data |
| `src/app/rules/layout.tsx` | Create | Per-page metadata for rules page |
| `src/app/about/layout.tsx` | Create | Per-page metadata for about page |
| `src/app/faq/layout.tsx` | Create | Per-page metadata for FAQ page |
| `src/app/support/layout.tsx` | Create | Per-page metadata for support page |
| `src/app/privacy/page.tsx` | Modify | Add shared footer |
| `src/app/terms/page.tsx` | Modify | Add shared footer |
| `src/app/faq/page.tsx` | Modify | Add shared footer |
| `src/app/support/page.tsx` | Modify | Add shared footer |

---

### Task 1: Home Page Marketing Overhaul

**Files:**
- Modify: `src/app/page.tsx`

**Context:** The current home page (`src/app/page.tsx`) has a hero, a mock game preview, a 4-card feature grid, a CTA, and a minimal footer. It uses `'use client'`, Framer Motion `motion` components, Lucide icons, the `Button` component from `@/components/ui/button`, `useAppStore` for user state, `useRouter` for navigation, and `next/image` for the card preview. All styling uses CSS variables (`var(--color-*)`) and inline `fontFamily` for headings (`var(--font-heading)`) and body (`var(--font-body)`).

**What to change:**
1. Add a "How It Works" stepper section between the game preview and the features grid
2. Add a social proof / stats banner between features and CTA
3. Expand features from 4 to 6 cards (add Custom Decks + Game History)
4. Improve the CTA section with a secondary "Learn the Rules" link
5. Improve footer with links to all content pages (About, Rules, FAQ, Support, Privacy, Terms)

- [ ] **Step 1: Add the "How It Works" stepper section**

After the game preview `</section>` (line ~141) and before the Features `<section>` (line ~143), add:

```tsx
      {/* How It Works */}
      <section className="relative z-10 px-4 py-20 max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-[28px] sm:text-[36px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            How It Works
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mt-2" style={{ fontFamily: 'var(--font-body)' }}>
            From setup to conquest in three easy steps
          </p>
        </motion.div>

        <div className="space-y-6">
          {[
            { step: '1', title: 'Create or Join a Pod', desc: 'Set up your playgroup. Invite friends with a simple code. Everyone plays on one shared device at the table.' },
            { step: '2', title: 'Play Planechase', desc: 'Draw planes, roll the planar die, trigger chaos effects. Full Archenemy mode when someone dominates.' },
            { step: '3', title: 'Conquer & Climb', desc: 'Win a Commander game? Claim the current plane. Build your collection. Top the pod leaderboard.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-accent-deep)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
                <span className="text-[16px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>{item.step}</span>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--color-text)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{item.title}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
```

- [ ] **Step 2: Expand FEATURES array to 6 items**

Replace the existing `FEATURES` array (lines 11-31) with:

```tsx
const FEATURES = [
  {
    icon: Dice5,
    title: 'Planar Die',
    description: 'Roll with animated physics and sound effects. Every chaos trigger feels alive.',
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
  {
    icon: Layers,
    title: 'Custom Decks',
    description: 'Build plane and scheme decks. Pick your favorites or shuffle the whole multiverse.',
  },
  {
    icon: History,
    title: 'Game History',
    description: 'Review past sessions turn-by-turn. See every plane visited and every die rolled.',
  },
]
```

Also add `Layers` and `History` to the Lucide imports:

```tsx
import { Swords, Users, Trophy, Dice5, ChevronRight, Sparkles, Heart, Layers, History } from 'lucide-react'
```

- [ ] **Step 3: Add social proof banner between features and CTA**

After the features `</section>` and before the CTA `<section>`, insert:

```tsx
      {/* Social proof */}
      <section className="relative z-10 px-4 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-[600px] mx-auto flex items-center justify-center gap-8 sm:gap-12"
        >
          {[
            { value: '86+', label: 'Planes to Conquer' },
            { value: '∞', label: 'Games to Play' },
            { value: '0', label: 'Ads. Ever.' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[28px] sm:text-[32px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {stat.value}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>
```

- [ ] **Step 4: Update CTA section with secondary link**

Replace the existing CTA section (lines ~182-204) with:

```tsx
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => router.push(user ? '/setup' : '/auth')}
              className="h-13 px-10 text-[16px] bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl"
              style={{ fontFamily: 'var(--font-heading)', boxShadow: '0 4px 40px rgba(124, 58, 237, 0.4)', height: 52 }}
            >
              {user ? 'Go to Game' : 'Create Free Account'}
            </Button>
            <Button
              onClick={() => router.push('/rules')}
              variant="outline"
              className="h-13 px-8 text-[14px] border-[var(--color-border)] bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 rounded-xl"
              style={{ fontFamily: 'var(--font-body)', height: 48 }}
            >
              Learn the Rules
            </Button>
          </div>
        </motion.div>
      </section>
```

- [ ] **Step 5: Rebuild the footer with full link set**

Replace the existing `<footer>` (lines ~206-226) with:

```tsx
      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] px-4 py-8">
        <div className="max-w-[600px] mx-auto space-y-5">
          <div className="flex items-center justify-center">
            <button
              onClick={() => router.push('/support')}
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-80 transition-opacity cursor-pointer"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Heart size={12} /> Support PlaneChaser
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
            {[
              { label: 'About', path: '/about' },
              { label: 'How to Play', path: '/rules' },
              { label: 'FAQ', path: '/faq' },
              { label: 'Support', path: '/support' },
              { label: 'Privacy', path: '/privacy' },
              { label: 'Terms', path: '/terms' },
            ].map((link, i) => (
              <span key={link.path} className="flex items-center gap-4">
                {i > 0 && <span className="text-[var(--color-border)]">·</span>}
                <button onClick={() => router.push(link.path)} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
                  {link.label}
                </button>
              </span>
            ))}
          </div>

          <p className="text-[10px] text-[var(--color-text-muted)] max-w-[500px] mx-auto leading-relaxed text-center" style={{ fontFamily: 'var(--font-body)' }}>
            PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
          </p>
          <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 text-center" style={{ fontFamily: 'var(--font-body)' }}>
            Built by WheresTim LLC · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
```

- [ ] **Step 6: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`
Expected: Build compiles successfully.

```bash
git add src/app/page.tsx
git commit -m "feat: overhaul home page with how-it-works, social proof, expanded features, and full footer"
```

---

### Task 2: How to Play / Rules Page

**Files:**
- Create: `src/lib/rules/content.ts`
- Create: `src/app/rules/page.tsx`

**Context:** This page teaches new players how to play Planechase and Archenemy with PlaneChaser. Follow the exact same page pattern as `src/app/faq/page.tsx` — `'use client'`, back button header, accordion-style expandable sections. Content covers: Planechase basics, the planar die, Archenemy mode, the conquest system, pods, and deck building.

- [ ] **Step 1: Create rules content data**

Create `src/lib/rules/content.ts`:

```ts
export interface RulesStep {
  text: string
}

export interface RulesSection {
  title: string
  icon: string
  intro: string
  steps: RulesStep[]
}

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: 'Planechase Basics',
    icon: '🌍',
    intro: 'Planechase adds a shared plane card that affects all players in a Commander game.',
    steps: [
      { text: 'The game starts on a random plane from the deck. This plane\'s abilities affect all players equally.' },
      { text: 'On your turn, you may roll the planar die. The first roll each turn is free.' },
      { text: 'Each additional roll costs {1} more generic mana than the last (2nd roll = {1}, 3rd = {2}, etc.).' },
      { text: 'If you roll the Planeswalker symbol (⚔), the group planeswalks to the next plane in the deck.' },
      { text: 'If you roll Chaos (🌀), the current plane\'s chaos ability triggers.' },
      { text: 'Blank faces mean nothing happens — but you still paid the mana!' },
    ],
  },
  {
    title: 'The Planar Die',
    icon: '🎲',
    intro: 'A six-sided die with special faces unique to Planechase.',
    steps: [
      { text: '1 face: Planeswalker symbol — triggers a planeswalk to the next plane.' },
      { text: '1 face: Chaos symbol — triggers the current plane\'s chaos ability.' },
      { text: '4 faces: Blank — nothing happens.' },
      { text: 'You can roll as many times per turn as you can afford. The first roll is free, then costs escalate.' },
      { text: 'PlaneChaser tracks roll costs automatically and shows you what each roll will cost.' },
    ],
  },
  {
    title: 'Phenomena',
    icon: '✨',
    intro: 'Some cards in the planar deck are Phenomena instead of Planes.',
    steps: [
      { text: 'When you planeswalk into a Phenomenon, its ability triggers immediately.' },
      { text: 'After the ability resolves, you planeswalk again to the next card.' },
      { text: 'If you hit multiple Phenomena in a row, each one resolves before moving on.' },
      { text: 'PlaneChaser handles Phenomenon chaining automatically — just follow the prompts.' },
    ],
  },
  {
    title: 'Archenemy Mode',
    icon: '⚔️',
    intro: 'When one player conquers too many planes, the pod can trigger an Archenemy showdown.',
    steps: [
      { text: 'Each pod has a conquest threshold (configurable in pod settings). When a player crosses it, they become the Archenemy.' },
      { text: 'In Archenemy mode, the Archenemy plays against all other players working as a team.' },
      { text: 'The Archenemy gets a Scheme deck — powerful one-shot abilities drawn each turn.' },
      { text: 'If the team defeats the Archenemy, each team member can steal one of the Archenemy\'s conquered planes.' },
      { text: 'If the Archenemy wins, they remain dominant. The meta-game continues.' },
    ],
  },
  {
    title: 'Conquest System',
    icon: '👑',
    intro: 'PlaneChaser\'s unique meta-game that spans across sessions.',
    steps: [
      { text: 'When a player wins a Commander game, they may claim the current plane as conquered.' },
      { text: 'Conquered planes appear in your profile collection and count toward pod leaderboards.' },
      { text: 'Each conquest records who you took it from (if anyone) and which pod it belongs to.' },
      { text: 'Conquered planes are removed from future game decks by default, making the pool smaller over time.' },
      { text: 'Earn achievements like "First Blood" (first conquest) and "Planar Dominion" (conquer 10+ planes).' },
    ],
  },
  {
    title: 'Pods & Playgroups',
    icon: '👥',
    intro: 'Pods are persistent playgroups that track your meta-game together.',
    steps: [
      { text: 'Create a pod and invite friends using a shareable invite code.' },
      { text: 'Pod members share a conquest pool — conquests and leaderboards are tracked per-pod.' },
      { text: 'Start games directly from a pod with pre-selected members.' },
      { text: 'Pod owners can configure the Archenemy threshold, manage members, and regenerate invite codes.' },
      { text: 'You can belong to multiple pods — each one tracks its own conquest separately.' },
    ],
  },
  {
    title: 'Building Decks',
    icon: '📚',
    intro: 'Customize which planes and schemes appear in your games.',
    steps: [
      { text: 'Plane Decks: Choose which planes appear in your Planechase games. Use all 86+ or curate a smaller set.' },
      { text: 'Scheme Decks: Build decks for Archenemy mode with powerful scheme cards.' },
      { text: 'Decks are saved to your account and can be selected at game setup.' },
      { text: 'The "Random" option at setup shuffles all available planes without needing a saved deck.' },
      { text: 'Preset decks are available as starting points — one-click to start with a curated set.' },
    ],
  },
]
```

- [ ] **Step 2: Create the rules page**

Create `src/app/rules/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { RULES_SECTIONS } from '@/lib/rules/content'

export default function RulesPage() {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Planechase Basics']))

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
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
        <div className="px-4 py-3 flex items-center gap-3 max-w-[680px] mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--color-text-muted)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-[18px] font-bold text-[var(--color-text)] tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              How to Play
            </h1>
            <p
              className="text-[11px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Planechase, Archenemy & Conquest rules
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-[680px] mx-auto space-y-4">
        {/* Intro card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-deep)]/8 p-4 text-center"
        >
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            PlaneChaser is a companion app for <strong className="text-[var(--color-text)]">Magic: The Gathering</strong> Planechase and Archenemy formats.
            Pass one device around the table — the app handles planes, dice, and scoring.
          </p>
        </motion.div>

        {/* Sections */}
        {RULES_SECTIONS.map((section, sIdx) => {
          const isOpen = openSections.has(section.title)
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.05 }}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-white/3 transition-colors"
              >
                <span className="text-[20px]">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[15px] font-bold text-[var(--color-text)] tracking-wide"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {section.title}
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {section.intro}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[var(--color-text-muted)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2.5 border-t border-[var(--color-border)]">
                      <p className="text-[13px] text-[var(--color-text-secondary)] pt-3 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        {section.intro}
                      </p>
                      <ol className="space-y-2">
                        {section.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span
                              className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent-deep)]/20 border border-[var(--color-accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)] mt-0.5"
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                              {step.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`
Expected: Build compiles successfully.

```bash
git add src/lib/rules/content.ts src/app/rules/page.tsx
git commit -m "feat: add How to Play rules page with Planechase, Archenemy, and conquest sections"
```

---

### Task 3: About Page

**Files:**
- Create: `src/app/about/page.tsx`

**Context:** An About page that covers what PlaneChaser is, the vision behind it, and who built it. Follow the same page pattern as Privacy/Terms pages: `'use client'`, back-button header, content in a card container. Keep it warm and personal — this is an indie project by a real person for real Magic players.

- [ ] **Step 1: Create the about page**

Create `src/app/about/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Github, Sparkles, Users, Swords, Crown, Layers, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROADMAP_ITEMS = [
  { icon: Crown, label: 'Conquest Meta-Game', status: 'live' as const },
  { icon: Swords, label: 'Archenemy Mode', status: 'live' as const },
  { icon: Users, label: 'Pods & Friends', status: 'live' as const },
  { icon: Layers, label: 'Custom Decks', status: 'live' as const },
  { icon: Sparkles, label: 'Custom Plane Builder', status: 'planned' as const },
  { icon: Map, label: 'Eternities Map', status: 'planned' as const },
]

export default function AboutPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
        <div className="px-4 py-3 flex items-center gap-3 max-w-[680px] mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--color-text-muted)]"
          >
            <ArrowLeft size={18} />
          </button>
          <h1
            className="text-[18px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            About PlaneChaser
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 px-4 py-6 pb-24 max-w-[680px] mx-auto space-y-6">
        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 space-y-4"
        >
          <h2
            className="text-[20px] font-bold text-[var(--color-accent)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            The Multiplanar Conquest Companion
          </h2>
          <div className="space-y-3 text-[14px] text-[var(--color-text-secondary)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            <p>
              PlaneChaser started with a simple frustration: managing Planechase with physical cards is a mess. Shuffling oversized plane cards, tracking die rolls, remembering which planes you&apos;ve visited — it slows the game down.
            </p>
            <p>
              But we didn&apos;t want just another die-roller app. We wanted something that makes every Commander game <em>matter</em>. That&apos;s the conquest system — a persistent meta-game where you claim planes by winning games, build a collection across sessions, and compete with your playgroup on leaderboards.
            </p>
            <p>
              When one player dominates? The pod fights back with an Archenemy showdown. It&apos;s Planechase meets campaign mode, and it turns casual Commander nights into something you remember.
            </p>
          </div>
        </motion.div>

        {/* Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 space-y-4"
        >
          <h2
            className="text-[16px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            What&apos;s Built & What&apos;s Coming
          </h2>
          <div className="space-y-2.5">
            {ROADMAP_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon size={16} className={item.status === 'live' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
                <span className="flex-1 text-[13px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {item.label}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    item.status === 'live'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-[var(--color-accent-deep)]/15 text-[var(--color-accent-muted)] border border-[var(--color-accent)]/20'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.status === 'live' ? 'Live' : 'Planned'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Builder */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 space-y-4"
        >
          <h2
            className="text-[16px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Built By a Player, For Players
          </h2>
          <div className="space-y-3 text-[14px] text-[var(--color-text-secondary)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            <p>
              PlaneChaser is built and maintained by <strong className="text-[var(--color-text)]">WheresTim LLC</strong> — a one-person studio that plays way too much Commander. Every feature comes from actual table experience and playtesting with real pods.
            </p>
            <p>
              The app is free, has no ads, and never will. If you want to support development, you can tip on the <button onClick={() => router.push('/support')} className="text-[var(--color-accent)] hover:underline cursor-pointer">Support page</button>.
            </p>
          </div>
        </motion.div>

        {/* Tech */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 space-y-3"
        >
          <h2
            className="text-[16px] font-bold text-[var(--color-text)] tracking-wide"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Under the Hood
          </h2>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS', 'Framer Motion', 'Scryfall API', 'Vercel'].map((tech) => (
              <span
                key={tech}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-[var(--color-border)] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            Card images and data powered by <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">Scryfall</a> — the best MTG search engine.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4"
        >
          <Button
            onClick={() => router.push('/support')}
            variant="outline"
            className="h-11 px-6 text-[13px] border-[var(--color-accent)]/30 bg-[var(--color-accent-deep)]/8 text-[var(--color-accent)] hover:bg-[var(--color-accent-deep)]/15 rounded-xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Heart size={14} className="mr-1.5" /> Support Development
          </Button>
        </motion.div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`
Expected: Build compiles successfully.

```bash
git add src/app/about/page.tsx
git commit -m "feat: add About page with mission, roadmap, builder story, and tech stack"
```

---

### Task 4: Shared Footer Component

**Files:**
- Create: `src/components/footer.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/support/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/rules/page.tsx`

**Context:** Extract a reusable Footer component from the home page footer pattern, then add it to all content pages (privacy, terms, faq, support, about, rules). The footer needs links to About, Rules, FAQ, Support, Privacy, Terms, and the WotC Fan Content disclaimer. It should NOT appear on game pages, auth, or setup — only on static content pages and the home page.

- [ ] **Step 1: Create the shared Footer component**

Create `src/components/footer.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

const FOOTER_LINKS = [
  { label: 'About', path: '/about' },
  { label: 'How to Play', path: '/rules' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Support', path: '/support' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
] as const

export function Footer() {
  const router = useRouter()

  return (
    <footer className="relative z-10 border-t border-[var(--color-border)] px-4 py-8">
      <div className="max-w-[600px] mx-auto space-y-5">
        <div className="flex items-center justify-center">
          <button
            onClick={() => router.push('/support')}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-80 transition-opacity cursor-pointer"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Heart size={12} /> Support PlaneChaser
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.path} className="flex items-center gap-4">
              {i > 0 && <span className="text-[var(--color-border)]">·</span>}
              <button onClick={() => router.push(link.path)} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
                {link.label}
              </button>
            </span>
          ))}
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] max-w-[500px] mx-auto leading-relaxed text-center" style={{ fontFamily: 'var(--font-body)' }}>
          PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 text-center" style={{ fontFamily: 'var(--font-body)' }}>
          Built by WheresTim LLC · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Update the home page to use the shared Footer**

In `src/app/page.tsx`, add the import at the top:

```tsx
import { Footer } from '@/components/footer'
```

Replace the entire `<footer>...</footer>` block (the one added in Task 1) with:

```tsx
      <Footer />
```

- [ ] **Step 3: Add Footer to privacy page**

In `src/app/privacy/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>`, add:

```tsx
      <Footer />
```

- [ ] **Step 4: Add Footer to terms page**

In `src/app/terms/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>`, add:

```tsx
      <Footer />
```

- [ ] **Step 5: Add Footer to FAQ page**

In `src/app/faq/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>`, add:

```tsx
      <Footer />
```

- [ ] **Step 6: Add Footer to support page**

In `src/app/support/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>`, add:

```tsx
      <Footer />
```

- [ ] **Step 7: Add Footer to about page**

In `src/app/about/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>` (after the CTA motion.div), add:

```tsx
      <Footer />
```

- [ ] **Step 8: Add Footer to rules page**

In `src/app/rules/page.tsx`, add the import:

```tsx
import { Footer } from '@/components/footer'
```

Before the closing `</main>`, add:

```tsx
      <Footer />
```

- [ ] **Step 9: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`
Expected: Build compiles successfully.

```bash
git add src/components/footer.tsx src/app/page.tsx src/app/privacy/page.tsx src/app/terms/page.tsx src/app/faq/page.tsx src/app/support/page.tsx src/app/about/page.tsx src/app/rules/page.tsx
git commit -m "feat: extract shared Footer component, add to all content pages"
```

---

### Task 5: SEO Metadata & Open Graph Tags

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/rules/layout.tsx`
- Create: `src/app/about/layout.tsx`
- Create: `src/app/faq/layout.tsx`
- Create: `src/app/support/layout.tsx`

**Context:** Next.js App Router supports static `metadata` exports in `layout.tsx` or `page.tsx` files. The root layout already has basic metadata. We need to add Open Graph tags, a site-wide description, and per-page metadata for the new content pages. Each sub-layout is a simple passthrough that only exports metadata.

- [ ] **Step 1: Enhance root layout metadata**

In `src/app/layout.tsx`, replace the existing `metadata` export (lines ~6-9) with:

```tsx
export const metadata: Metadata = {
  title: {
    default: 'PlaneChaser — MTG Planechase Companion',
    template: '%s | PlaneChaser',
  },
  description: 'The multiplanar conquest companion for Magic: The Gathering. Track planes, roll dice, conquer worlds — turn every Commander game into a campaign.',
  keywords: ['MTG', 'Magic: The Gathering', 'Planechase', 'Archenemy', 'Commander', 'companion app', 'planar die', 'conquest'],
  authors: [{ name: 'WheresTim LLC' }],
  creator: 'WheresTim LLC',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'PlaneChaser',
    title: 'PlaneChaser — MTG Planechase Companion',
    description: 'Track planes, roll dice, conquer worlds. The conquest companion for Magic: The Gathering Planechase and Archenemy formats.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlaneChaser — MTG Planechase Companion',
    description: 'Track planes, roll dice, conquer worlds. The conquest companion for Magic: The Gathering.',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

- [ ] **Step 2: Create rules layout with metadata**

Create `src/app/rules/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Learn how to play Planechase, Archenemy, and the Conquest meta-game with PlaneChaser. Rules, die mechanics, and pod management explained.',
  openGraph: {
    title: 'How to Play | PlaneChaser',
    description: 'Learn how to play Planechase, Archenemy, and the Conquest meta-game with PlaneChaser.',
  },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 3: Create about layout with metadata**

Create `src/app/about/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'PlaneChaser is the multiplanar conquest companion for Magic: The Gathering. Built by WheresTim LLC — a one-person studio that plays way too much Commander.',
  openGraph: {
    title: 'About | PlaneChaser',
    description: 'The story behind PlaneChaser — built by a player, for players.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 4: Create faq layout with metadata**

Create `src/app/faq/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about PlaneChaser — getting started, gameplay, conquest, pods, decks, and game controls.',
  openGraph: {
    title: 'FAQ | PlaneChaser',
    description: 'Everything you need to know about PlaneChaser — tips, tricks, and answers.',
  },
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 5: Create support layout with metadata**

Create `src/app/support/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Support PlaneChaser development. Tip via Venmo, Ko-fi, Patreon, or PayPal. Free app, no ads — built with love.',
  openGraph: {
    title: 'Support PlaneChaser',
    description: 'Support PlaneChaser development — tips, donations, and monthly support options.',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 6: Verify and commit**

Run: `cd /c/Users/Tim/Desktop/CodeFun/PlaneChaser/planechaser && npx next build 2>&1 | tail -20`
Expected: Build compiles successfully.

```bash
git add src/app/layout.tsx src/app/rules/layout.tsx src/app/about/layout.tsx src/app/faq/layout.tsx src/app/support/layout.tsx
git commit -m "feat: add SEO metadata and Open Graph tags for all content pages"
```

---

## Self-Review

**Spec coverage:**
- ✅ Marketing landing page improvements (Task 1: how-it-works, social proof, expanded features, footer links)
- ✅ Rules / How to Play page (Task 2)
- ✅ About page (Task 3)
- ✅ Footer component with links to all pages (Task 4)
- ✅ SEO/Open Graph metadata (Task 5)
- ✅ Footer on all content pages (Task 4 steps 3-8)

**Placeholder scan:** No placeholders found. All code blocks are complete.

**Type consistency:** `RULES_SECTIONS` uses `RulesSection[]` and `RulesStep` types — consistent between content file and page. `FOOTER_LINKS` uses simple object literals. All Lucide icon names match valid exports. `Footer` component name consistent across all imports.

**Memory note:** Phase 9 status in `memory/project_v2_status.md` says support page and FAQ page already exist. This plan creates the remaining content pages (rules, about) and improves existing ones (home page, footer on all pages, SEO).
