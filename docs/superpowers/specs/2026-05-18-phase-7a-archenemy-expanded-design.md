# Phase 7a: Archenemy Expanded

## Goal

Expand the Archenemy format with a scheme deck builder, multi-plane win conditions with symmetric steal mechanics, back-to-back prevention, and manual archenemy designation. Per-player plane decks (AE-03/04/05) are deferred to Phase 7b.

## Scope

### In scope (Phase 7a)

| ID | Requirement |
|----|-------------|
| AE-02 | Archenemy triggered by pod threshold OR host manual designation |
| AE-09 | Archenemy wins: steals 1 conquered plane from each ally (transfer) |
| AE-10 | Allies win: each ally steals 1 plane from archenemy (transfer) + collectively delete 1 additional plane (return to multiverse) |
| AE-11 | Back-to-back prevention: warn if same player, show full picker with override |
| AE-12 | Scheme deck builder: full CRUD with presets, mirroring plane deck pattern |

### Out of scope (Phase 7b — future)

| ID | Requirement |
|----|-------------|
| AE-03 | Archenemy builds deck from their owned planes |
| AE-04 | Allies bring their own 10-card deck from their owned planes |
| AE-05 | Per-player deck tracking: each player rolls against their own deck |

### Already implemented (no changes needed)

| ID | Status |
|----|--------|
| AE-01 | Game type indicator ("ARCHENEMY" badge in header) |
| AE-06 | Scheme deck: archenemy draws scheme at start of turn |
| AE-07 | Ongoing schemes persist visually until dismissed (with undo) |
| AE-08 | One-shot schemes: shown, resolved, dismissed |

---

## 1. Scheme Deck Builder

### 1.1 Data Layer

**New table: `user_scheme_decks`**

```sql
CREATE TABLE user_scheme_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL,
  scheme_ids  TEXT[] NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_scheme_decks_user_id ON user_scheme_decks(user_id);
CREATE UNIQUE INDEX idx_user_scheme_decks_one_default
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
```

Mirrors `user_decks` exactly: UUID PK, user FK, name, array of Scryfall IDs, default flag, timestamps, same RLS pattern.

**New column on `pods`:**

```sql
ALTER TABLE pods ADD COLUMN last_archenemy_user_id UUID REFERENCES auth.users;
```

### 1.2 Queries

New file: `src/lib/scheme-decks/queries.ts`

| Function | Purpose |
|----------|---------|
| `getUserSchemeDecks(userId)` | All user's scheme decks, newest first |
| `getSchemeDeck(deckId)` | Single deck by ID |
| `createSchemeDeck(userId, name, schemeIds, isDefault?)` | Create new scheme deck |
| `updateSchemeDeck(deckId, updates)` | Update name and/or scheme_ids |
| `deleteSchemeDeck(deckId)` | Delete by ID |
| `createDefaultSchemeDeck(userId, allSchemeIds)` | Random 20-scheme deck marked as default |

New file: `src/lib/scheme-decks/types.ts`

```typescript
interface UserSchemeDeck {
  id: string
  user_id: string
  name: string
  scheme_ids: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}
```

### 1.3 Hooks

New file: `src/hooks/useSchemeDecks.ts`

| Hook | Query Key | Purpose |
|------|-----------|---------|
| `useUserSchemeDecks()` | `['scheme-decks', userId]` | List all user scheme decks |
| `useSchemeDeck(deckId)` | `['scheme-deck', deckId]` | Single deck |
| `useCreateSchemeDeck()` | Invalidates `['scheme-decks']` | Create mutation |
| `useUpdateSchemeDeck()` | Invalidates `['scheme-decks']`, `['scheme-deck', id]` | Update mutation |
| `useDeleteSchemeDeck()` | Invalidates `['scheme-decks']` | Delete mutation |
| `useCreateDefaultSchemeDeck()` | Invalidates `['scheme-decks']` | Auto-generate default |

### 1.4 Scheme Deck List Page

**Route:** `/scheme-decks`

Same layout as `/decks`:
- Header: "My Scheme Decks" title + "New Deck" button
- Auto-creates a default 20-scheme deck if user has none and scheme corpus is loaded
- Create form: name input + optional "Start from template" selector (Aggressive, Balanced, Chaos)
- Deck cards: name, scheme count, star for default, delete (non-default only)
- Minimum deck size: 20 schemes

**Preset templates** (used as starting points when creating, not permanent fixtures):
- **Aggressive:** Heavy on one-shot damage/disruption schemes
- **Balanced:** Mix of ongoing and one-shot
- **Chaos:** Maximum randomness and board-shaking effects

Template contents are defined in code (`src/lib/scheme-decks/presets.ts`) and populated into the new deck's scheme_ids on creation. The user can then customize in the builder.

### 1.5 Scheme Deck Builder Page

**Route:** `/scheme-decks/[id]`

