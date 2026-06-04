# Phase 8: Planar Map & Social — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual planar map showing all ~185 planes color-coded by conquest status, a feedback form with Supabase storage, and tips/how-to-play accessible from the game menu.

**Architecture:** The planar map is a new `/map` page that fetches the full plane card corpus (already cached via TanStack Query in `usePlaneCorpus`) and joins it with conquest data from all pod members. A CSS grid of small thumbnails renders the map, with color-coded borders (gold = yours, member colors = podmates, dim = unclaimed). Tapping a thumbnail opens the existing `CardZoomModal`. Filtering by owner uses client-side state. The feedback form is a new `/feedback` page writing to a new `feedback` Supabase table. Tips are integrated as a link from the game controls toolbar to the existing `/rules` page.

**Tech Stack:** Next.js 15 App Router, React 19, TanStack Query 5, Supabase Postgres, Tailwind CSS 4, Framer Motion 11, Lucide React icons

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/map/page.tsx` | Planar map page — grid of plane thumbnails with conquest overlays |
| `src/app/map/layout.tsx` | SEO metadata for map page |
| `src/app/feedback/page.tsx` | Feedback form page |
| `src/app/feedback/layout.tsx` | SEO metadata for feedback page |
| `src/lib/map/queries.ts` | Query to fetch all conquests for a pod (all members, not just current user) |
| `supabase/migrations/013_feedback_table.sql` | Feedback table migration |

### Modified Files
| File | Change |
|------|--------|
| `src/hooks/usePods.ts` | Add `usePodConquests` hook (all members' conquests for a pod) |
| `src/components/bottom-nav.tsx` | Add Map nav item |
| `src/components/game-controls-toolbar.tsx` | Add "How to Play" link button |

---

### Task 1: Feedback Table Migration + Query

**Files:**
- Create: `supabase/migrations/013_feedback_table.sql`
- Create: `src/lib/feedback/queries.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- 013_feedback_table.sql
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) >= 10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to Supabase**

Use the Supabase MCP tool `apply_migration` with the SQL above. Migration name: `feedback_table`.

- [ ] **Step 3: Create the feedback query file**

```typescript
// src/lib/feedback/queries.ts
import { createClient } from '@/lib/supabase/client'

export interface FeedbackSubmission {
  category: 'bug' | 'feature' | 'general' | 'other'
  message: string
}

export async function submitFeedback(
  userId: string,
  submission: FeedbackSubmission
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('feedback')
    .insert({
      user_id: userId,
      category: submission.category,
      message: submission.message,
    })

  if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_feedback_table.sql src/lib/feedback/queries.ts
git commit -m "feat: add feedback table migration and query"
```

---

### Task 2: Pod-Wide Conquests Query + Hook

**Files:**
- Create: `src/lib/map/queries.ts`
- Modify: `src/hooks/usePods.ts`

This task adds the ability to fetch ALL conquests for ALL members of a pod — not just the current user's conquests. This is needed for the planar map to show which planes are conquered by which pod members.

- [ ] **Step 1: Create the map queries file**

```typescript
// src/lib/map/queries.ts
import { createClient } from '@/lib/supabase/client'

export interface MapConquest {
  plane_scryfall_id: string
  plane_name: string
  user_id: string
  display_name: string
}

export async function getPodAllConquests(podId: string): Promise<MapConquest[]> {
  const supabase = createClient()

  // Get all conquests for this pod
  const { data: conquests, error: conquestsError } = await supabase
    .from('conquered_planes')
    .select('plane_scryfall_id, plane_name, user_id')
    .eq('pod_id', podId)

  if (conquestsError) throw conquestsError
  if (!conquests || conquests.length === 0) return []

  // Get display names for all users who have conquests
  const userIds = [...new Set(conquests.map((c) => c.user_id as string))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [
      p.id as string,
      p.display_name as string,
    ])
  )

  return conquests.map((c) => ({
    plane_scryfall_id: c.plane_scryfall_id as string,
    plane_name: c.plane_name as string,
    user_id: c.user_id as string,
    display_name: nameMap.get(c.user_id as string) ?? 'Unknown',
  }))
}
```

- [ ] **Step 2: Add the `usePodConquests` hook to usePods.ts**

