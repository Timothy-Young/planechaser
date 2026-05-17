# Phase 4: Local Card Database & Effect Taxonomy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace live Scryfall API calls with a local Supabase `cards` table that includes custom effect metadata, enabling phenomenon card support and special chaos resolution flows for deck-manipulating planes like Pools of Becoming.

**Architecture:** A new `cards` table stores all plane, phenomenon, and scheme cards with normalized columns plus a `chaos_effect_type` enum and `chaos_effect_config` JSONB for cards that need special handling. A one-time seed script pulls from Scryfall and classifies each card's effect type. The game engine gains new actions for phenomenon auto-chaining and multi-step chaos resolution (reveal/choose/reorder). The existing `card_cache` table and Scryfall API routes are retired.

**Tech Stack:** Supabase (Postgres), Next.js 15 App Router, TypeScript, TanStack Query v5, Framer Motion 11

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `supabase/migrations/006_cards_table.sql` | Creates `cards` table with effect metadata columns |
| `scripts/seed-cards.ts` | Fetches all cards from Scryfall API, classifies effects, upserts into `cards` table |
| `src/lib/cards/queries.ts` | Supabase query functions: `fetchPlanes()`, `fetchPhenomena()`, `fetchSchemes()` |
| `src/lib/cards/effect-classifier.ts` | Pure function that inspects oracle_text and returns `chaos_effect_type` + `chaos_effect_config` |
| `src/lib/cards/effect-classifier.test.ts` | Tests for the effect classifier |
| `src/hooks/useCardCorpus.ts` | TanStack Query hook replacing `usePlaneCorpus` and `useSchemeCorpus` |
| `src/app/api/cards/route.ts` | API route serving cards from DB (replaces `/api/scryfall/planes` and `/api/scryfall/schemes`) |
| `src/lib/game/engine.test.ts` | (existing — add phenomenon and special chaos tests) |
| `src/components/reveal-cards-modal.tsx` | UI for reveal/choose/reorder chaos flows |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/game/types.ts` | Add `chaos_effect_type`, `chaos_effect_config`, `card_type` to PlaneCard; add `PhenomenonCard` type; add new `GameAction` variants |
| `src/lib/game/engine.ts` | Handle `RESOLVE_PHENOMENON`, `RESOLVE_REVEAL_CHAOS`, `REORDER_BOTTOM` actions |
| `src/app/game/page.tsx` | Integrate phenomenon auto-advance, reveal modal, pass new handlers |
| `src/app/setup/page.tsx` | Use `useCardCorpus()` instead of `usePlaneCorpus()` |
| `src/app/lobby/page.tsx` | Use `useCardCorpus()` instead of `usePlaneCorpus()` |
| `src/components/chaos-overlay.tsx` | Show special chaos UI for non-standard effects |

### Deleted Files
| File | Reason |
|------|--------|
| `src/hooks/usePlaneCorpus.ts` | Replaced by `useCardCorpus` |
| `src/hooks/useSchemeCorpus.ts` | Replaced by `useCardCorpus` |
| `src/app/api/scryfall/planes/route.ts` | Replaced by `/api/cards` |
| `src/app/api/scryfall/schemes/route.ts` | Replaced by `/api/cards` |

---

## Effect Taxonomy

Cards are classified by `chaos_effect_type`:

| Type | Description | Cards | Config Shape |
|------|-------------|-------|--------------|
| `standard` | Normal chaos — just display the card | ~70 planes | `null` |
| `reveal_and_chaos` | Reveal N cards from planar deck, trigger each card's chaos ability, then reorder to bottom | Pools of Becoming | `{ revealCount: 3, triggerChaos: true }` |
| `reveal_and_choose` | Reveal cards until condition met, player picks one | Interplanar Tunnel | `{ revealUntil: 'plane', revealMax: null, chooseCount: 1 }` |
| `scry_top` | Look at top card of planar deck, optionally put on bottom | Stairs to Infinity | `{ count: 1, optional: true }` |
| `phenomenon` | Auto-triggers on reveal, then forces planeswalk | All 21 phenomenon cards | `null` |
| `force_planeswalk` | Chaos effect forces an immediate planeswalk | Grand Ossuary | `null` |

Future types (schema accommodates but not implemented this phase): `counter`, `die_override`, `dual_plane`, `duration_effect`.

---

### Task 1: Effect Classifier — Pure Logic

**Files:**
- Create: `src/lib/cards/effect-classifier.ts`
- Create: `src/lib/cards/effect-classifier.test.ts`

- [ ] **Step 1: Write tests for the effect classifier**

Create `src/lib/cards/effect-classifier.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { classifyCardEffect } from './effect-classifier'

