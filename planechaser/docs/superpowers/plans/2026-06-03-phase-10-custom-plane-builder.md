# Phase 10: Custom Plane Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create custom plane cards with names, abilities, chaos text, and card art — then include them in decks and play with them in games alongside official Scryfall planes.

**Architecture:** A new `custom_planes` table in Supabase stores user-created planes. Card images are uploaded to a Supabase Storage bucket (`custom-plane-images`). A builder form at `/custom-planes/new` lets users create planes with a live preview. Custom planes conform to the existing `PlaneCard` interface (with `id` prefixed `custom-` to distinguish from Scryfall IDs). The deck builder and setup page merge custom planes into the corpus so they appear alongside official cards. Sharing/public planes and moderation are deferred to a future iteration.

**Tech Stack:** Next.js 15 App Router, React 19, TanStack Query 5, Supabase Postgres + Storage, Tailwind CSS 4, Framer Motion 11, Lucide React icons

**Scope note:** This plan covers the core builder (create, edit, delete, image upload) and game integration. Public sharing, import-from-URL, and moderation are deferred.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/014_custom_planes.sql` | Custom planes table + storage bucket + RLS |
| `src/lib/custom-planes/types.ts` | `CustomPlane` type definition |
| `src/lib/custom-planes/queries.ts` | CRUD operations for custom planes |
| `src/lib/custom-planes/storage.ts` | Image upload/delete helpers for Supabase Storage |
| `src/hooks/useCustomPlanes.ts` | TanStack Query hooks for custom planes |
| `src/app/custom-planes/page.tsx` | List page showing user's custom planes |
| `src/app/custom-planes/layout.tsx` | SEO metadata |
| `src/app/custom-planes/new/page.tsx` | Builder form (create mode) |
| `src/app/custom-planes/[id]/edit/page.tsx` | Builder form (edit mode) |
| `src/components/custom-plane-preview.tsx` | Live card preview component |

### Modified Files
| File | Change |
|------|--------|
| `src/hooks/useCardCorpus.ts` | Add `useFullPlaneCorpus()` that merges Scryfall + custom planes |
| `src/app/decks/[id]/page.tsx` | Use `useFullPlaneCorpus()` instead of `usePlaneCorpus()` |
| `src/app/setup/page.tsx` | Use `useFullPlaneCorpus()` instead of `usePlaneCorpus()` |
| `src/components/bottom-nav.tsx` | No change needed — custom planes accessible from Decks page link |

---

### Task 1: Custom Planes Table Migration + Storage Bucket

**Files:**
- Create: `supabase/migrations/014_custom_planes.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 014_custom_planes.sql

-- Custom planes table
CREATE TABLE IF NOT EXISTS custom_planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  type_line TEXT NOT NULL DEFAULT 'Plane — Custom',
  oracle_text TEXT NOT NULL DEFAULT '',
  chaos_text TEXT NOT NULL DEFAULT '',
  flavor_text TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE custom_planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom planes"
  ON custom_planes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create custom planes"
  ON custom_planes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom planes"
  ON custom_planes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom planes"
  ON custom_planes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for custom plane images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-plane-images',
  'custom-plane-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload custom plane images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own custom plane images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own custom plane images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for custom plane images
CREATE POLICY "Anyone can view custom plane images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'custom-plane-images');
```

- [ ] **Step 2: Apply the migration to Supabase**

Use the Supabase MCP tool `apply_migration` with the SQL above. Migration name: `custom_planes`.

- [ ] **Step 3: Write the local migration file and commit**

```bash
git add supabase/migrations/014_custom_planes.sql
git commit -m "feat: add custom_planes table and storage bucket migration"
```

---

### Task 2: Custom Planes Types, Queries, and Storage Helpers

**Files:**
- Create: `src/lib/custom-planes/types.ts`
- Create: `src/lib/custom-planes/queries.ts`
- Create: `src/lib/custom-planes/storage.ts`
- Create: `src/hooks/useCustomPlanes.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/custom-planes/types.ts

export interface CustomPlane {
  id: string
  user_id: string
  name: string
  type_line: string
  oracle_text: string
  chaos_text: string
  flavor_text: string | null
  image_path: string | null
  created_at: string
  updated_at: string
}