Add this import at the top of `src/hooks/usePods.ts`:

```typescript
import { getPodAllConquests } from '@/lib/map/queries'
```

Add this hook at the end of the file, before the Friends section:

```typescript
export function usePodConquests(podId: string | undefined) {
  return useQuery({
    queryKey: ['pod-conquests', podId],
    queryFn: () => getPodAllConquests(podId!),
    enabled: !!podId,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/map/queries.ts src/hooks/usePods.ts
git commit -m "feat: add pod-wide conquests query for planar map"
```

---

### Task 3: Planar Map Page

**Files:**
- Create: `src/app/map/page.tsx`
- Create: `src/app/map/layout.tsx`

This is the main feature — a responsive grid of all plane card thumbnails, color-coded by conquest status. Key requirements:
- Grid of `image_uris.small` thumbnails (plane cards only, no phenomena)
- Color coding: gold border = yours, colored border = podmate's, dim/no border = unclaimed
- Tap opens `CardZoomModal` with `border_crop` image
- Filter dropdown: All, Mine, each podmate's name, Unclaimed
- Needs auth — redirect if not logged in
- Lazy loading via `next/image` with `loading="lazy"`

- [ ] **Step 1: Create the map layout with SEO metadata**

```typescript
// src/app/map/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planar Map',
  openGraph: {
    title: 'Planar Map | PlaneChaser',
    description: 'See the multiverse — every plane, color-coded by who conquered it.',
  },
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 2: Create the planar map page**

```tsx
// src/app/map/page.tsx
'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Map, Filter, Crown, Globe } from 'lucide-react'
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
import { usePodConquests } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { PlaneCard } from '@/lib/game/types'

// Assign deterministic colors to pod members for their conquered planes
const MEMBER_COLORS = [
  { border: 'border-yellow-500', glow: 'shadow-yellow-500/40', label: 'text-yellow-400' },   // current user always gold
  { border: 'border-blue-500', glow: 'shadow-blue-500/40', label: 'text-blue-400' },
  { border: 'border-emerald-500', glow: 'shadow-emerald-500/40', label: 'text-emerald-400' },
  { border: 'border-rose-500', glow: 'shadow-rose-500/40', label: 'text-rose-400' },
  { border: 'border-purple-500', glow: 'shadow-purple-500/40', label: 'text-purple-400' },
  { border: 'border-orange-500', glow: 'shadow-orange-500/40', label: 'text-orange-400' },
  { border: 'border-cyan-500', glow: 'shadow-cyan-500/40', label: 'text-cyan-400' },
  { border: 'border-pink-500', glow: 'shadow-pink-500/40', label: 'text-pink-400' },
]

type FilterOption = 'all' | 'mine' | 'unclaimed' | string // string = specific user_id