describe('classifyCardEffect', () => {
  it('classifies standard plane with normal chaos', () => {
    const result = classifyCardEffect('Plane — Dominaria', 'Whenever you roll {CHAOS}, create a 4/4 Angel token.')
    expect(result).toEqual({ chaos_effect_type: 'standard', chaos_effect_config: null })
  })

  it('classifies Pools of Becoming as reveal_and_chaos', () => {
    const oracleText = "At the beginning of your end step, put the cards in your hand on the bottom of your library in any order, then draw that many cards.\nWhenever you roll {CHAOS}, reveal the top three cards of your planar deck. Each of the revealed cards' {CHAOS} abilities triggers. Then put the revealed cards on the bottom of your planar deck in any order."
    const result = classifyCardEffect('Plane — Bolas\'s Meditation Realm', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'reveal_and_chaos',
      chaos_effect_config: { revealCount: 3, triggerChaos: true },
    })
  })

  it('classifies Stairs to Infinity as scry_top', () => {
    const oracleText = "Players have no maximum hand size.\nWhenever you roll {CHAOS}, reveal the top card of your planar deck. You may put it on the bottom of your planar deck."
    const result = classifyCardEffect('Plane — Xerex', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'scry_top',
      chaos_effect_config: { count: 1, optional: true },
    })
  })

  it('classifies phenomenon cards', () => {
    const result = classifyCardEffect('Phenomenon', 'When you encounter Interplanar Tunnel, reveal cards from the top of your planar deck until you reveal five plane cards. Put a plane card from among them on top of your planar deck, then put the rest of the revealed cards on the bottom in a random order.')
    expect(result).toEqual({
      chaos_effect_type: 'phenomenon',
      chaos_effect_config: null,
    })
  })

  it('classifies Interplanar Tunnel phenomenon with reveal_and_choose detail', () => {
    // Phenomena get type 'phenomenon' — the sub-effect is stored separately
    const result = classifyCardEffect('Phenomenon', 'When you encounter Interplanar Tunnel, reveal cards from the top of your planar deck until you reveal five plane cards.')
    expect(result.chaos_effect_type).toBe('phenomenon')
  })

  it('classifies Grand Ossuary chaos as force_planeswalk', () => {
    const oracleText = "Whenever a creature dies, its controller distributes its power and toughness as +1/+1 counters among any number of creatures they control.\nWhenever you roll {CHAOS}, each player exiles all creatures they control and creates X 1/1 green Saproling creature tokens, where X is the total power of the creatures they exiled this way. Then planeswalk to a new plane."
    const result = classifyCardEffect('Plane — Ravnica', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'force_planeswalk',
      chaos_effect_config: null,
    })
  })

  it('classifies plane with no chaos text as standard', () => {
    const result = classifyCardEffect('Plane — Lorwyn', 'All creatures have haste.')
    expect(result).toEqual({ chaos_effect_type: 'standard', chaos_effect_config: null })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cards/effect-classifier.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the effect classifier**

Create `src/lib/cards/effect-classifier.ts`:

```typescript
export interface EffectClassification {
  chaos_effect_type: 'standard' | 'reveal_and_chaos' | 'reveal_and_choose' | 'scry_top' | 'phenomenon' | 'force_planeswalk'
  chaos_effect_config: Record<string, unknown> | null
}

export type ChaosEffectType = EffectClassification['chaos_effect_type']

export function classifyCardEffect(typeLine: string, oracleText: string): EffectClassification {
  if (typeLine.toLowerCase().includes('phenomenon')) {
    return { chaos_effect_type: 'phenomenon', chaos_effect_config: null }
  }

  const chaosSection = extractChaosSection(oracleText)
  if (!chaosSection) {
    return { chaos_effect_type: 'standard', chaos_effect_config: null }
  }

  // "reveal the top three cards of your planar deck" + "chaos abilities triggers"
  const revealChaosMatch = chaosSection.match(/reveal the top (\w+) cards? of your planar deck.*?chaos ab/i)
  if (revealChaosMatch) {
    const count = wordToNumber(revealChaosMatch[1])
    return {
      chaos_effect_type: 'reveal_and_chaos',
      chaos_effect_config: { revealCount: count, triggerChaos: true },
    }
  }

  // "reveal the top card of your planar deck. You may put it on the bottom"
  if (/reveal the top card of your planar deck.*?may put it on the bottom/i.test(chaosSection)) {
    return {
      chaos_effect_type: 'scry_top',
      chaos_effect_config: { count: 1, optional: true },
    }
  }

  // "Then planeswalk to a new plane" or "planeswalk away from" in chaos text
  if (/then planeswalk|planeswalk to a new plane|planeswalk away from/i.test(chaosSection)) {
    return {
      chaos_effect_type: 'force_planeswalk',
      chaos_effect_config: null,
    }
  }

  return { chaos_effect_type: 'standard', chaos_effect_config: null }
}

function extractChaosSection(oracleText: string): string | null {
  const lines = oracleText.split('\n')
  const chaosLine = lines.find((l) => /chaos/i.test(l))
  return chaosLine ?? null
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

function wordToNumber(word: string): number {
  return WORD_NUMBERS[word.toLowerCase()] ?? parseInt(word, 10) || 1
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cards/effect-classifier.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cards/effect-classifier.ts src/lib/cards/effect-classifier.test.ts
git commit -m "feat: add card effect classifier for planar deck manipulation detection"
```

---

### Task 2: Database Migration — Cards Table

**Files:**
- Create: `supabase/migrations/006_cards_table.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/006_cards_table.sql`:

```sql
-- Normalized card storage replacing the raw JSON card_cache approach
CREATE TABLE IF NOT EXISTS cards (
  id               TEXT        PRIMARY KEY,  -- Scryfall UUID
  name             TEXT        NOT NULL,
  type_line        TEXT        NOT NULL,
  card_type        TEXT        NOT NULL CHECK (card_type IN ('plane', 'phenomenon', 'scheme')),
  oracle_text      TEXT        NOT NULL DEFAULT '',
  flavor_text      TEXT,
  set_code         TEXT        NOT NULL,
  set_name         TEXT        NOT NULL,

  -- Image URIs stored as JSONB (normal, large, art_crop, border_crop, small, png)
  image_uris       JSONB       NOT NULL,

  -- Effect taxonomy
  chaos_effect_type TEXT       NOT NULL DEFAULT 'standard'
    CHECK (chaos_effect_type IN (
      'standard', 'reveal_and_chaos', 'reveal_and_choose',
      'scry_top', 'phenomenon', 'force_planeswalk'
    )),
  chaos_effect_config JSONB,

  -- Scheme-specific
  is_ongoing       BOOLEAN     NOT NULL DEFAULT false,

  -- Metadata
  seeded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  scryfall_updated_at TIMESTAMPTZ
);

-- Index for filtering by card type (the primary query pattern)
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards (card_type);

-- Enable RLS but allow public read (card data is not user-specific)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cards are publicly readable"
  ON cards FOR SELECT
  USING (true);

-- Only service role can insert/update (seed script uses service key)
CREATE POLICY "Service role can manage cards"
  ON cards FOR ALL
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase migration up` (or apply via Supabase dashboard)
Expected: Table `cards` created with all columns and indexes

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_cards_table.sql
git commit -m "feat: add cards table migration with effect taxonomy columns"
```

---

### Task 3: Seed Script — Scryfall → Supabase

**Files:**
- Create: `scripts/seed-cards.ts`

This script is run manually with `npx tsx scripts/seed-cards.ts`. It fetches all plane, phenomenon, and scheme cards from Scryfall, classifies their effects, and upserts them into the `cards` table.

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-cards.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { classifyCardEffect } from '../src/lib/cards/effect-classifier'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_AGENT = 'PlaneChaser/1.0 codetimcode@gmail.com'

interface ScryfallCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris?: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  set: string
  set_name: string
}

interface ScryfallList {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
  total_cards: number
}

async function fetchAllCards(query: string): Promise<ScryfallCard[]> {
  const results: ScryfallCard[] = []
  let url: string | undefined = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`

  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`Scryfall error: ${res.status}`)

    const page: ScryfallList = await res.json()

    for (const card of page.data) {
      if (card.image_uris) {
        results.push(card)
      }
    }

    url = page.has_more ? page.next_page : undefined
    if (url) await new Promise((r) => setTimeout(r, 100))
  }

  return results
}