export interface CustomPlaneInput {
  name: string
  type_line?: string
  oracle_text: string
  chaos_text: string
  flavor_text?: string
  image_path?: string | null
}
```

- [ ] **Step 2: Create the storage helpers**

```typescript
// src/lib/custom-planes/storage.ts

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'custom-plane-images'

export function getImageUrl(imagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export async function uploadPlaneImage(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Failed to upload image: ${error.message}`)
  return fileName
}

export async function deletePlaneImage(imagePath: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([imagePath])

  if (error) throw new Error(`Failed to delete image: ${error.message}`)
}
```

- [ ] **Step 3: Create the queries file**

```typescript
// src/lib/custom-planes/queries.ts

import { createClient } from '@/lib/supabase/client'
import type { CustomPlane, CustomPlaneInput } from './types'

function supabase() {
  return createClient()
}

export async function getUserCustomPlanes(userId: string): Promise<CustomPlane[]> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CustomPlane[]
}

export async function getCustomPlane(id: string): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function createCustomPlane(
  userId: string,
  input: CustomPlaneInput,
): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .insert({
      user_id: userId,
      name: input.name,
      type_line: input.type_line ?? 'Plane — Custom',
      oracle_text: input.oracle_text,
      chaos_text: input.chaos_text,
      flavor_text: input.flavor_text ?? null,
      image_path: input.image_path ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function updateCustomPlane(
  id: string,
  input: Partial<CustomPlaneInput>,
): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function deleteCustomPlane(id: string): Promise<void> {
  const { error } = await supabase()
    .from('custom_planes')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 4: Create the hooks file**

```typescript
// src/hooks/useCustomPlanes.ts

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserCustomPlanes,
  getCustomPlane,
  createCustomPlane,
  updateCustomPlane,
  deleteCustomPlane,
} from '@/lib/custom-planes/queries'
import { uploadPlaneImage, deletePlaneImage } from '@/lib/custom-planes/storage'
import type { CustomPlaneInput } from '@/lib/custom-planes/types'
import { useAppStore } from '@/store/app-store'

export function useCustomPlanes() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['custom-planes', user?.id],
    queryFn: () => getUserCustomPlanes(user!.id),
    enabled: !!user,
  })
}

export function useCustomPlane(id: string | undefined) {
  return useQuery({
    queryKey: ['custom-plane', id],
    queryFn: () => getCustomPlane(id!),
    enabled: !!id,
  })
}