Same pattern as `/decks/[id]`:
- Sticky header: back button, editable name, Save button (disabled if < 20 schemes)
- Search bar: filters by name and oracle_text
- Filter toggle: All / Ongoing / One-shot (replaces Planes/Phenomena)
- Card grid: **portrait orientation** (5/7 aspect ratio, no rotation — scheme cards are naturally portrait, unlike plane cards which display landscape at 3/2 with 90° rotation)
- Cards show: scheme image, "Ongoing" badge where applicable, checkmark when selected
- Selected panel (expandable): chips of selected schemes, click to remove
- Minimum 20 schemes to save

---

## 2. Multi-plane Win Conditions

### 2.1 Design Decision: Symmetric Steal

Both outcomes use transfer (steal) mechanics rather than the original spec's asymmetric delete-on-ally-win approach. This rewards allies for winning and creates balanced incentive.

**Archenemy wins:**
1. Host taps "Archenemy Won"
2. Sequential per-ally loop:
   - Header: "{Archenemy} selects a plane to steal from {Ally Name}"
   - Scrollable list of ally's conquered planes (from `conquered_planes` table)
   - Archenemy picks one → confirm → next ally
   - "Skip" shown if ally has 0 conquered planes
3. Each selected plane: `conquered_planes` row updated — `user_id` changed to archenemy's, `conquered_from_user_id` set to the ally's ID
4. Summary screen: "{Archenemy} stole {N} planes!" with list of what was taken from whom
5. "End Game" button

**Allies win:**
1. Host taps "Team Won"
2. Sequential per-ally loop:
   - Header: "{Ally Name} steals a plane from {Archenemy}"
   - Scrollable list of archenemy's conquered planes (diminishing as allies pick)
   - Ally picks one → confirm → next ally
   - "Skip" option if ally doesn't want to claim
3. Each selected plane: `conquered_planes` row updated — `user_id` changed to the ally's, `conquered_from_user_id` set to archenemy's ID
4. **Collective deletion step:**
   - Header: "Return a plane to the multiverse"
   - Show archenemy's remaining conquered planes
   - Host picks one (group discusses, host executes on shared device) → confirm
   - "Skip" option if group doesn't want to delete
   - Selected plane: `conquered_planes` row DELETED (returns to unowned pool)
5. Summary screen: "Archenemy dethroned! {N} planes stolen, 1 returned to the multiverse"
6. "End Game" button

### 2.2 Queries

| Function | Status | Purpose |
|----------|--------|---------|
| `stealConqueredPlane(conquestId, newOwnerId, podId)` | EXISTS | Deletes old row, inserts new with `conquered_from_user_id` set to previous owner. Reused for all steal/transfer operations. |
| `deleteConqueredPlane(conquestId)` | NEW | Delete row entirely (return to unowned pool). Used for collective deletion step. |
| `getPlayerConquests(userId, podId)` | EXISTS as `getUserConquests(userId, podId?)` | Already fetches all conquered planes for a user, optionally filtered by pod. |

### 2.3 Component Changes

**`archenemy-end-dialog.tsx` — full rewrite**

New props:
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

Internal state machine:
```
'choose' → 'archenemy-wins-loop' → 'summary' → done
'choose' → 'allies-win-loop' → 'collective-delete' → 'summary' → done
```

The per-ally loop uses an `allyIndex` counter to step through allies sequentially. Each step shows one ally's selection UI (reusing the plane picker pattern from `dethrone-dialog.tsx`).

**`dethrone-dialog.tsx` — refactored into shared component**

Rename to `plane-picker.tsx` — a reusable component for selecting a conquered plane from a list:

```typescript
interface PlanePickerProps {
  title: string
  subtitle: string
  conquests: ConqueredPlane[]
  onSelect: (conquestId: string) => void
  onSkip: () => void
  skipLabel?: string
  selectLabel?: string
}
```

Used by both the archenemy-wins loop (archenemy picks from ally) and allies-win loop (ally picks from archenemy), and the collective deletion step.

---

## 3. Back-to-back Prevention

### 3.1 Database

`last_archenemy_user_id` column on `pods` table (added in the migration above). Updated after every archenemy game ends, regardless of outcome.

### 3.2 Query

| Function | Purpose |
|----------|---------|
| `updateLastArchenemy(podId, userId)` | Sets `last_archenemy_user_id` on the pod |

Called at game end in the archenemy end dialog's confirm handler.

### 3.3 Setup Page Logic

When archenemy mode is triggered (threshold met or manual toggle):

1. Fetch `last_archenemy_user_id` from pod data (already available via `useUserPods()`)
2. Identify eligible players (those meeting threshold, or all players if manual mode)
3. **If one eligible player and NOT the last archenemy:** auto-designate, no picker needed
4. **If one eligible player and IS the last archenemy:** show warning banner + full picker:
   - Warning: "{Name} was the Archenemy last game. Consider designating a different Archenemy."
   - List of all eligible players with conquest counts
   - "Override: Use {Name} anyway" button