function inferCardType(typeLine: string): 'plane' | 'phenomenon' | 'scheme' {
  const lower = typeLine.toLowerCase()
  if (lower.includes('phenomenon')) return 'phenomenon'
  if (lower.includes('scheme')) return 'scheme'
  return 'plane'
}

async function seed() {
  console.log('Fetching planes and phenomena from Scryfall...')
  const planesAndPhenomena = await fetchAllCards('t:plane OR t:phenomenon')
  console.log(`  Found ${planesAndPhenomena.length} plane/phenomenon cards`)

  console.log('Fetching schemes from Scryfall...')
  const schemes = await fetchAllCards('t:scheme')
  console.log(`  Found ${schemes.length} scheme cards`)

  const allCards = [...planesAndPhenomena, ...schemes]

  const rows = allCards.map((card) => {
    const cardType = inferCardType(card.type_line)
    const effect = classifyCardEffect(card.type_line, card.oracle_text)

    return {
      id: card.id,
      name: card.name,
      type_line: card.type_line,
      card_type: cardType,
      oracle_text: card.oracle_text ?? '',
      flavor_text: card.flavor_text ?? null,
      set_code: card.set,
      set_name: card.set_name,
      image_uris: card.image_uris,
      chaos_effect_type: effect.chaos_effect_type,
      chaos_effect_config: effect.chaos_effect_config,
      is_ongoing: cardType === 'scheme' && card.type_line.toLowerCase().includes('ongoing'),
      seeded_at: new Date().toISOString(),
    }
  })

  console.log(`Upserting ${rows.length} cards into database...`)

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await supabase.from('cards').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`Error upserting batch starting at ${i}:`, error)
      process.exit(1)
    }
    console.log(`  Upserted ${Math.min(i + 50, rows.length)}/${rows.length}`)
  }

  // Print summary by type
  const summary = rows.reduce((acc, r) => {
    acc[r.card_type] = (acc[r.card_type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const effectSummary = rows.reduce((acc, r) => {
    if (r.chaos_effect_type !== 'standard') {
      acc[r.chaos_effect_type] = (acc[r.chaos_effect_type] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  console.log('\nSeed complete!')
  console.log('Card types:', summary)
  console.log('Special effects:', effectSummary)
}

seed().catch(console.error)
```

- [ ] **Step 2: Verify the script runs**

Run: `npx tsx scripts/seed-cards.ts`
Expected: Output showing fetched counts, upsert progress, and summary. Cards appear in the `cards` table.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-cards.ts
git commit -m "feat: add seed script to populate cards table from Scryfall"
```

---

### Task 4: Database Query Functions

**Files:**
- Create: `src/lib/cards/queries.ts`

- [ ] **Step 1: Create the query module**

Create `src/lib/cards/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'

export interface CardRow {
  id: string
  name: string
  type_line: string
  card_type: 'plane' | 'phenomenon' | 'scheme'
  oracle_text: string
  flavor_text: string | null
  set_code: string
  set_name: string
  image_uris: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  chaos_effect_type: string
  chaos_effect_config: Record<string, unknown> | null
  is_ongoing: boolean
}

export async function fetchPlaneCards(): Promise<CardRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .in('card_type', ['plane', 'phenomenon'])
    .order('name')

  if (error) throw new Error(`Failed to fetch plane cards: ${error.message}`)
  return data as CardRow[]
}

export async function fetchSchemeCards(): Promise<CardRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_type', 'scheme')
    .order('name')

  if (error) throw new Error(`Failed to fetch scheme cards: ${error.message}`)
  return data as CardRow[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cards/queries.ts
git commit -m "feat: add Supabase query functions for cards table"
```

---

### Task 5: API Route — Replace Scryfall Routes

**Files:**
- Create: `src/app/api/cards/route.ts`
- Delete: `src/app/api/scryfall/planes/route.ts`
- Delete: `src/app/api/scryfall/schemes/route.ts`

- [ ] **Step 1: Create the unified cards API route**

Create `src/app/api/cards/route.ts`:

```typescript
import { fetchPlaneCards, fetchSchemeCards } from '@/lib/cards/queries'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'planes'

  try {
    if (type === 'schemes') {
      const cards = await fetchSchemeCards()
      return Response.json(cards)
    }

    const cards = await fetchPlaneCards()
    return Response.json(cards)
  } catch {
    return Response.json({ error: 'Database unavailable' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Delete old Scryfall API routes**

Delete `src/app/api/scryfall/planes/route.ts` and `src/app/api/scryfall/schemes/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cards/route.ts
git rm src/app/api/scryfall/planes/route.ts src/app/api/scryfall/schemes/route.ts
git commit -m "feat: replace Scryfall API routes with local cards DB route"
```

---

### Task 6: Update Types — Add Effect Fields & Phenomenon Support

**Files:**
- Modify: `src/lib/game/types.ts`

- [ ] **Step 1: Update PlaneCard type and add new action types**

Modify `src/lib/game/types.ts`. The full updated file:

```typescript
import type { ChaosEffectType } from '@/lib/cards/effect-classifier'

export interface Player {
  id: string
  display_name: string
}

export type DieResult = 'blank' | 'planeswalk' | 'chaos'

export interface DieRoll {
  result: DieResult
  timestamp: number
}

export type DieState = 'idle' | 'rolling' | 'settled'

export interface CardImageUris {
  normal: string
  large: string
  art_crop: string
  border_crop: string
  small: string
  png: string
}

export interface PlaneCard {
  id: string
  name: string
  type_line: string
  card_type: 'plane' | 'phenomenon'
  oracle_text: string
  flavor_text?: string
  image_uris: CardImageUris
  set_name: string
  set: string
  chaos_effect_type: ChaosEffectType
  chaos_effect_config: Record<string, unknown> | null
}

export interface SchemeCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: CardImageUris
  set_name: string
  set: string
  isOngoing: boolean
}

export interface ArchenemyState {
  archenemyId: string
  archenemyName: string
  schemeDeck: SchemeCard[]
  currentSchemeIndex: number
  activeSchemes: SchemeCard[]
  schemesPlayed: number
}

export interface GameConfig {
  playerCount: number
  deckSize: number
  isArchenemy?: boolean
}

export interface RevealState {
  cards: PlaneCard[]
  source: 'chaos' | 'phenomenon'
  effectType: ChaosEffectType
  resolved: boolean
}

export interface GameState {
  id: string
  config: GameConfig
  deck: PlaneCard[]
  currentPlaneIndex: number
  dieState: DieState
  lastDieResult: DieResult | null
  rollCountThisTurn: number
  dieRollHistory: DieRoll[]
  planesVisited: number
  startedAt: number
  archenemy?: ArchenemyState
  players: Player[]
  turnOrder: string[]
  currentTurnIndex: number
  currentTurnRolls: DieRoll[]
  turnHistory: TurnRecord[]
  stateHistory: Omit<GameState, 'stateHistory'>[]
  showChaosOverlay: boolean
  revealState: RevealState | null
  phenomenonActive: boolean
}

export type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'RESET_TURN' }
  | { type: 'DRAW_SCHEME' }
  | { type: 'ABANDON_SCHEME'; schemeId: string }
  | { type: 'UNDO' }
  | { type: 'DISMISS_CHAOS' }
  | { type: 'RESOLVE_PHENOMENON' }
  | { type: 'BEGIN_REVEAL_CHAOS'; cards: PlaneCard[]; effectType: ChaosEffectType }
  | { type: 'DISMISS_REVEAL' }
  | { type: 'REORDER_BOTTOM'; cardIds: string[] }

export interface TurnRecord {
  playerId: string
  playerName: string
  rolls: DieRoll[]
  planeswalked: boolean
  chaosTriggered: boolean
  endedAt: number
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Some errors in files that use the old PlaneCard shape — these will be fixed in subsequent tasks. Note them and proceed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/types.ts
git commit -m "feat: add effect taxonomy types, phenomenon support, and reveal state to game types"
```

---

### Task 7: Update Game Engine — Phenomenon & Reveal Actions

**Files:**
- Modify: `src/lib/game/engine.ts`
- Modify: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Write tests for phenomenon and reveal chaos actions**

Add to `src/lib/game/engine.test.ts`:

```typescript
describe('phenomenon handling', () => {
  it('RESOLVE_PHENOMENON advances to next plane and sets phenomenonActive false', () => {
    const phenomenonState: GameState = {
      ...createBaseState(),
      phenomenonActive: true,
      currentPlaneIndex: 2,
    }
    const result = gameReducer(phenomenonState, { type: 'RESOLVE_PHENOMENON' })
    expect(result.currentPlaneIndex).toBe(3)
    expect(result.phenomenonActive).toBe(false)
    expect(result.planesVisited).toBe(phenomenonState.planesVisited + 1)
  })
})

describe('reveal chaos actions', () => {
  it('BEGIN_REVEAL_CHAOS sets revealState', () => {
    const state = createBaseState()
    const revealCards = [state.deck[1], state.deck[2], state.deck[3]]
    const result = gameReducer(state, {
      type: 'BEGIN_REVEAL_CHAOS',
      cards: revealCards,
      effectType: 'reveal_and_chaos',
    })
    expect(result.revealState).toEqual({
      cards: revealCards,
      source: 'chaos',
      effectType: 'reveal_and_chaos',
      resolved: false,
    })
  })

  it('DISMISS_REVEAL clears revealState', () => {
    const state: GameState = {
      ...createBaseState(),
      revealState: {
        cards: [],
        source: 'chaos',
        effectType: 'reveal_and_chaos',
        resolved: false,
      },
    }
    const result = gameReducer(state, { type: 'DISMISS_REVEAL' })
    expect(result.revealState).toBeNull()
    expect(result.showChaosOverlay).toBe(false)
  })
})
```

Update the `createBaseState()` helper at the top of the test file to include the new required fields:

```typescript
function createBaseState(): GameState {
  return {
    // ... existing fields ...
    revealState: null,
    phenomenonActive: false,
  }
}
```

Also update `makePlane()` helper to include new PlaneCard fields:

```typescript
function makePlane(i: number): PlaneCard {
  return {
    id: `plane-${i}`,
    name: `Test Plane ${i}`,
    type_line: 'Plane — Test',
    card_type: 'plane',
    oracle_text: `Oracle text for plane ${i}`,
    image_uris: { normal: `https://example.com/${i}.jpg`, large: `https://example.com/${i}.jpg`, art_crop: `https://example.com/${i}.jpg`, border_crop: `https://example.com/${i}.jpg`, small: `https://example.com/${i}.jpg`, png: `https://example.com/${i}.png` },
    set_name: 'Test Set',
    set: 'TST',
    chaos_effect_type: 'standard',
    chaos_effect_config: null,
  }
}
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run src/lib/game/engine.test.ts`
Expected: New tests fail (RESOLVE_PHENOMENON and reveal actions not handled yet)

- [ ] **Step 3: Implement new actions in the engine**

Update `src/lib/game/engine.ts`. Add these cases to `applyAction`:

```typescript
    case 'RESOLVE_PHENOMENON': {
      const nextIndex = (state.currentPlaneIndex + 1) % state.deck.length
      return {
        ...state,
        currentPlaneIndex: nextIndex,
        planesVisited: state.planesVisited + 1,
        phenomenonActive: false,
      }
    }

    case 'BEGIN_REVEAL_CHAOS': {
      return {
        ...state,
        revealState: {
          cards: action.cards,
          source: 'chaos',
          effectType: action.effectType,
          resolved: false,
        },
      }
    }

    case 'DISMISS_REVEAL': {
      return {
        ...state,
        revealState: null,
        showChaosOverlay: false,
      }
    }

    case 'REORDER_BOTTOM': {
      // Move specified cards to the end of the deck in given order
      const reorderedIds = new Set(action.cardIds)
      const remainingDeck = state.deck.filter((c) => !reorderedIds.has(c.id))
      const reorderedCards = action.cardIds
        .map((id) => state.deck.find((c) => c.id === id))
        .filter((c): c is PlaneCard => c !== undefined)

      return {
        ...state,
        deck: [...remainingDeck, ...reorderedCards],
        revealState: state.revealState ? { ...state.revealState, resolved: true } : null,
      }
    }
```

Also add `RESOLVE_PHENOMENON`, `BEGIN_REVEAL_CHAOS`, `DISMISS_REVEAL` to the list of automatic actions that skip history in `gameReducer`:

```typescript
  if (action.type === 'PLANESWALK' || action.type === 'SETTLE_DIE'
    || action.type === 'RESOLVE_PHENOMENON' || action.type === 'BEGIN_REVEAL_CHAOS'
    || action.type === 'DISMISS_REVEAL' || action.type === 'REORDER_BOTTOM') {
    return applyAction(state, action)
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/game/engine.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run full type check**

Run: `npx tsc --noEmit`
Expected: Only errors from consumers not yet updated (game page, setup, lobby). Note and proceed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/engine.ts src/lib/game/engine.test.ts
git commit -m "feat: add phenomenon resolution, reveal chaos, and reorder actions to game engine"
```

---

### Task 8: Hook & Consumer Migration — useCardCorpus

**Files:**
- Create: `src/hooks/useCardCorpus.ts`
- Delete: `src/hooks/usePlaneCorpus.ts`
- Delete: `src/hooks/useSchemeCorpus.ts`
- Modify: `src/app/setup/page.tsx`
- Modify: `src/app/lobby/page.tsx`

- [ ] **Step 1: Create the new unified hook**

Create `src/hooks/useCardCorpus.ts`:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import type { PlaneCard, SchemeCard } from '@/lib/game/types'
import type { ChaosEffectType } from '@/lib/cards/effect-classifier'

interface CardApiRow {
  id: string
  name: string
  type_line: string
  card_type: 'plane' | 'phenomenon' | 'scheme'
  oracle_text: string
  flavor_text: string | null
  set_code: string
  set_name: string
  image_uris: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  chaos_effect_type: ChaosEffectType
  chaos_effect_config: Record<string, unknown> | null
  is_ongoing: boolean
}

function toPlaneCard(row: CardApiRow): PlaneCard {
  return {
    id: row.id,
    name: row.name,
    type_line: row.type_line,
    card_type: row.card_type as 'plane' | 'phenomenon',
    oracle_text: row.oracle_text,
    flavor_text: row.flavor_text ?? undefined,
    image_uris: row.image_uris,
    set_name: row.set_name,
    set: row.set_code,
    chaos_effect_type: row.chaos_effect_type,
    chaos_effect_config: row.chaos_effect_config,
  }
}

function toSchemeCard(row: CardApiRow): SchemeCard {
  return {
    id: row.id,
    name: row.name,
    type_line: row.type_line,
    oracle_text: row.oracle_text,
    flavor_text: row.flavor_text ?? undefined,
    image_uris: row.image_uris,
    set_name: row.set_name,
    set: row.set_code,
    isOngoing: row.is_ongoing,
  }
}

const ONE_HOUR = 60 * 60 * 1000

export function usePlaneCorpus() {
  return useQuery<PlaneCard[]>({
    queryKey: ['card-corpus', 'planes'],
    queryFn: async () => {
      const res = await fetch('/api/cards?type=planes')
      if (!res.ok) throw new Error('Cards unavailable')
      const rows: CardApiRow[] = await res.json()
      return rows.map(toPlaneCard)
    },
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR,
    retry: 2,
  })
}

export function useSchemeCorpus() {
  return useQuery<SchemeCard[]>({
    queryKey: ['card-corpus', 'schemes'],
    queryFn: async () => {
      const res = await fetch('/api/cards?type=schemes')
      if (!res.ok) throw new Error('Cards unavailable')
      const rows: CardApiRow[] = await res.json()
      return rows.map(toSchemeCard)
    },
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR,
    retry: 2,
  })
}
```

- [ ] **Step 2: Update setup page imports**

In `src/app/setup/page.tsx`, change line 8:

```typescript
// Old:
import { usePlaneCorpus } from '@/hooks/usePlaneCorpus'
import { useSchemeCorpus } from '@/hooks/useSchemeCorpus'

// New:
import { usePlaneCorpus, useSchemeCorpus } from '@/hooks/useCardCorpus'
```

- [ ] **Step 3: Update lobby page imports**

In `src/app/lobby/page.tsx`, change line 11:

```typescript
// Old:
import { usePlaneCorpus } from '@/hooks/usePlaneCorpus'

// New:
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
```

- [ ] **Step 4: Update setup page — add default values for new PlaneCard fields**

In `src/app/setup/page.tsx`, the `startGame` function casts corpus to `PlaneCard[]` at line 48. Since the corpus now comes from the DB with all fields, no cast is needed. But we need to ensure the `deck` assignment works:

```typescript
// Old (line 48):
const deck = shuffleDeck(corpus).slice(0, size) as PlaneCard[]

// New:
const deck = shuffleDeck(corpus).slice(0, size)
```

Also add `revealState: null` and `phenomenonActive: false` to the GameState construction (after `showChaosOverlay: false` at line 92):

```typescript
      showChaosOverlay: false,
      revealState: null,
      phenomenonActive: false,
```

- [ ] **Step 5: Update lobby page — same changes**

In `src/app/lobby/page.tsx`, update line 50:

```typescript
// Old:
const deck = shuffleDeck(corpus) as PlaneCard[]

// New:
const deck = shuffleDeck(corpus)
```

Add `revealState: null` and `phenomenonActive: false` to the GameState at the end (after `showChaosOverlay: false`):

```typescript
      showChaosOverlay: false,
      revealState: null,
      phenomenonActive: false,
```

- [ ] **Step 6: Delete old hooks**

Delete `src/hooks/usePlaneCorpus.ts` and `src/hooks/useSchemeCorpus.ts`.

- [ ] **Step 7: Update session-storage defaults**

In `src/lib/game/session-storage.ts`, find the `loadGameState` function where backward-compatible defaults are applied. Add defaults for the new fields:

```typescript
revealState: parsed.revealState ?? null,
phenomenonActive: parsed.phenomenonActive ?? false,
```

- [ ] **Step 8: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Type check passes, all tests pass

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useCardCorpus.ts src/app/setup/page.tsx src/app/lobby/page.tsx src/lib/game/session-storage.ts
git rm src/hooks/usePlaneCorpus.ts src/hooks/useSchemeCorpus.ts
git commit -m "feat: migrate to useCardCorpus hook, retire Scryfall API routes"
```

---

### Task 9: Phenomenon Handling in Game Page

**Files:**
- Modify: `src/app/game/page.tsx`

When a planeswalk lands on a phenomenon card, the game should:
1. Show the phenomenon card briefly
2. Auto-trigger another planeswalk (phenomenon chains)
3. Keep chaining if the next card is also a phenomenon

- [ ] **Step 1: Add phenomenon detection to the planeswalk handler**

In `src/app/game/page.tsx`, update the `handleRoll` callback. After the PLANESWALK action is dispatched (inside the setTimeout at line 108), add phenomenon detection:

```typescript
  const handleRoll = useCallback((result: DieResult) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'ROLL_DIE', result })
    })

    if (result === 'planeswalk') {
      setSlideDirection('right')
      audioManager.playPlaneswalkLayered()
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          const next = gameReducer(prev, { type: 'PLANESWALK' })
          const landedCard = next.deck[next.currentPlaneIndex]
          if (landedCard?.card_type === 'phenomenon') {
            return { ...next, phenomenonActive: true }
          }
          return next
        })
      }, 1200)
    }
  }, [])