export default function MapPage() {
  const user = useAppStore((s) => s.user)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: corpus, isLoading: corpusLoading } = usePlaneCorpus()
  const { data: conquests, isLoading: conquestsLoading } = usePodConquests(activePodId ?? undefined)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [zoomedCard, setZoomedCard] = useState<PlaneCard | null>(null)

  // Build a map of plane_scryfall_id -> conquest info
  const conquestMap = useMemo(() => {
    if (!conquests) return new Map<string, { user_id: string; display_name: string }>()
    const map = new Map<string, { user_id: string; display_name: string }>()
    for (const c of conquests) {
      // If multiple conquests for same plane, last one wins (most recent)
      map.set(c.plane_scryfall_id, { user_id: c.user_id, display_name: c.display_name })
    }
    return map
  }, [conquests])

  // Build color assignments: current user = index 0 (gold), then other members in order
  const memberColorMap = useMemo(() => {
    if (!conquests || !user) return new Map<string, typeof MEMBER_COLORS[0]>()
    const uniqueUsers = [...new Set(conquests.map((c) => c.user_id))]
    const map = new Map<string, typeof MEMBER_COLORS[0]>()
    // Current user always gets gold (index 0)
    map.set(user.id, MEMBER_COLORS[0])
    let colorIdx = 1
    for (const uid of uniqueUsers) {
      if (uid === user.id) continue
      map.set(uid, MEMBER_COLORS[colorIdx % MEMBER_COLORS.length])
      colorIdx++
    }
    return map
  }, [conquests, user])

  // Get unique conquerors for the filter dropdown
  const conquerors = useMemo(() => {
    if (!conquests || !user) return []
    const seen = new Map<string, string>()
    for (const c of conquests) {
      if (!seen.has(c.user_id)) seen.set(c.user_id, c.display_name)
    }
    return Array.from(seen.entries())
      .filter(([id]) => id !== user.id)
      .map(([id, name]) => ({ id, name }))
  }, [conquests, user])

  // Filter planes: only show plane cards (no phenomena)
  const planes = useMemo(() => {
    if (!corpus) return []
    return corpus.filter((c) => c.card_type === 'plane')
  }, [corpus])

  // Apply filter
  const filteredPlanes = useMemo(() => {
    if (filter === 'all') return planes
    if (filter === 'mine') {
      return planes.filter((p) => conquestMap.get(p.id)?.user_id === user?.id)
    }
    if (filter === 'unclaimed') {
      return planes.filter((p) => !conquestMap.has(p.id))
    }
    // Filter by specific user_id
    return planes.filter((p) => conquestMap.get(p.id)?.user_id === filter)
  }, [planes, filter, conquestMap, user])

  const isLoading = corpusLoading || conquestsLoading

  // Stats
  const myCount = planes.filter((p) => conquestMap.get(p.id)?.user_id === user?.id).length
  const claimedCount = planes.filter((p) => conquestMap.has(p.id)).length
  const totalPlanes = planes.length

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 px-3 py-4 max-w-[600px] mx-auto w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-accent)]" />
            <h1
              className="text-[20px] font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Planar Map
            </h1>
          </div>
          {!isLoading && activePodId && (
            <p
              className="text-[11px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {myCount} yours · {claimedCount} claimed · {totalPlanes} total
            </p>
          )}
          {!activePodId && (
            <p
              className="text-[12px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Select a pod in the Pods tab to see conquest data
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[12px] px-2 transition-colors focus:border-[var(--color-accent)]/50 focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <option value="all">All Planes ({totalPlanes})</option>
            <option value="mine">Mine ({myCount})</option>
            <option value="unclaimed">Unclaimed ({totalPlanes - claimedCount})</option>
            {conquerors.map(({ id, name }) => {
              const count = planes.filter((p) => conquestMap.get(p.id)?.user_id === id).length
              return (
                <option key={id} value={id}>
                  {name} ({count})
                </option>
              )
            })}
          </select>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[5/7] rounded-lg bg-[var(--color-surface)] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Map grid */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-4 sm:grid-cols-5 gap-1.5"
          >
            {filteredPlanes.map((plane) => {
              const conquest = conquestMap.get(plane.id)
              const colors = conquest ? memberColorMap.get(conquest.user_id) : null
              const isMine = conquest?.user_id === user?.id

              return (
                <button
                  key={plane.id}
                  onClick={() => setZoomedCard(plane)}
                  className={`relative aspect-[5/7] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                    colors
                      ? `${colors.border} ${colors.glow} shadow-md`
                      : 'border-transparent opacity-50 hover:opacity-75'
                  }`}
                >
                  <Image
                    src={plane.image_uris.small}
                    alt={plane.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 480px) 25vw, 20vw"
                    loading="lazy"
                  />
                  {/* Conquest overlay */}
                  {conquest && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                      <p
                        className={`text-[7px] font-bold truncate ${colors?.label ?? 'text-white'}`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {isMine ? '👑 You' : conquest.display_name}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}

        {/* Empty state for filtered results */}
        {!isLoading && filteredPlanes.length === 0 && (
          <div className="text-center py-12">
            <Map className="w-8 h-8 mx-auto mb-3 text-[var(--color-text-muted)] opacity-40" />
            <p
              className="text-[13px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {filter === 'mine'
                ? 'You haven\'t conquered any planes yet!'
                : filter === 'unclaimed'
                  ? 'All planes have been claimed!'
                  : 'No planes match this filter.'}
            </p>
          </div>
        )}
      </div>

      <CardZoomModal
        src={zoomedCard ? zoomedCard.image_uris.border_crop : null}
        alt={zoomedCard?.name ?? ''}
        onClose={() => setZoomedCard(null)}
      />
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/map/page.tsx src/app/map/layout.tsx
git commit -m "feat: add planar map page with conquest visualization"
```

---

### Task 4: Bottom Nav + Game Controls Integration

**Files:**
- Modify: `src/components/bottom-nav.tsx`
- Modify: `src/components/game-controls-toolbar.tsx`

- [ ] **Step 1: Add Map to the bottom nav**

In `src/components/bottom-nav.tsx`, add the `Globe` import and the Map nav item:

Change the import line to:
```typescript
import { Swords, Users, User, Heart, UserPlus, Layers, Globe } from 'lucide-react'
```

Add the Map item to `NAV_ITEMS` after the Decks entry (index 1):
```typescript
const NAV_ITEMS = [
  { path: '/setup', label: 'Play', icon: Swords },
  { path: '/decks', label: 'Decks', icon: Layers },
  { path: '/map', label: 'Map', icon: Globe },
  { path: '/pods', label: 'Pods', icon: Users },
  { path: '/friends', label: 'Friends', icon: UserPlus },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/support', label: 'Support', icon: Heart },
] as const
```

- [ ] **Step 2: Add "How to Play" button to game controls toolbar**

In `src/components/game-controls-toolbar.tsx`, add the ability to navigate to the rules page from within a game. Add a `BookOpen` icon import and a link:

Change the import line to:
```typescript
import { Undo2, Shuffle, RotateCcw, Compass, Sparkles, ChevronUp, ChevronDown, BookOpen } from 'lucide-react'
```

Add after the existing `controls` array, inside the expanded section's `<div className="flex items-center justify-center gap-2 py-2 flex-wrap">`, add a row below the existing control buttons. Replace the entire returned JSX for the expanded section:

```tsx
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="overflow-hidden w-full"
>
  <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
    {controls.map(({ icon: Icon, label, action, enabled, color }) => (
      <button
        key={label}
        onClick={action}
        disabled={disabled || !enabled}
        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                   bg-white/5 border border-white/10
                   hover:bg-white/10 active:bg-white/15
                   disabled:opacity-30 disabled:pointer-events-none
                   transition-all min-w-[56px]"
      >
        <Icon className="w-4 h-4" style={{ color }} />
        <span
          className="text-[9px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </span>
      </button>
    ))}
  </div>
  <div className="flex justify-center pb-1">
    <a
      href="/rules"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <BookOpen className="w-3 h-3" />
      How to Play
    </a>
  </div>
</motion.div>
```

- [ ] **Step 3: Run build to verify no TypeScript errors**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/components/bottom-nav.tsx src/components/game-controls-toolbar.tsx
git commit -m "feat: add Map to bottom nav, How to Play link to game controls"
```

---

### Task 5: Feedback Form Page

**Files:**
- Create: `src/app/feedback/page.tsx`
- Create: `src/app/feedback/layout.tsx`
- Modify: `src/components/bottom-nav.tsx` (update Support link to /feedback OR keep as-is — see note below)

The feedback form has: category dropdown (bug, feature, general, other), message textarea (min 10 chars), submit button. It stores directly to Supabase via the query from Task 1. The page should be linked from the Support page, not replace it.

- [ ] **Step 1: Create feedback layout**

```typescript
// src/app/feedback/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Send Feedback',
  openGraph: {
    title: 'Send Feedback | PlaneChaser',
    description: 'Report bugs, request features, or share your thoughts.',
  },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 2: Create the feedback page**

```tsx
// src/app/feedback/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageSquare, Send, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { submitFeedback } from '@/lib/feedback/queries'
import { Footer } from '@/components/footer'

type Category = 'bug' | 'feature' | 'general' | 'other'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug Report', emoji: '🐛' },
  { value: 'feature', label: 'Feature Request', emoji: '💡' },
  { value: 'general', label: 'General Feedback', emoji: '💬' },
  { value: 'other', label: 'Other', emoji: '📝' },
]

export default function FeedbackPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const [category, setCategory] = useState<Category>('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = message.trim().length >= 10 && !submitting

  async function handleSubmit() {
    if (!canSubmit || !user) return
    setSubmitting(true)
    setError(null)

    try {
      await submitFeedback(user.id, { category, message: message.trim() })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
        <div className="fixed inset-0 z-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
        </div>
        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 max-w-[360px]"
          >
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
            <h2
              className="text-[20px] font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Thank You!
            </h2>
            <p
              className="text-[13px] text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Your feedback has been submitted. We read every message and it helps us make PlaneChaser better.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { setSubmitted(false); setMessage(''); }}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Send More
              </button>
              <button
                onClick={() => router.push('/support')}
                className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-[12px] hover:opacity-90 transition-opacity"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Back to Support
              </button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-20 glass-strong border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-3 max-w-[520px] mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"
          >
            <ArrowLeft size={18} />
          </button>
          <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
          <h1
            className="text-[16px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Send Feedback
          </h1>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-4 py-6 max-w-[520px] mx-auto w-full space-y-5">
        {/* Category selector */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] transition-all ${
                  category === value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Message textarea */}
        <div className="space-y-2">
          <label
            className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind... (min 10 characters)"
            rows={5}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm text-[var(--color-text)] text-[13px] px-4 py-3 resize-none focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors placeholder:text-[var(--color-text-muted)]/50"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <p
            className={`text-[10px] ${message.trim().length >= 10 ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/50'}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {message.trim().length} / 10 minimum characters
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p
            className="text-[12px] text-red-400 px-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] text-white text-[14px] font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        {!user && (
          <p
            className="text-center text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You need to be signed in to submit feedback.
          </p>
        )}
      </div>

      <Footer />
    </main>
  )
}
```

- [ ] **Step 3: Add "Send Feedback" link to the existing support page**

In `src/app/support/page.tsx`, find a good location (near the donation/contact section) and add a link to `/feedback`. Add this JSX block (look for a natural place in the page, near the email/contact area):

```tsx
<a
  href="/feedback"
  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-accent)] text-[var(--color-accent)] text-[13px] font-semibold hover:bg-[var(--color-accent)]/10 transition-colors w-full"
  style={{ fontFamily: 'var(--font-heading)' }}
>
  <MessageSquare className="w-4 h-4" />
  Send Feedback
</a>
```

Add `MessageSquare` to the lucide-react imports in `src/app/support/page.tsx`.

- [ ] **Step 4: Run build to verify**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 5: Commit**

```bash
git add src/app/feedback/page.tsx src/app/feedback/layout.tsx src/app/support/page.tsx
git commit -m "feat: add feedback form page with category selector and Supabase storage"
```

---

### Task 6: Run Tests + Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing tests should not be affected)

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: Compiles successfully with no TypeScript errors

- [ ] **Step 3: Verify no regressions — check all new pages exist**

New routes that should be accessible:
- `/map` — Planar map page
- `/feedback` — Feedback form page

Bottom nav should show 7 items: Play, Decks, Map, Pods, Friends, Profile, Support

Game controls toolbar should show "How to Play" link when expanded.

---

## Self-Review

### Spec Coverage
| Requirement | Task |
|-------------|------|
| PM-01: Planar map grid/constellation of ~185 planes | Task 3 |
| PM-02: Color-coded by status (unclaimed/yours/podmate) | Task 3 (MEMBER_COLORS, conquestMap) |
| PM-03: Tap plane → zoom modal | Task 3 (CardZoomModal) |
| PM-04: Filter: all, mine, podmate name, unclaimed | Task 3 (FilterOption type, filter dropdown) |
| PM-05: Feedback form: category, message | Task 5 |
| PM-06: Feedback stored in Supabase | Task 1 (migration + query) |
| PM-07: Tips/how-to-play from game menu | Task 4 (BookOpen link in game controls) |

### Placeholder scan
No TBD/TODO/placeholders found. All code blocks are complete.

### Type consistency
- `MapConquest` (Task 2) used consistently in Task 3
- `FeedbackSubmission` (Task 1) used in Task 5
- `FilterOption` type matches filter dropdown values
- `MEMBER_COLORS` array indexed correctly (0 = gold for current user)
- `CardZoomModal` props match existing interface (`src`, `alt`, `onClose`)