5. **If multiple eligible players:** show picker (no warning, just "Choose the Archenemy")
6. **Manual mode (no threshold met):** show all players in picker, host designates freely

### 3.4 Archenemy Picker Component

New component: `archenemy-picker.tsx`

```typescript
interface ArchenemyPickerProps {
  eligiblePlayers: { id: string; display_name: string; conquered_count: number }[]
  lastArchenemyId: string | null
  onSelect: (playerId: string) => void
  onCancel: () => void
}
```

- Shows each eligible player as a selectable row with their name and conquest count
- Warning badge on the last archenemy player
- Confirm button to proceed with selection

---

## 4. Setup Flow (Integrated)

### 4.1 Current Flow (unchanged for non-archenemy games)

Setup page → select plane deck → configure players → start game

### 4.2 New Archenemy Flow

1. **Archenemy trigger:**
   - Auto: leaderboard check identifies threshold players → banner appears
   - Manual: host toggles "Archenemy Mode" switch (new UI element)
2. **Archenemy designation:** picker appears (Section 3.4) with back-to-back warning if applicable
3. **Scheme deck selection:**
   - Dropdown of archenemy's saved scheme decks
   - "All schemes (default)" option as first choice — backwards compatible
   - Link to `/scheme-decks` to create/edit
   - If no saved scheme decks exist, silently defaults to full corpus (no friction for first-timers)
4. **Game starts:** `ArchenemyState` initialized with:
   - Selected player as archenemy
   - Scheme deck from selection (saved deck's schemes or full corpus)
   - All existing game state unchanged

### 4.3 Setup Page Changes

New UI elements on setup page:
- "Archenemy Mode" toggle (visible when pod is active and players are configured)
- Archenemy auto-detection banner (when threshold is met)
- Archenemy picker (inline, replaces current auto-designation)
- Scheme deck selector (appears after archenemy is designated)

---

## 5. Data Flow Summary

```
Setup Page
├─ usePodLeaderboard(podId, threshold) → detect archenemy candidates
├─ Pod.last_archenemy_user_id → back-to-back check
├─ Archenemy Picker → host selects archenemy
├─ useUserSchemeDecks() → list scheme decks for selected archenemy
├─ Scheme deck selector → pick scheme deck
├─ Start Game → initialize ArchenemyState with selected scheme deck
│
Game Page (NO CHANGES)
├─ Scheme drawing, ongoing/one-shot display, abandon — all unchanged
│
Archenemy End Dialog (REWRITTEN)
├─ 'choose' → Archenemy Won or Team Won
├─ Sequential per-ally plane picker loops
├─ Collective deletion step (allies win only)
├─ transferConqueredPlane() / deleteConqueredPlane() mutations
├─ updateLastArchenemy() → pod updated
├─ Summary → End Game
│
Scheme Deck Pages (NEW)
├─ /scheme-decks → list, create, delete
├─ /scheme-decks/[id] → builder with search, filter, select
```

---

## 6. Migration Plan

Single migration file: `010_scheme_decks_and_archenemy.sql`

```sql
-- Scheme deck table
CREATE TABLE user_scheme_decks ( ... );
-- Indexes and RLS policies

-- Back-to-back prevention
ALTER TABLE pods ADD COLUMN IF NOT EXISTS last_archenemy_user_id UUID REFERENCES auth.users;
```

---

## 7. Card Display Convention

| Card type | Orientation | Aspect ratio | Rotation |
|-----------|-------------|--------------|----------|
| Plane | Landscape | 3/2 | 90° (cards are stored portrait, displayed rotated) |
| Phenomenon | Portrait | 5/7 | None |
| Scheme | Portrait | 5/7 | None |

Scheme cards are naturally portrait and display portrait throughout the application (scheme deck builder, scheme card component in-game). This is consistent with phenomena cards.

---

## 8. Files Changed / Created

### New files
- `supabase/migrations/010_scheme_decks_and_archenemy.sql`
- `src/lib/scheme-decks/queries.ts`
- `src/lib/scheme-decks/types.ts`
- `src/lib/scheme-decks/presets.ts`
- `src/hooks/useSchemeDecks.ts`
- `src/app/scheme-decks/page.tsx`
- `src/app/scheme-decks/[id]/page.tsx`
- `src/components/archenemy-picker.tsx`
- `src/components/plane-picker.tsx`

### Modified files
- `src/components/archenemy-end-dialog.tsx` — full rewrite for multi-step win conditions
- `src/components/dethrone-dialog.tsx` — removed (replaced by `plane-picker.tsx`)
- `src/app/setup/page.tsx` — archenemy mode toggle, picker, scheme deck selector
- `src/lib/pods/queries.ts` — `deleteConqueredPlane()` (new), `updateLastArchenemy()` (new). Reuses existing `stealConqueredPlane()` and `getUserConquests()`.
- `src/hooks/usePods.ts` — new hooks for `deleteConqueredPlane` and `updateLastArchenemy` mutations. Reuses existing `useStealPlane()` and `useUserConquests()`.
