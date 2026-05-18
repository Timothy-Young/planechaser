# Phase 7a: Archenemy Expanded Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Archenemy format with a scheme deck builder (full CRUD mirroring plane decks), multi-plane symmetric steal win conditions, back-to-back prevention with full picker, and manual archenemy designation.

**Architecture:** New `user_scheme_decks` table + scheme deck pages mirror the existing plane deck builder pattern. The archenemy end dialog is rewritten with a state machine for sequential per-ally plane stealing. A shared `PlanePicker` component replaces the old `DethroneDialog`. Setup page gains an archenemy mode toggle, designation picker, and scheme deck selector.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), TanStack Query v5, Zustand, Framer Motion, TypeScript

**Spec:** `docs/superpowers/specs/2026-05-18-phase-7a-archenemy-expanded-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/010_scheme_decks_and_archenemy.sql` | Schema: `user_scheme_decks` table + `pods.last_archenemy_user_id` column |
| `src/lib/scheme-decks/types.ts` | `UserSchemeDeck` interface |
| `src/lib/scheme-decks/queries.ts` | CRUD operations for scheme decks |
| `src/lib/scheme-decks/presets.ts` | Preset template definitions (Aggressive, Balanced, Chaos) |
| `src/hooks/useSchemeDecks.ts` | TanStack Query hooks for scheme deck CRUD |
| `src/app/scheme-decks/page.tsx` | Scheme deck list page |
| `src/app/scheme-decks/[id]/page.tsx` | Scheme deck builder page |
| `src/components/plane-picker.tsx` | Reusable conquered plane selection component |
| `src/components/archenemy-picker.tsx` | Archenemy designation picker with back-to-back warning |

### Modified files
| File | Change |
|------|--------|
| `src/lib/pods/queries.ts` | Add `deleteConqueredPlane()`, `updateLastArchenemy()` |
| `src/lib/pods/types.ts` | Add `last_archenemy_user_id` to `Pod` interface |
| `src/hooks/usePods.ts` | Add `useDeleteConqueredPlane()`, `useUpdateLastArchenemy()` hooks |
| `src/components/archenemy-end-dialog.tsx` | Full rewrite: multi-step steal flows |
| `src/app/game/page.tsx` | Update `ArchenemyEndDialog` props (add `players`, `podId`) |
| `src/app/setup/page.tsx` | Archenemy mode toggle, picker, scheme deck selector |

### Removed files
| File | Replacement |
|------|-------------|
| `src/components/dethrone-dialog.tsx` | Replaced by `src/components/plane-picker.tsx` |

---

## Task 1: Database Migration

**Files:**
- Create: `planechaser/supabase/migrations/010_scheme_decks_and_archenemy.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- User scheme decks (mirrors user_decks pattern)
CREATE TABLE IF NOT EXISTS user_scheme_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL,
  scheme_ids  TEXT[] NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scheme_decks_user_id ON user_scheme_decks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_scheme_decks_one_default
  ON user_scheme_decks(user_id) WHERE is_default = true;

ALTER TABLE user_scheme_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheme decks"
  ON user_scheme_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scheme decks"
  ON user_scheme_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheme decks"
  ON user_scheme_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheme decks"
  ON user_scheme_decks FOR DELETE USING (auth.uid() = user_id);

-- Back-to-back archenemy prevention
ALTER TABLE pods ADD COLUMN IF NOT EXISTS last_archenemy_user_id UUID REFERENCES auth.users;
```

- [ ] **Step 2: Apply the migration to Supabase**