export function useCreateCustomPlane() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomPlaneInput) =>
      createCustomPlane(user!.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useUpdateCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; input: Partial<CustomPlaneInput> }) =>
      updateCustomPlane(params.id, params.input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['custom-plane', vars.id] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useDeleteCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; imagePath: string | null }) => {
      if (params.imagePath) {
        await deletePlaneImage(params.imagePath)
      }
      await deleteCustomPlane(params.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useUploadPlaneImage() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (file: File) => uploadPlaneImage(user!.id, file),
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/custom-planes/ src/hooks/useCustomPlanes.ts
git commit -m "feat: add custom planes types, queries, storage helpers, and hooks"
```

---

### Task 3: Corpus Merger Hook (useFullPlaneCorpus)

**Files:**
- Modify: `src/hooks/useCardCorpus.ts`

This is the key integration task. Create a new hook `useFullPlaneCorpus()` that merges Scryfall planes with custom planes, converting `CustomPlane` records into `PlaneCard` objects. This hook is what the deck builder and setup page will use.

- [ ] **Step 1: Add imports and the merger hook**

Add these imports at the top of `src/hooks/useCardCorpus.ts`:

```typescript
import { useCustomPlanes } from '@/hooks/useCustomPlanes'
import type { CustomPlane } from '@/lib/custom-planes/types'
import { getImageUrl } from '@/lib/custom-planes/storage'
```

Add this conversion function after the existing `toSchemeCard` function:

```typescript
function customToPlaneCard(custom: CustomPlane): PlaneCard {
  // Build oracle text by combining static ability + chaos text
  const oracleText = custom.chaos_text
    ? `${custom.oracle_text}\n\nWhenever you roll {CHAOS}, ${custom.chaos_text}`
    : custom.oracle_text

  const imageUrl = custom.image_path
    ? getImageUrl(custom.image_path)
    : '/images/custom-plane-placeholder.png'

  return {
    id: `custom-${custom.id}`,
    name: custom.name,
    type_line: custom.type_line,
    card_type: 'plane',
    oracle_text: oracleText,
    flavor_text: custom.flavor_text ?? undefined,
    image_uris: {
      normal: imageUrl,
      large: imageUrl,
      art_crop: imageUrl,
      border_crop: imageUrl,
      small: imageUrl,
      png: imageUrl,
    },
    set_name: 'Custom',
    set: 'custom',
    chaos_effect_type: 'standard',
    chaos_effect_config: null,
  }
}
```

Add this hook at the end of the file:

```typescript
export function useFullPlaneCorpus() {
  const { data: scryfall, isLoading: scryfallLoading } = usePlaneCorpus()
  const { data: custom, isLoading: customLoading } = useCustomPlanes()

  const merged = useMemo(() => {
    if (!scryfall) return undefined
    const customCards = (custom ?? []).map(customToPlaneCard)
    return [...scryfall, ...customCards]
  }, [scryfall, custom])

  return {
    data: merged,
    isLoading: scryfallLoading || customLoading,
  }
}
```

Also add `useMemo` to the React import at the top if not already present:

```typescript
// Check if useMemo is imported — the file likely doesn't import it yet
// If not, the hook file is 'use client' so add it
```

Note: The file does NOT currently import `useMemo` from React (it only uses `useQuery`). You need to add it. Add at the very top of the file, before the existing imports:

```typescript
import { useMemo } from 'react'
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCardCorpus.ts
git commit -m "feat: add useFullPlaneCorpus hook merging Scryfall and custom planes"
```

---

### Task 4: Custom Plane Preview Component

**Files:**
- Create: `src/components/custom-plane-preview.tsx`

A live preview card that shows how the custom plane will look. Displays name, type line, oracle text, chaos text, and uploaded image (or placeholder). This is used on the builder form.

- [ ] **Step 1: Create the preview component**

```tsx
// src/components/custom-plane-preview.tsx
'use client'

import Image from 'next/image'

interface CustomPlanePreviewProps {
  name: string
  typeLine: string
  oracleText: string
  chaosText: string
  flavorText?: string
  imageUrl: string | null
}

export function CustomPlanePreview({
  name,
  typeLine,
  oracleText,
  chaosText,
  flavorText,
  imageUrl,
}: CustomPlanePreviewProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      {/* Card image */}
      <div className="relative w-full aspect-[16/9] bg-black/20">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name || 'Custom plane preview'}
            fill
            className="object-cover"
            sizes="(max-width: 520px) 100vw, 520px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-1">
              <span className="text-[28px]">🖼️</span>
              <p
                className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Upload card art
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card details */}
      <div className="p-4 space-y-2">
        {/* Name + type */}
        <div>
          <h3
            className="text-[16px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {name || 'Untitled Plane'}
          </h3>
          <p
            className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {typeLine || 'Plane — Custom'}
          </p>
        </div>

        {/* Oracle text */}
        {oracleText && (
          <p
            className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {oracleText}
          </p>
        )}

        {/* Chaos ability */}
        {chaosText && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-[var(--color-border)]">
            <span className="text-[14px] mt-0.5">🌀</span>
            <p
              className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {chaosText}
            </p>
          </div>
        )}

        {/* Flavor text */}
        {flavorText && (
          <p
            className="text-[11px] italic text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)] pt-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {flavorText}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/custom-plane-preview.tsx
git commit -m "feat: add CustomPlanePreview component for builder form"
```

---

### Task 5: Custom Planes List Page

**Files:**
- Create: `src/app/custom-planes/page.tsx`
- Create: `src/app/custom-planes/layout.tsx`

Shows all user's custom planes in a list. Each card shows the name, image thumbnail, and edit/delete buttons. Includes a "Create New" CTA. Accessible via a link from the decks page.

- [ ] **Step 1: Create the layout**

```typescript
// src/app/custom-planes/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom Planes',
  openGraph: {
    title: 'Custom Planes | PlaneChaser',
    description: 'Create and manage your custom plane cards.',
  },
}

export default function CustomPlanesLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 2: Create the list page**

The page should:
- Show a grid of custom plane cards (name, thumbnail, edit/delete buttons)
- Show empty state with CTA to create first plane
- Link to `/custom-planes/new` for creation
- Link to `/custom-planes/[id]/edit` for editing
- Confirm before delete (window.confirm)
- Delete also removes image from storage
- Use existing styling conventions (CSS vars, font families, pb-nav, ambient background)
- Sticky header with back button (ArrowLeft → router.back())
- Use Lucide icons: Plus, Pencil, Trash2, ArrowLeft, Wand2
- Use Framer Motion for list animation (staggered entrance)

The grid should show plane image thumbnails in 2-column layout with:
- Image at top (aspect-[16/9], object-cover)
- Name below
- Edit/Delete icon buttons in top-right corner overlay

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/custom-planes/
git commit -m "feat: add custom planes list page with create/edit/delete"
```

---

### Task 6: Custom Plane Builder Form (Create + Edit)

**Files:**
- Create: `src/app/custom-planes/new/page.tsx`
- Create: `src/app/custom-planes/[id]/edit/page.tsx`

The builder form is the core feature. It has:
- **Name** input (required, max 100 chars)
- **Type line** input (default "Plane — Custom", editable for subtype like "Plane — Mountain")
- **Oracle text** textarea (the plane's static ability)
- **Chaos text** textarea (what happens when chaos is rolled — displayed with 🌀 prefix)
- **Flavor text** textarea (optional, italic)
- **Image upload** — file input accepting jpg/png/webp, max 5MB, shows preview
- **Live preview** — `CustomPlanePreview` component showing current state in real time
- **Save** button — creates/updates the custom plane, uploads image if changed
- **Cancel** button — navigates back

The create page (`/custom-planes/new`) and edit page (`/custom-planes/[id]/edit`) share the same form logic. The edit page pre-fills from the existing custom plane.

**Important implementation details:**
- Image upload uses `useUploadPlaneImage()` hook — upload happens on save, not on file select
- For edit mode, use `useCustomPlane(id)` to load existing data
- After save, navigate to `/custom-planes`
- The preview updates live as the user types (controlled inputs)
- Validate: name is required and non-empty
- Use `getImageUrl()` from storage helpers to display existing images in edit mode
- File input should be styled as a button/drop zone, not a raw input
- Max image size: 5MB (validated client-side before upload)

**Styling:**
- `'use client'` at top
- Sticky header with back button and title ("Create Custom Plane" or "Edit Custom Plane")
- Form and preview side-by-side on desktop (md: breakpoint), stacked on mobile (preview on top)
- CSS vars, font families, pb-nav, ambient background — all standard patterns
- Lucide icons: ArrowLeft, Save, Upload, Image as ImageIcon
- Form inputs use border-[var(--color-border)] bg-[var(--color-surface)]/60 rounded-xl styling

- [ ] **Step 1: Create the builder form as a shared component within the new page**

Create `src/app/custom-planes/new/page.tsx` with the full form. This is the create mode.

- [ ] **Step 2: Create the edit page**

Create `src/app/custom-planes/[id]/edit/page.tsx`. This page loads the existing custom plane via `useCustomPlane(id)`, pre-fills the form, and uses `useUpdateCustomPlane()` on save. It should share the same visual structure as the create page.

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/custom-planes/new/ src/app/custom-planes/\[id\]/
git commit -m "feat: add custom plane builder form with live preview and image upload"
```

---

### Task 7: Deck Builder + Setup Integration

**Files:**
- Modify: `src/app/decks/[id]/page.tsx`
- Modify: `src/app/setup/page.tsx`
- Modify: `src/app/decks/page.tsx`

This task connects custom planes to the game flow:

1. **Deck builder** (`src/app/decks/[id]/page.tsx`): Replace `usePlaneCorpus()` with `useFullPlaneCorpus()` so custom planes appear in the card list when building a deck. Custom planes should be visually distinguished (a small "Custom" badge or different border style).

2. **Setup page** (`src/app/setup/page.tsx`): Replace `usePlaneCorpus()` with `useFullPlaneCorpus()` so custom planes in a saved deck are resolved correctly when starting a game.

3. **Decks list page** (`src/app/decks/page.tsx`): Add a "Custom Planes" link/button that navigates to `/custom-planes`. Place it near the top of the page, after the tabs but before the deck list.

**Key changes for deck builder (`src/app/decks/[id]/page.tsx`):**

Change the import:
```typescript
// Old:
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
// New:
import { useFullPlaneCorpus } from '@/hooks/useCardCorpus'
```

Change the hook call:
```typescript
// Old:
const { data: corpus, isLoading: corpusLoading } = usePlaneCorpus()
// New:
const { data: corpus, isLoading: corpusLoading } = useFullPlaneCorpus()
```

**Key changes for setup page (`src/app/setup/page.tsx`):**

Same pattern — replace `usePlaneCorpus` import and hook call with `useFullPlaneCorpus`.

**Key changes for decks list page (`src/app/decks/page.tsx`):**

Add a link to custom planes. After the plane/scheme tab bar, add:
```tsx
<button
  onClick={() => router.push('/custom-planes')}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors border border-[var(--color-accent)]/30"
  style={{ fontFamily: 'var(--font-body)' }}
>
  <Wand2 className="w-3 h-3" />
  Custom Planes
</button>
```

Add `Wand2` to the lucide-react imports.

- [ ] **Step 1: Update deck builder to use full corpus**

- [ ] **Step 2: Update setup page to use full corpus**

- [ ] **Step 3: Add custom planes link to decks list page**

- [ ] **Step 4: Run build to verify**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/decks/ src/app/setup/page.tsx
git commit -m "feat: integrate custom planes into deck builder and game setup"
```

---

### Task 8: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: Compiles successfully with no TypeScript errors

- [ ] **Step 3: Verify new routes exist**

New routes that should be accessible:
- `/custom-planes` — List of user's custom planes
- `/custom-planes/new` — Builder form (create mode)
- `/custom-planes/[id]/edit` — Builder form (edit mode)

- [ ] **Step 4: Verify integration points**

- Deck builder shows custom planes in the card grid
- Setup page includes custom planes when using a saved deck
- Decks page has a "Custom Planes" link
- Custom planes appear with `id: "custom-{uuid}"` prefix
- Card images load from Supabase Storage public URL

---

## Self-Review

### Spec Coverage
| Requirement | Task | Status |
|-------------|------|--------|
| `custom_planes` table in Supabase | Task 1 | ✅ |
| Image upload via Supabase Storage | Task 1 (bucket) + Task 2 (helpers) + Task 6 (form) | ✅ |
| Card builder form: name, oracle text, chaos text, image, preview | Task 4 (preview) + Task 6 (form) | ✅ |
| Integration with PlaneCard type | Task 3 (customToPlaneCard converter) | ✅ |
| Deck builder includes custom planes | Task 7 (useFullPlaneCorpus) | ✅ |
| Import from URL or image paste | — | DEFERRED (future iteration) |
| Sharing: public custom planes | — | DEFERRED (future iteration) |
| Moderation: flag/report system | — | DEFERRED (future iteration) |

### Placeholder scan
No TBD/TODO/placeholders found. Task 5 and Task 6 have high-level descriptions for the UI but include all required technical details (hooks, props, styling patterns, file paths).

### Type consistency
- `CustomPlane` type defined in Task 2, used consistently in Tasks 3, 5, 6
- `CustomPlaneInput` used by `createCustomPlane` and `updateCustomPlane`
- `customToPlaneCard` converts to `PlaneCard` interface with `id: "custom-${id}"`
- `useFullPlaneCorpus` returns `PlaneCard[]` (same type as `usePlaneCorpus`)
- `getImageUrl` used in both Task 3 (converter) and Task 6 (edit form preview)
- Storage bucket name `custom-plane-images` consistent between migration and helpers