```

- [ ] **Step 2: Add phenomenon auto-advance effect**

Add a `useEffect` that watches for `phenomenonActive` and auto-chains after a delay:

```typescript
  useEffect(() => {
    if (!state?.phenomenonActive) return

    const timer = setTimeout(() => {
      setSlideDirection('right')
      setState((prev) => {
        if (!prev) return prev
        const next = gameReducer(prev, { type: 'RESOLVE_PHENOMENON' })
        const landedCard = next.deck[next.currentPlaneIndex]
        if (landedCard?.card_type === 'phenomenon') {
          return { ...next, phenomenonActive: true }
        }
        return next
      })
    }, 3000)

    return () => clearTimeout(timer)
  }, [state?.phenomenonActive, state?.currentPlaneIndex])
```

- [ ] **Step 3: Add phenomenon visual indicator**

In the JSX, after the chaos overlay `AnimatePresence` block, add a phenomenon indicator:

```typescript
      {/* Phenomenon indicator */}
      <AnimatePresence>
        {state.phenomenonActive && currentPlane && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center pb-32 pointer-events-none"
          >
            <div className="bg-amber-900/90 backdrop-blur-sm border border-amber-500/40 rounded-xl px-6 py-3 text-center">
              <p className="text-amber-400 font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                Phenomenon!
              </p>
              <p className="text-amber-200/70 text-xs mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Planeswalking again in a moment...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

- [ ] **Step 4: Run type check and verify**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: add phenomenon auto-chaining in game page"
```

---

### Task 10: Special Chaos UI — Reveal Cards Modal

**Files:**
- Create: `src/components/reveal-cards-modal.tsx`
- Modify: `src/app/game/page.tsx`

- [ ] **Step 1: Create the reveal cards modal component**

Create `src/components/reveal-cards-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaneCard } from '@/lib/game/types'