Run via Supabase MCP tool: `apply_migration` with name `010_scheme_decks_and_archenemy` and the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_scheme_decks_and_archenemy.sql
git commit -m "feat: add user_scheme_decks table and last_archenemy_user_id column"
```

---

## Task 2: Scheme Deck Data Layer (Types + Queries + Hooks)

**Files:**
- Create: `planechaser/src/lib/scheme-decks/types.ts`
- Create: `planechaser/src/lib/scheme-decks/queries.ts`
- Create: `planechaser/src/lib/scheme-decks/presets.ts`
- Create: `planechaser/src/hooks/useSchemeDecks.ts`

- [ ] **Step 1: Create the types file**

Create `planechaser/src/lib/scheme-decks/types.ts`:

```typescript
export interface UserSchemeDeck {
  id: string
  user_id: string
  name: string
  scheme_ids: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Create the queries file**

Create `planechaser/src/lib/scheme-decks/queries.ts`. Follow the exact pattern from `src/lib/decks/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { UserSchemeDeck } from './types'

function supabase() {
  return createClient()
}

export async function getUserSchemeDecks(userId: string): Promise<UserSchemeDeck[]> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as UserSchemeDeck[]
}

export async function getSchemeDeck(deckId: string): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function createSchemeDeck(
  userId: string,
  name: string,
  schemeIds: string[],
  isDefault = false,
): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .insert({ user_id: userId, name, scheme_ids: schemeIds, is_default: isDefault })
    .select()
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function updateSchemeDeck(
  deckId: string,
  updates: { name?: string; scheme_ids?: string[] },
): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .select()
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function deleteSchemeDeck(deckId: string): Promise<void> {
  const { error } = await supabase()
    .from('user_scheme_decks')
    .delete()
    .eq('id', deckId)

  if (error) throw error
}

export async function createDefaultSchemeDeck(
  userId: string,
  allSchemeIds: string[],
): Promise<UserSchemeDeck> {
  const shuffled = [...allSchemeIds].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 20)
  return createSchemeDeck(userId, 'Default Scheme Deck', selected, true)
}
```

- [ ] **Step 3: Create the presets file**

Create `planechaser/src/lib/scheme-decks/presets.ts`.

The presets define named categories. At creation time, the scheme corpus is filtered by these criteria to populate the deck. The implementer should fetch the scheme corpus from the `cards` table (via `useSchemeCorpus`) and categorize cards by their `oracle_text` and `is_ongoing` flag.

```typescript
export interface SchemePreset {
  name: string
  description: string
  filter: (scheme: { oracle_text: string; is_ongoing: boolean }) => boolean
  targetSize: number
}

export const SCHEME_PRESETS: SchemePreset[] = [
  {
    name: 'Aggressive',
    description: 'Heavy on one-shot damage and disruption',
    filter: (s) => !s.is_ongoing,
    targetSize: 20,
  },
  {
    name: 'Balanced',
    description: 'Mix of ongoing and one-shot schemes',
    filter: () => true,
    targetSize: 20,
  },
  {
    name: 'Chaos',
    description: 'Maximum randomness and board-shaking effects',
    filter: (s) => {
      const text = s.oracle_text.toLowerCase()
      return text.includes('random') || text.includes('each') || text.includes('all') || s.is_ongoing
    },
    targetSize: 20,
  },
]

export function buildPresetDeck(
  presetName: string,
  allSchemes: { id: string; oracle_text: string; is_ongoing: boolean }[],
): string[] {
  const preset = SCHEME_PRESETS.find((p) => p.name === presetName)
  if (!preset) return []

  const matching = allSchemes.filter(preset.filter)
  const shuffled = [...matching].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, preset.targetSize)

  // If not enough matching schemes, fill from the full pool
  if (selected.length < preset.targetSize) {
    const selectedIds = new Set(selected.map((s) => s.id))
    const remaining = allSchemes.filter((s) => !selectedIds.has(s.id))
    const extra = [...remaining].sort(() => Math.random() - 0.5)
    selected.push(...extra.slice(0, preset.targetSize - selected.length))
  }

  return selected.map((s) => s.id)
}
```

- [ ] **Step 4: Create the hooks file**

Create `planechaser/src/hooks/useSchemeDecks.ts`. Follow the exact pattern from `src/hooks/useDecks.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserSchemeDecks,
  getSchemeDeck,
  createSchemeDeck,
  updateSchemeDeck,
  deleteSchemeDeck,
  createDefaultSchemeDeck,
} from '@/lib/scheme-decks/queries'
import { useAppStore } from '@/store/app-store'

export function useUserSchemeDecks() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['scheme-decks', user?.id],
    queryFn: () => getUserSchemeDecks(user!.id),
    enabled: !!user,
  })
}

export function useSchemeDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['scheme-deck', deckId],
    queryFn: () => getSchemeDeck(deckId!),
    enabled: !!deckId,
  })
}

export function useCreateSchemeDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; schemeIds: string[] }) =>
      createSchemeDeck(user!.id, params.name, params.schemeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}

export function useUpdateSchemeDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { deckId: string; updates: { name?: string; scheme_ids?: string[] } }) =>
      updateSchemeDeck(params.deckId, params.updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['scheme-decks'] })
      qc.invalidateQueries({ queryKey: ['scheme-deck', vars.deckId] })
    },
  })
}

export function useDeleteSchemeDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deckId: string) => deleteSchemeDeck(deckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}

export function useCreateDefaultSchemeDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allSchemeIds: string[]) => createDefaultSchemeDeck(user!.id, allSchemeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scheme-decks/ src/hooks/useSchemeDecks.ts
git commit -m "feat: add scheme deck data layer (types, queries, presets, hooks)"
```

---

## Task 3: Scheme Deck List Page

**Files:**
- Create: `planechaser/src/app/scheme-decks/page.tsx`

- [ ] **Step 1: Create the scheme deck list page**

Create `planechaser/src/app/scheme-decks/page.tsx`. Follow the pattern from `src/app/decks/page.tsx` exactly — same layout, same glass card styling, same animation patterns. Key differences:

- Title: "My Scheme Decks"
- Uses `useUserSchemeDecks()`, `useCreateSchemeDeck()`, `useDeleteSchemeDeck()`, `useCreateDefaultSchemeDeck()` from `src/hooks/useSchemeDecks.ts`
- Uses `useSchemeCorpus()` from `src/hooks/useCardCorpus.ts` for auto-creating default deck and getting IDs
- Auto-creates a default 20-scheme deck if user has none and corpus is loaded (same pattern as plane decks but uses `allSchemeIds` instead of `planeOnlyIds`)
- Create form includes a "Template" selector: dropdown with options "Custom", "Aggressive", "Balanced", "Chaos"
  - When a template is selected and the user clicks "Create & Edit", call `buildPresetDeck(presetName, schemes)` from `src/lib/scheme-decks/presets.ts` to get initial scheme_ids
  - When "Custom" is selected, create with empty scheme_ids
- Deck cards show: star icon for default, deck name, scheme count (e.g., "20 schemes"), delete button (not for default)
- Minimum deck size warning: show if deck has < 20 schemes
- Empty state: "No scheme decks yet. Create one or generate a default deck."
- Style: all CSS vars (`--color-*`), `var(--font-heading)`, `var(--font-body)`, Framer Motion, same rounded-2xl cards

Read `src/app/decks/page.tsx` as your primary reference for structure and styling.

- [ ] **Step 2: Verify the page renders**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/scheme-decks/page.tsx
git commit -m "feat: add scheme deck list page at /scheme-decks"
```

---

## Task 4: Scheme Deck Builder Page

**Files:**
- Create: `planechaser/src/app/scheme-decks/[id]/page.tsx`

- [ ] **Step 1: Create the scheme deck builder page**

Create `planechaser/src/app/scheme-decks/[id]/page.tsx`. Follow the pattern from `src/app/decks/[id]/page.tsx` exactly. Key differences:

- Uses `useSchemeDeck(deckId)` and `useUpdateSchemeDeck()` from `src/hooks/useSchemeDecks.ts`
- Uses `useSchemeCorpus()` from `src/hooks/useCardCorpus.ts` instead of `usePlaneCorpus()`
- Filter toggle: "All" / "Ongoing" / "One-shot" (instead of "Planes" / "Phenomena")
  - Filter logic: "Ongoing" shows cards where `isOngoing === true`, "One-shot" shows `isOngoing === false`
- Card grid uses **portrait aspect ratio** (`aspect-[5/7]`) — NO rotation. Scheme cards are naturally portrait.
  - Compare with plane deck builder which uses `aspect-[3/2]` with 90° rotation for planes
- Cards show: scheme image (`border_crop` URL), "Ongoing" badge (green, if `isOngoing`), checkmark when selected
- No "Conquered" or "Visited" badges (those concepts don't apply to schemes)
- No `includeConquered` or `includeVisited` filter checkboxes
- Search filters by `name` and `oracle_text`
- Selected panel: chips showing selected scheme names, click to remove
- Save button disabled if `selectedIds.size < 20`
- Minimum 20 schemes to save
- On save: calls `useUpdateSchemeDeck().mutateAsync({ deckId, updates: { name, scheme_ids: [...selectedIds] } })`
- Redirects to `/scheme-decks` after save

Read `src/app/decks/[id]/page.tsx` as your primary reference. The component structure, sticky header, search bar, and grid layout should be nearly identical — the key differences are the filter options, aspect ratio, and badge types.

- [ ] **Step 2: Verify the page renders**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/scheme-decks/\[id\]/page.tsx
git commit -m "feat: add scheme deck builder page at /scheme-decks/[id]"
```

---

## Task 5: Pod Queries + Hooks for Archenemy Win Conditions

**Files:**
- Modify: `planechaser/src/lib/pods/types.ts`
- Modify: `planechaser/src/lib/pods/queries.ts`
- Modify: `planechaser/src/hooks/usePods.ts`

- [ ] **Step 1: Update Pod type**

In `planechaser/src/lib/pods/types.ts`, add `last_archenemy_user_id` to the `Pod` interface:

```typescript
export interface Pod {
  id: string
  name: string
  invite_code: string
  archenemy_threshold: number
  created_by: string
  created_at: string
  last_archenemy_user_id: string | null
}
```

- [ ] **Step 2: Add new query functions**

In `planechaser/src/lib/pods/queries.ts`, add two new functions:

```typescript
export async function deleteConqueredPlane(conquestId: string): Promise<void> {
  const { error } = await supabase()
    .from('conquered_planes')
    .delete()
    .eq('id', conquestId)

  if (error) throw error
}

export async function updateLastArchenemy(podId: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from('pods')
    .update({ last_archenemy_user_id: userId })
    .eq('id', podId)

  if (error) throw error
}
```

Also add `deleteConqueredPlane` and `updateLastArchenemy` to the imports at the top of the file if needed.

- [ ] **Step 3: Add new hooks**

In `planechaser/src/hooks/usePods.ts`, add two new hooks:

```typescript
export function useDeleteConqueredPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conquestId: string) => deleteConqueredPlane(conquestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conquests'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}

export function useUpdateLastArchenemy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { podId: string; userId: string }) =>
      updateLastArchenemy(params.podId, params.userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] })
    },
  })
}
```

Add the imports for `deleteConqueredPlane` and `updateLastArchenemy` from `@/lib/pods/queries`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pods/types.ts src/lib/pods/queries.ts src/hooks/usePods.ts
git commit -m "feat: add deleteConqueredPlane and updateLastArchenemy queries and hooks"
```

---

## Task 6: PlanePicker Component (Replaces DethroneDialog)

**Files:**
- Create: `planechaser/src/components/plane-picker.tsx`
- Remove: `planechaser/src/components/dethrone-dialog.tsx`

- [ ] **Step 1: Create PlanePicker component**

Create `planechaser/src/components/plane-picker.tsx`. This is a reusable component for selecting a conquered plane from a list. Based on the existing `dethrone-dialog.tsx` UI but made generic:

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { ConqueredPlane } from '@/lib/pods/types'

interface PlanePickerProps {
  title: string
  subtitle: string
  conquests: ConqueredPlane[]
  onSelect: (conquestId: string) => void
  onSkip: () => void
  skipLabel?: string
  selectLabel?: string
}

export function PlanePicker({
  title,
  subtitle,
  conquests,
  onSelect,
  onSkip,
  skipLabel = 'Skip',
  selectLabel = 'Confirm',
}: PlanePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2
          className="text-[20px] font-bold text-[var(--color-cta)] tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h2>
        <p
          className="text-[13px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {subtitle}
        </p>
      </div>

      {conquests.length > 0 ? (
        <div className="max-h-[40vh] overflow-y-auto space-y-2">
          {conquests.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                selectedId === c.id
                  ? 'border-2 border-[var(--color-cta)] bg-[var(--color-cta)]/10'
                  : 'border border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              <img
                src={c.plane_image_uri}
                alt={c.plane_name}
                className="w-16 aspect-[3/2] rounded object-cover"
              />
              <span
                className="text-[13px] font-semibold text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {c.plane_name}
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <p
          className="text-center text-[13px] text-[var(--color-text-muted)] py-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          No conquered planes available.
        </p>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onSkip}
          variant="outline"
          className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '14px' }}
        >
          {skipLabel}
        </Button>
        {conquests.length > 0 && (
          <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => selectedId && onSelect(selectedId)}
              disabled={!selectedId}
              className="w-full h-11 rounded-xl hover:opacity-90 disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                background: 'linear-gradient(135deg, var(--color-accent-deep), var(--color-accent))',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
              }}
            >
              {selectLabel}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old DethroneDialog**

Delete `planechaser/src/components/dethrone-dialog.tsx`. It is fully replaced by `PlanePicker`.

- [ ] **Step 3: Commit**

```bash
git add src/components/plane-picker.tsx
git rm src/components/dethrone-dialog.tsx
git commit -m "feat: add PlanePicker component, remove DethroneDialog"
```

---

## Task 7: Archenemy End Dialog Rewrite

**Files:**
- Modify: `planechaser/src/components/archenemy-end-dialog.tsx`

This is the most complex task. The dialog is rewritten with a state machine to handle sequential per-ally plane stealing for both outcomes, plus the collective deletion step.

- [ ] **Step 1: Rewrite the archenemy end dialog**

Rewrite `planechaser/src/components/archenemy-end-dialog.tsx` completely. New interface:

```typescript
interface ArchenemyEndDialogProps {
  archenemyId: string
  archenemyName: string
  players: { id: string; display_name: string }[]
  podId: string
  onClose: () => void
  onConfirm: () => void
}
```

**State machine phases:**
- `'choose'` — "Archenemy Won" / "Team Won" buttons + "Keep Playing" cancel
- `'archenemy-steal'` — Sequential loop: archenemy picks 1 plane from each ally
- `'allies-steal'` — Sequential loop: each ally picks 1 plane from archenemy
- `'collective-delete'` — Host picks 1 plane from archenemy's remaining to delete
- `'summary'` — Show results + "End Game" button

**Internal state:**
```typescript
const [phase, setPhase] = useState<'choose' | 'archenemy-steal' | 'allies-steal' | 'collective-delete' | 'summary'>('choose')
const [allyIndex, setAllyIndex] = useState(0)
const [results, setResults] = useState<{ action: string; planeName: string; fromPlayer: string; toPlayer: string }[]>([])
const [deletedPlaneName, setDeletedPlaneName] = useState<string | null>(null)
```

**Key logic:**
- `allies` is derived: `players.filter(p => p.id !== archenemyId)`
- For `'archenemy-steal'`: fetch current ally's conquests via `getUserConquests(allies[allyIndex].id, podId)`. Use `useStealPlane()` to transfer. After steal, increment `allyIndex`. When `allyIndex >= allies.length`, go to `'summary'`.
- For `'allies-steal'`: fetch archenemy's conquests (refreshed each step since planes are being taken). Use `useStealPlane()` to transfer. After steal, increment `allyIndex`. When `allyIndex >= allies.length`, go to `'collective-delete'`.
- For `'collective-delete'`: fetch archenemy's remaining conquests. Use `useDeleteConqueredPlane()` to delete. Then go to `'summary'`.
- Use the `PlanePicker` component for all selection steps.
- Call `useUpdateLastArchenemy()` with the archenemy's ID when transitioning to `'summary'`.
- The summary shows a list of all results and the deleted plane if applicable.

**Important:** Each steal step needs to refetch the target player's conquests because previous steps may have changed them. Use `queryClient.invalidateQueries` after each steal, or fetch directly with `getUserConquests()` as a local call (not via the hook, since the hook is bound to the current user).

To fetch another player's conquests, call `getUserConquests(targetUserId, podId)` directly from `@/lib/pods/queries` rather than through the hook (which is bound to the logged-in user). Store results in local component state.

Read the existing `archenemy-end-dialog.tsx` and `dethrone-dialog.tsx` for styling reference. The dialog wrapper is `fixed inset-0 z-50` with `bg-black/70`. Use `AnimatePresence` with `mode="wait"` for phase transitions.

- [ ] **Step 2: Type-check**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/archenemy-end-dialog.tsx
git commit -m "feat: rewrite archenemy end dialog with multi-step steal flows"
```

---

## Task 8: Update Game Page Props

**Files:**
- Modify: `planechaser/src/app/game/page.tsx`

- [ ] **Step 1: Update ArchenemyEndDialog usage in game page**

In `planechaser/src/app/game/page.tsx`, find the `ArchenemyEndDialog` usage (around line 393-400). Update it to pass the new required props:

Old:
```tsx
<ArchenemyEndDialog
  currentPlane={currentPlane}
  archenemyId={state.archenemy.archenemyId}
  archenemyName={state.archenemy.archenemyName}
  onClose={() => setShowEndGame(false)}
  onConfirm={handleEndGame}
/>
```

New:
```tsx
<ArchenemyEndDialog
  archenemyId={state.archenemy.archenemyId}
  archenemyName={state.archenemy.archenemyName}
  players={state.players}
  podId={activePodId ?? ''}
  onClose={() => setShowEndGame(false)}
  onConfirm={handleEndGame}
/>
```

Remove `currentPlane` prop (no longer needed — the dialog handles its own plane selection). Add `players` from `state.players` and `podId` from `activePodId` (already available via `useAppStore`).

Ensure `activePodId` is imported from the store at the top of the component. Check if it's already there — it likely is from the `EndGameDialog` usage.

- [ ] **Step 2: Type-check**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: pass players and podId to ArchenemyEndDialog"
```

---

## Task 9: Archenemy Picker Component

**Files:**
- Create: `planechaser/src/components/archenemy-picker.tsx`

- [ ] **Step 1: Create the archenemy picker component**

Create `planechaser/src/components/archenemy-picker.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ArchenemyPickerProps {
  eligiblePlayers: { id: string; display_name: string; conquered_count: number }[]
  lastArchenemyId: string | null
  onSelect: (playerId: string) => void
  onCancel: () => void
}

export function ArchenemyPicker({
  eligiblePlayers,
  lastArchenemyId,
  onSelect,
  onCancel,
}: ArchenemyPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const hasBackToBack = lastArchenemyId && eligiblePlayers.some((p) => p.id === lastArchenemyId)

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3
          className="text-[16px] font-bold text-[var(--color-cta)] tracking-wide"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Designate Archenemy
        </h3>
        {hasBackToBack && (
          <p
            className="text-[12px] text-[var(--color-gold)] font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {eligiblePlayers.find((p) => p.id === lastArchenemyId)?.display_name} was the Archenemy last game. Consider designating a different player.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {eligiblePlayers.map((player) => {
          const isLastArchenemy = player.id === lastArchenemyId
          const isSelected = selectedId === player.id
          return (
            <motion.button
              key={player.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedId(player.id)}
              className={`w-full h-12 rounded-xl border px-4 flex items-center justify-between transition-colors ${
                isSelected
                  ? 'border-[var(--color-cta)] bg-[var(--color-cta)]/15 text-[var(--color-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                {player.display_name}
                {isLastArchenemy && (
                  <span className="ml-2 text-[11px] text-[var(--color-gold)] font-medium">
                    (last archenemy)
                  </span>
                )}
              </span>
              <span
                className="text-[12px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {player.conquered_count} planes
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-11 border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] rounded-xl"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
        >
          Cancel
        </Button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => selectedId && onSelect(selectedId)}
          disabled={!selectedId}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[var(--color-cta)] to-[var(--color-destructive)] text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ fontFamily: 'var(--font-heading)', color: '#fff' }}
        >
          Confirm
        </motion.button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/archenemy-picker.tsx
git commit -m "feat: add archenemy picker with back-to-back warning"
```

---

## Task 10: Setup Page — Archenemy Mode Toggle, Picker, and Scheme Deck Selector

**Files:**
- Modify: `planechaser/src/app/setup/page.tsx`

This is the integration task that ties everything together in the setup flow.

- [ ] **Step 1: Add archenemy mode state and imports**

Add to the top imports in `planechaser/src/app/setup/page.tsx`:
```typescript
import { ArchenemyPicker } from '@/components/archenemy-picker'
import { useUserSchemeDecks } from '@/hooks/useSchemeDecks'
```

Add new state variables inside `SetupPageInner`:
```typescript
const [archenemyMode, setArchenemyMode] = useState(false)
const [designatedArchenemyId, setDesignatedArchenemyId] = useState<string | null>(null)
const [showArchenemyPicker, setShowArchenemyPicker] = useState(false)
const [selectedSchemeDeckId, setSelectedSchemeDeckId] = useState<string | null>(null)
const { data: schemeDecks } = useUserSchemeDecks()
```

- [ ] **Step 2: Add archenemy auto-detection and manual toggle**

Replace the existing "Archenemy alert" button (the `{archenemy && activePod && (...)}` block around lines 263-279) with the new archenemy section.

The new section should:
1. Show when `activePod` is set and players are configured
2. Auto-detect: if `archenemy` exists from leaderboard, show the alert banner with the candidate
3. Manual toggle: "Archenemy Mode" switch that can be turned on even without threshold
4. When toggled on (or auto-detected), determine if picker is needed:
   - Get all eligible players from leaderboard (those meeting threshold), or all players if manual mode
   - Check `activePod.last_archenemy_user_id` for back-to-back
   - If only 1 eligible and NOT last archenemy: auto-designate
   - Otherwise: show `ArchenemyPicker`
5. After designation, show scheme deck selector

- [ ] **Step 3: Add scheme deck selector UI**

After the archenemy is designated (when `designatedArchenemyId` is set), show:
- A dropdown of saved scheme decks (from `schemeDecks`)
- First option: "All Schemes (default)" with value `null`
- Link to `/scheme-decks` to create/edit
- Store selection in `selectedSchemeDeckId` state

- [ ] **Step 4: Update the startGame function**

Modify the `startGame` function to use the new archenemy state:

Replace the archenemy initialization block (lines 117-132) so that:
- Instead of using `archenemy` from leaderboard directly, use `designatedArchenemyId` and the matching player from the players list
- For scheme deck: if `selectedSchemeDeckId` is set, find the scheme deck from `schemeDecks`, filter `schemes` corpus by those IDs, shuffle. If null, use full corpus (current behavior).
- Find the designated player's name from the players list or leaderboard

```typescript
let archenemyState: ArchenemyState | undefined
if (archenemyMode && designatedArchenemyId && schemes && schemes.length > 0) {
  const designatedPlayer = players.find((p) => p.id === designatedArchenemyId)
    ?? leaderboard?.find((e) => e.user_id === designatedArchenemyId)

  let schemesToUse = schemes
  if (selectedSchemeDeckId) {
    const schemeDeck = schemeDecks?.find((d) => d.id === selectedSchemeDeckId)
    if (schemeDeck) {
      const deckSchemeSet = new Set(schemeDeck.scheme_ids)
      schemesToUse = schemes.filter((s) => deckSchemeSet.has(s.id))
    }
  }

  const schemeDeck = shuffleDeck(schemesToUse).map((s) => ({
    ...s,
    isOngoing: s.type_line.toLowerCase().includes('ongoing'),
  })) as SchemeCard[]

  archenemyState = {
    archenemyId: designatedArchenemyId,
    archenemyName: designatedPlayer?.display_name ?? 'Archenemy',
    schemeDeck,
    currentSchemeIndex: 0,
    activeSchemes: [],
    schemesPlayed: 0,
  }
}
```

Also update `startGame` call: change `startGame(false)` on the Start Game button to `startGame(archenemyMode)`, and remove the old `handleArchenemyGame` function (it's replaced by the inline toggle flow).

- [ ] **Step 5: Update the Archenemy Showdown button**

Replace the old `handleArchenemyGame()` button with the new auto-detect banner that toggles `archenemyMode` and opens the picker. The old button created a session and navigated to lobby with `&archenemy=true` — the new flow keeps everything on the setup page.

When the auto-detect banner is clicked:
1. Set `archenemyMode = true`
2. Check if picker is needed (back-to-back or multiple candidates)
3. If auto-designate: set `designatedArchenemyId` directly
4. If picker needed: set `showArchenemyPicker = true`

- [ ] **Step 6: Type-check and build**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/app/setup/page.tsx
git commit -m "feat: add archenemy mode toggle, picker, and scheme deck selector to setup page"
```

---

## Task 11: Build Verification and Final Cleanup

**Files:** All modified files

- [ ] **Step 1: Full type-check**

Run: `cd planechaser && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Full build**

Run: `cd planechaser && npx next build`
Expected: Build succeeds with no errors (existing SSR warnings like `location is not defined` are acceptable)

- [ ] **Step 3: Verify no stale imports**

Search for any remaining references to `DethroneDialog` or `dethrone-dialog`:

```bash
grep -r "DethroneDialog\|dethrone-dialog" planechaser/src/
```

Expected: No matches (it was only used in `archenemy-end-dialog.tsx`, which was rewritten)

- [ ] **Step 4: Commit any cleanup**

If any stale imports or references were found, fix and commit:

```bash
git add -A
git commit -m "fix: clean up stale imports from dethrone-dialog removal"
```