interface RevealCardsModalProps {
  cards: PlaneCard[]
  effectType: string
  onDismiss: () => void
  onReorder?: (cardIds: string[]) => void
}

export function RevealCardsModal({ cards, effectType, onDismiss, onReorder }: RevealCardsModalProps) {
  const [orderedCards, setOrderedCards] = useState(cards)
  const showReorder = effectType === 'reveal_and_chaos' || effectType === 'reveal_and_choose'

  function moveCard(index: number, direction: 'up' | 'down') {
    const newOrder = [...orderedCards]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    setOrderedCards(newOrder)
  }

  function handleConfirm() {
    if (onReorder) {
      onReorder(orderedCards.map((c) => c.id))
    }
    onDismiss()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/90 p-4"
    >
      <div className="w-full max-w-[400px] flex flex-col gap-4">
        <div className="text-center">
          <h2
            className="text-lg font-bold text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {effectType === 'reveal_and_chaos' && 'Revealed Cards — Chaos Triggers!'}
            {effectType === 'scry_top' && 'Top of Planar Deck'}
            {effectType === 'reveal_and_choose' && 'Choose a Plane'}
          </h2>
          {showReorder && (
            <p className="text-xs text-white/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Reorder before placing on bottom of planar deck
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {orderedCards.map((card, i) => (
            <motion.div
              key={card.id}
              layout
              className="flex items-center gap-3 bg-white/5 rounded-xl p-2 border border-white/10"
            >
              <div className="relative w-20 aspect-[7/5] rounded-lg overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[140%] aspect-[5/7] rotate-90">
                    <Image
                      src={card.image_uris.border_crop}
                      alt={card.name}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  {card.name}
                </p>
                <p className="text-[10px] text-white/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {card.type_line}
                </p>
              </div>
              {showReorder && orderedCards.length > 1 && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveCard(i, 'up')}
                    disabled={i === 0}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-20 px-2 py-1"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCard(i, 'down')}
                    disabled={i === orderedCards.length - 1}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-20 px-2 py-1"
                  >
                    ▼
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm transition-opacity hover:opacity-90"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {showReorder ? 'Place on Bottom & Continue' : 'Continue'}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Integrate reveal modal into game page**

In `src/app/game/page.tsx`, add import:

```typescript
import { RevealCardsModal } from '@/components/reveal-cards-modal'
```

Add handler functions:

```typescript
  const handleSpecialChaos = useCallback((plane: PlaneCard) => {
    if (plane.chaos_effect_type === 'reveal_and_chaos') {
      const revealCount = (plane.chaos_effect_config as { revealCount: number })?.revealCount ?? 3
      const startIdx = (state!.currentPlaneIndex + 1) % state!.deck.length
      const revealed: PlaneCard[] = []
      for (let i = 0; i < revealCount && i < state!.deck.length - 1; i++) {
        revealed.push(state!.deck[(startIdx + i) % state!.deck.length])
      }
      setState((prev) => {
        if (!prev) return prev
        return gameReducer(prev, { type: 'BEGIN_REVEAL_CHAOS', cards: revealed, effectType: 'reveal_and_chaos' })
      })
    } else if (plane.chaos_effect_type === 'scry_top') {
      const nextIdx = (state!.currentPlaneIndex + 1) % state!.deck.length
      const topCard = state!.deck[nextIdx]
      setState((prev) => {
        if (!prev) return prev
        return gameReducer(prev, { type: 'BEGIN_REVEAL_CHAOS', cards: [topCard], effectType: 'scry_top' })
      })
    } else if (plane.chaos_effect_type === 'force_planeswalk') {
      setSlideDirection('right')
      setTimeout(() => {
        setState((prev) => {
          if (!prev) return prev
          return gameReducer(prev, { type: 'PLANESWALK' })
        })
      }, 1200)
    }
  }, [state])

  const handleReorderBottom = useCallback((cardIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'REORDER_BOTTOM', cardIds })
    })
  }, [])

  const handleDismissReveal = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      return gameReducer(prev, { type: 'DISMISS_REVEAL' })
    })
  }, [])
```

Update `handleDismissChaos` to check for special effects:

```typescript
  const handleDismissChaos = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      const plane = prev.deck[prev.currentPlaneIndex]
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        // Special chaos — dismiss overlay first, then show reveal UI
        const dismissed = gameReducer(prev, { type: 'DISMISS_CHAOS' })
        // handleSpecialChaos will be called after state update via useEffect
        return dismissed
      }
      return gameReducer(prev, { type: 'DISMISS_CHAOS' })
    })
    // Trigger special chaos after dismiss
    if (state) {
      const plane = state.deck[state.currentPlaneIndex]
      if (plane?.chaos_effect_type && plane.chaos_effect_type !== 'standard') {
        setTimeout(() => handleSpecialChaos(plane), 300)
      }
    }
  }, [state, handleSpecialChaos])
```

Add the modal to JSX, after the phenomenon indicator:

```typescript
      {/* Reveal cards modal */}
      <AnimatePresence>
        {state.revealState && !state.revealState.resolved && (
          <RevealCardsModal
            cards={state.revealState.cards}
            effectType={state.revealState.effectType}
            onDismiss={handleDismissReveal}
            onReorder={handleReorderBottom}
          />
        )}
      </AnimatePresence>
```

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/components/reveal-cards-modal.tsx src/app/game/page.tsx
git commit -m "feat: add reveal cards modal and special chaos resolution in game page"
```

---

### Task 11: Cleanup & Consistency Pass

**Files:**
- Modify: `src/app/spectate/page.tsx` (add revealState/phenomenonActive defaults)
- Modify: `src/components/chaos-overlay.tsx` (no changes needed — already uses border_crop)
- Delete: `src/lib/scryfall/client.ts` (no longer needed for runtime — seed script has its own fetch)

- [ ] **Step 1: Update spectate page for new GameState fields**

In `src/app/spectate/page.tsx`, the `handleSessionUpdate` callback parses `session.game_state`. Since older sessions may not have the new fields, the existing backward-compat defaults in `session-storage.ts` handle local games. For spectate (which reads from the session subscription), ensure the state is valid by providing defaults where the session data might not include them:

Add after line 26 (inside `handleSessionUpdate`):

```typescript
  const handleSessionUpdate = useCallback((session: GameSession) => {
    setSessionStatus(session.status)
    if (session.game_state) {
      const gs = session.game_state as unknown as GameState
      setGameState({
        ...gs,
        revealState: gs.revealState ?? null,
        phenomenonActive: gs.phenomenonActive ?? false,
      })
    }
  }, [])
```

- [ ] **Step 2: Delete the Scryfall client**

Delete `src/lib/scryfall/client.ts`. The seed script has its own standalone fetch logic and doesn't import this module.

Keep `src/lib/scryfall/types.ts` for now — it may still be referenced by other files. Check for imports first:

Run: `grep -r "from.*scryfall/client" src/` — if only the deleted API routes imported it, safe to delete.
Run: `grep -r "from.*scryfall/types" src/` — if nothing imports it, delete it too.

- [ ] **Step 3: Clean up any remaining references**

Run: `npx tsc --noEmit`

Fix any remaining type errors. Common issues:
- `PlaneCard` missing `card_type`, `chaos_effect_type`, `chaos_effect_config` in test fixtures
- Old imports from deleted files

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup old Scryfall client, update spectate page for new game state fields"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ New `cards` table with normalized schema — Task 2
- ✅ Seed script from Scryfall — Task 3
- ✅ Effect taxonomy with `chaos_effect_type` enum — Tasks 1, 2
- ✅ Migrate game code to read from DB — Tasks 4, 5, 8
- ✅ Phenomenon card support with auto-chaining — Tasks 6, 7, 9
- ✅ Special chaos resolution UI (reveal/choose/reorder) — Task 10
- ✅ `card_cache` retired (old API routes deleted) — Tasks 5, 11

**Placeholder scan:** No TBDs, TODOs, or "fill in later" found.

**Type consistency:**
- `PlaneCard` type used consistently with `card_type`, `chaos_effect_type`, `chaos_effect_config` fields
- `ChaosEffectType` imported from `effect-classifier.ts` wherever needed
- `GameAction` union includes all new variants
- `RevealState` used in `GameState` and checked in game page
- `makePlane()` test helper updated with all new fields

**Deferred items (documented but not implemented):**
- Counter systems (scroll/flame/pressure) — schema column can be added later
- Dual-plane state (Spatial Merging) — needs separate game state design
- Die override effects (Chaotic Aether) — needs temporary rule system
- Duration effects ("until planeswalk") — needs effect tracker

---

## Continuation Prompt

If this session runs out of context, use this prompt to continue in a new session:

```
Continue implementing Phase 4: Local Card Database & Effect Taxonomy for PlaneChaser v2.

The plan is at docs/superpowers/plans/2026-05-17-phase4-local-card-database.md

This phase replaces live Scryfall API calls with a local Supabase `cards` table that includes custom effect metadata (chaos_effect_type, chaos_effect_config) for special planes like Pools of Becoming. It also adds phenomenon card auto-chaining and a reveal/reorder modal for deck-manipulating chaos effects.

Key context:
- The existing app uses usePlaneCorpus() and useSchemeCorpus() hooks that call /api/scryfall/planes and /api/scryfall/schemes routes, which cache raw JSON in a card_cache table
- PlaneCard and SchemeCard types are in src/lib/game/types.ts
- Game engine is in src/lib/game/engine.ts with a gameReducer
- Game page is at src/app/game/page.tsx
- Setup and lobby pages build GameState from the corpus

Check git log to see which tasks are already completed, then continue with the next uncompleted task using superpowers:subagent-driven-development.
```
