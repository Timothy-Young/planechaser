# PlaneChaser v2: Campaign Mode Design Spec

**Date:** 2026-05-16
**Status:** Approved
**Supersedes:** Original Phases 2-5 in ROADMAP.md

## Overview

PlaneChaser v2 transforms the app from a single-device Planechase game into a multiplayer campaign experience. The host phone remains the "game table" (passed between players for turns), while other players observe from their own devices and manage their collections. The conquest meta-game, per-player deck building, and Archenemy mode create an ongoing campaign where every Commander game matters.

## Terminology

| Term | Definition |
|------|-----------|
| **Owned plane** | A plane in a player's collection that they can include in decks. ALL cards a player can build with are owned. Players start with 10 random owned planes. |
| **Conquered (status)** | A provenance indicator on an owned card showing HOW it was acquired — by winning a game on that plane. Displays a "Conquered from: {player_name}" chip when taken from another player, or "Conquered" when claimed from the unowned pool. Conquered cards are still owned cards; "conquered" is metadata, not a separate category. |
| **Unowned plane** | A plane in the default Scryfall corpus that no player in the pod currently owns. Available to be added to anyone's deck and conquerable. |
| **Host** | The player whose device runs the game. All game actions happen on this device. |
| **Spectator** | A joined player viewing the game from their own device. Read-only. |
| **Session code** | 6-char alphanumeric code to join an active game session (ephemeral). |
| **Pod invite code** | 8-char code to join a persistent pod/playgroup (long-lived). |

## Architecture: Multiplayer Session Model

### Design Principle

Single-writer (host) with multi-subscriber (spectators). The host device is authoritative for all game actions. Spectator devices observe via Supabase Realtime subscriptions.

### New Tables

```sql
-- Active game sessions (replaces sessionStorage-only model)
CREATE TABLE active_game_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id              UUID REFERENCES pods,
  host_user_id        UUID NOT NULL REFERENCES auth.users,
  session_code        TEXT NOT NULL UNIQUE,  -- 6-char alphanumeric
  status              TEXT NOT NULL DEFAULT 'lobby'
                      CHECK (status IN ('lobby', 'active', 'ended')),
  game_type           TEXT NOT NULL DEFAULT 'planechase'
                      CHECK (game_type IN ('planechase', 'archenemy')),
  game_state          JSONB,                -- full GameState object
  turn_order          UUID[] NOT NULL DEFAULT '{}',
  current_turn_user_id UUID REFERENCES auth.users,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Players who joined a game session
CREATE TABLE game_session_players (
  session_id  UUID NOT NULL REFERENCES active_game_sessions ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  deck_id     UUID REFERENCES user_decks,  -- for Archenemy mode
  PRIMARY KEY (session_id, user_id)
);

-- User-created planar decks
CREATE TABLE user_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users,
  name        TEXT NOT NULL,
  plane_ids   TEXT[] NOT NULL,  -- Scryfall IDs
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- User feedback
CREATE TABLE feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users,
  category    TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'question', 'other')),
  message     TEXT NOT NULL,
  screenshot_url TEXT,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Session Flow

1. Host creates game -> generates 6-char session code -> status = 'lobby'
2. Players enter code on their device -> row inserted into `game_session_players` -> host sees them appear via Realtime subscription
3. Host arranges turn order (drag to reorder) -> starts game -> status = 'active'
4. All game actions update `game_state` JSONB column
5. Spectators subscribe to row changes on `active_game_sessions` where id = session_id
6. Game ends -> status = 'ended', conquest recorded

### Connectivity Fallback

Host maintains local sessionStorage backup (existing behavior). If connection drops:
- Host continues playing locally
- On reconnect, local state syncs back to Supabase
- Spectators see "Reconnecting..." until host reconnects

## Phase 2: Multiplayer Session & Turns

### Goal
Friends can join a game via code, see who's in, take turns, and spectate from their own devices.

### Requirements

| ID | Requirement |
|----|-------------|
| MP-01 | Host creates game session, receives 6-char join code |
| MP-02 | Players enter code to join session lobby (not start their own game) |
| MP-03 | Host sees list of joined players in real-time |
| MP-04 | Host sets turn order by dragging player list |
| MP-05 | "End Turn" button advances to next player in turn order |
| MP-06 | Current player name/avatar displayed prominently |
| MP-07 | Spectators see current plane, whose turn it is, and roll results in real-time |
| MP-08 | Roll cost resets to 0 on End Turn (per-player tracking) |
| MP-09 | Game state persists in Supabase (host writes, spectators read) |
| MP-10 | Local sessionStorage backup for host connectivity loss |

### GameState Evolution

```typescript
interface Player {
  id: string
  display_name: string
  avatar_url?: string
}

interface GameState {
  id: string
  config: GameConfig
  deck: PlaneCard[]
  currentPlaneIndex: number
  planesVisited: number
  dieState: DieState
  lastDieResult: DieResult | null

  // Turn tracking
  players: Player[]
  turnOrder: string[]          // player IDs in sequence
  currentTurnIndex: number     // index into turnOrder
  rollCountThisTurn: number    // resets on End Turn

  // History
  turnHistory: TurnRecord[]
  currentTurnRolls: DieRoll[]
  dieRollHistory: DieRoll[]

  // Undo (stores snapshots WITHOUT their own stateHistory to avoid recursion)
  stateHistory: Omit<GameState, 'stateHistory'>[]  // circular buffer, max 5

  startedAt: number
  archenemy?: ArchenemyState
}

interface TurnRecord {
  playerId: string
  playerName: string
  rolls: DieRoll[]
  planeswalked: boolean
  chaosTriggered: boolean
  endedAt: number
}

interface GameConfig {
  playerCount: number
  deckSize: number
  isArchenemy?: boolean
  gameType: 'planechase' | 'archenemy'
}
```

### New GameActions

```typescript
type GameAction =
  | { type: 'ROLL_DIE'; result: DieResult }
  | { type: 'SETTLE_DIE' }
  | { type: 'PLANESWALK' }
  | { type: 'END_TURN' }
  | { type: 'UNDO' }
  | { type: 'DRAW_SCHEME' }
  | { type: 'ABANDON_SCHEME'; schemeId: string }
  | { type: 'DISMISS_CHAOS' }
```

## Phase 3: Game Mechanics Polish

### Goal
The game plays correctly with satisfying interactions: undo, chaos acknowledgment, roll history, full card display, and phenomenon support.

### Requirements

| ID | Requirement |
|----|-------------|
| GM-01 | Undo reverts the last action (5-state history buffer) |
| GM-02 | Chaos overlay: full-screen with chaos text, stays until tapped |
| GM-03 | "Cost: X mana" is tappable -> shows roll history for current turn |
| GM-04 | Full game history accessible (all turns, all players) |
| GM-05 | Card display uses `image_uris.normal` (full card with rules text) |
| GM-06 | Tap/click card -> zoom modal with `large` image |
| GM-07 | Phenomenon cards: land on it, resolve, auto-planeswalk away |
| GM-08 | Button animations: `whileTap={{ scale: 0.95 }}` on all buttons |
| GM-09 | Desktop cursors: pointer on clickable, grab on draggable, not-allowed on disabled |
| GM-10 | Tips/help: contextual (?) icons, first-game onboarding overlay |

### Undo Mechanism

Before each action is applied to the reducer, push the pre-action state onto `stateHistory` (capped at 5). The `UNDO` action pops the most recent state and replaces current. Only the host can undo. Spectators see the state revert in real-time.

### Chaos Overlay

When `lastDieResult === 'chaos'`:
- Render full-screen overlay (semi-transparent dark backdrop)
- Show the chaos ability text (extracted from `oracle_text` — text after the chaos symbol)
- Overlay persists until host taps "Acknowledge"
- Dispatch `DISMISS_CHAOS` -> clears overlay, game continues

### Phenomenon Handling

Phenomena are cards in the deck with `type_line` containing "Phenomenon". When `PLANESWALK` lands on a phenomenon:
1. Display the phenomenon card (full card view)
2. Resolve its effect (text shown to players)
3. After acknowledgment (tap), automatically planeswalk again to the next non-phenomenon card
4. If multiple phenomena are sequential, chain through all of them

## Phase 4: Planar Deck Building

### Goal
Players can build custom planar decks from the Scryfall corpus, with visual indicators for conquest status.

### Requirements

| ID | Requirement |
|----|-------------|
| DB-01 | Deck builder page: search/filter all planes and phenomena |
| DB-02 | Add/remove cards with tap; no duplicates allowed |
| DB-03 | Visual badge: "Conquered" on planes the user has conquered |
| DB-04 | Visual indicator: "Visited" on planes seen in past games |
| DB-05 | Save deck with name; support multiple named decks |
| DB-06 | New user auto-receives a default 10-card deck (random planes) |
| DB-07 | Host selects which deck to use at game setup |
| DB-08 | Phenomena can be included in decks |
| DB-09 | Deck minimum: 10 cards |

### Default Deck Generation

On first login (or first game setup if no deck exists):
- Query Scryfall for 10 random planes (excluding phenomena)
- Create a `user_decks` row with `is_default = true`
- These planes are "owned" but not "conquered" — they are conquerable

### Deck Storage

The `user_decks.plane_ids` column stores an array of Scryfall card IDs. At game start, the app fetches full card data from Scryfall (or cache) for the selected deck's IDs.

## Phase 5: Conquest System

### Goal
Winning games conquers planes. Conquered planes are visually claimed and skipped in future games.

### Requirements

| ID | Requirement |
|----|-------------|
| CQ-01 | Host designates winner at game end |
| CQ-02 | Winner conquers the current plane (written to `conquered_planes`) |
| CQ-03 | Conquered plane shows conqueror name + timestamp overlay |
| CQ-04 | Future games with same deck skip conquered planes |
| CQ-05 | Profile shows conquests as full card grid (tappable for zoom) |
| CQ-06 | Visit history: list of all planes visited, each clickable for zoom |
| CQ-07 | Basic stats: games played, win rate, total planes conquered |
| CQ-08 | Planar Dominion: top achievement is conquering all 185 planes |

### Conquest Data Model

The `conquered_planes` table gains a `conquered_from_user_id` column:
- NULL = conquered from the unowned pool (displays "Conquered" chip)
- UUID = conquered/stolen from another player (displays "Conquered from: {name}" chip)

### Conquest Flow

1. Host taps "End Game"
2. Dialog: "Who won this game?" -> list of players in turn order
3. Host selects winner
4. Confirmation: "Award [Plane Name] to [Player Name]?"
5. On confirm: INSERT into `conquered_planes` with plane_scryfall_id, user_id, pod_id, conquered_from_user_id
6. UI shows conquest animation/celebration
7. Card displays "Conquered" or "Conquered from: {name}" chip based on provenance

### Conquered Plane Skip Logic

At game start, when building the deck:
```typescript
const playablePlanes = selectedDeck.planes.filter(
  plane => !conqueredPlaneIds.includes(plane.id)
)
```

If all planes in a deck are conquered, notify the host that the deck is fully conquered and they need to add more planes or use a different deck.

## Phase 6: Pod Management (Revised)

### Goal
Fix the current pod join flow and establish pods as persistent groups that track standings.

### Requirements

| ID | Requirement |
|----|-------------|
| PD-01 | Joining a pod via invite code adds to pod membership (does NOT start a game) |
| PD-02 | Any pod member can host by starting a game with that pod |
| PD-03 | Pod leaderboard: conquered plane counts, sortable |
| PD-04 | User can belong to multiple pods |
| PD-05 | Archenemy threshold: configurable per pod |
| PD-06 | Threshold notification: when a member reaches threshold, pod members notified |
| PD-07 | Pod settings: name, threshold, managed by pod owner |

### Join Flow Fix

Current bug: entering pod invite code triggers a game start. Fix:
- Pod join page: enter code -> confirm "Join [Pod Name]?" -> INSERT into pod_members -> redirect to pod detail page
- Game creation is a separate action from the pod detail page ("Start Game" button)
- Clear separation: pod code = persistent group membership; game code = join active session

## Phase 7: Archenemy Mode (Expanded)

### Goal
Full Archenemy format with per-player decks, scheme cards, and stake-based win conditions.

### Requirements

| ID | Requirement |
|----|-------------|
| AE-01 | Game type indicator: "Planechase" vs "Archenemy" clearly shown |
| AE-02 | Archenemy triggered by pod threshold OR host manual designation |
| AE-03 | Archenemy builds deck from their owned planes |
| AE-04 | Allies bring their own 10-card deck from their owned planes |
| AE-05 | Per-player deck tracking: each player rolls against their own deck |
| AE-06 | Scheme deck: Archenemy draws scheme at start of their turn |
| AE-07 | Ongoing schemes persist visually until dismissed (with undo) |
| AE-08 | One-shot schemes: shown, resolved, dismissed |
| AE-09 | Archenemy wins: steals 1 plane from each ally (becomes conquered by Archenemy) |
| AE-10 | Allies win: each ally reclaims 1 plane from Archenemy (returns to unowned pool) |
| AE-11 | No back-to-back Archenemy: system warns if same player triggers threshold consecutively |
| AE-12 | Scheme deck builder for Archenemy (select from available schemes) |

### Per-Player Deck State

```typescript
interface ArchenemyGameState extends GameState {
  gameType: 'archenemy'
  archenemy: {
    archenemyId: string
    archenemyName: string
    schemeDeck: SchemeCard[]
    currentSchemeIndex: number
    activeSchemes: SchemeCard[]
    schemesPlayed: number
    deck: PlaneCard[]
    currentPlaneIndex: number
  }
  allyDecks: {
    [playerId: string]: {
      deck: PlaneCard[]
      currentPlaneIndex: number
    }
  }
}
```

### Win Condition Flow

**Archenemy wins:**
1. Host declares Archenemy won
2. For each ally: Archenemy selects 1 plane from ally's deck
3. Selected planes are INSERT'd into `conquered_planes` with Archenemy's user_id
4. Allies lose those planes from their owned collection

**Allies win:**
1. Host declares Allies won
2. Each ally selects 1 plane from Archenemy's deck
3. Selected planes are DELETED from `conquered_planes` (return to unowned multiverse pool)
4. Nobody owns those planes now — they're back in the default corpus

### Back-to-Back Prevention

Track `last_archenemy_user_id` on the pod. When threshold triggers:
- If same user: show warning "This player was the Archenemy last game. The pod should designate a different Archenemy or override."
- Not a hard block — the pod can override (it's a social game)

## Phase 8: Planar Map & Social

### Goal
Visual representation of the multiverse showing conquest status, plus feedback system.

### Requirements

| ID | Requirement |
|----|-------------|
| PM-01 | Planar map: grid/constellation of all ~185 planes |
| PM-02 | Color-coded by status: unclaimed (dim), yours (gold), podmate (their color) |
| PM-03 | Tap plane on map -> zoom modal with full card |
| PM-04 | Filter: all, mine, podmate's name, unclaimed |
| PM-05 | Feedback form: category, message, optional screenshot |
| PM-06 | Feedback stored in Supabase `feedback` table |
| PM-07 | Tips/how-to-play accessible from game menu and pod pages |

### Map Implementation

A responsive CSS grid showing plane cards as small thumbnails. Each thumbnail has:
- Colored border/glow based on conquest status
- Pod member's avatar overlay if conquered
- Tap opens the zoom modal

Performance: lazy-load thumbnails (use `image_uris.small`), virtualize the grid for 185+ items.

## Phase 9: Content Pages

### Goal
Public-facing content that drives adoption and educates players.

### Requirements

| ID | Requirement |
|----|-------------|
| CP-01 | Marketing landing page for unauthenticated users at `/` |
| CP-02 | Landing page hero: Archenemy dynamic as the key differentiator |
| CP-03 | Planechase rules page at `/rules/planechase` |
| CP-04 | Archenemy rules page at `/rules/archenemy` |
| CP-05 | Updated support page: transparency about WotC licensing, donations support development |
| CP-06 | Call-to-action: sign up / download to home screen |

### Marketing Page Messaging

Core pitch: "Turn every Commander night into a campaign. Conquer planes. Trigger Archenemy. Become the multiverse's greatest threat — or rally your allies to dethrone one."

Target: MTG players who gather at card shops for Commander nights. The value prop is that PlaneChaser gives their regular games lasting consequences through the conquest meta-game.

## Phase 10: Future Enhancements (Deferred Backlog)

These features are documented but not scheduled for the v2 milestone:

| Feature | Notes |
|---------|-------|
| Moxfield import | Import pre-built planar decks from Moxfield |
| District bonuses | Conquer all districts of a plane (e.g., Ravnica's 10) -> bonus scheme |
| Scheme economy | Earn schemes through play, lose them when planes are lost |
| Predictive stats | Win probability, plane affinity analysis |
| Monetization tiers | Free (countdown + 5 deck limit) vs. paid (instant + unlimited) |
| Deck request flow | Allies can request host include their deck |
| Other players include their planar deck in the game | Social deck sharing |

## Dependency Graph

```
Phase 1 (complete) 
    └── Phase 2: Multiplayer Session & Turns
            ├── Phase 3: Game Mechanics Polish
            │       └── Phase 4: Deck Building
            │               ├── Phase 5: Conquest
            │               │       ├── Phase 6: Pod Management (revised)
            │               │       │       └── Phase 7: Archenemy (expanded)
            │               │       └── Phase 8: Planar Map & Social
            │               └── Phase 7 (also depends on deck building)
            └── Phase 9: Content Pages (can start after Phase 2, independent)
```

Phase 9 (Content Pages) is largely independent and can be built in parallel with Phases 3-8 since it's static content.

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game state storage | Supabase JSONB column | Single-writer model, Realtime subscription, no conflict resolution needed |
| Undo mechanism | 5-state circular buffer in JSONB | Simple, deterministic, no operational transform complexity |
| Real-time sync | Supabase Realtime (row-level changes) | Already in stack, ~200ms latency, sufficient for spectator view |
| Connectivity fallback | Local sessionStorage backup | Host can continue offline, sync on reconnect |
| Card images | `image_uris.normal` (full card) | Eliminates need for text overlay; card is self-documenting |
| Deck storage | `TEXT[]` of Scryfall IDs | Lightweight, fetches full data at game start from cache |
| Session codes | 6-char alphanumeric | Short enough to read aloud, collision-unlikely at expected scale |
| Admin feedback | Supabase Dashboard | Solo admin, zero custom UI maintenance |
| Per-player decks (Archenemy) | Nested JSONB per player | Keeps all state in one row; host is single writer |

## Success Metrics

The v2 milestone is successful when:
1. A pod of 4 players can join a game via code, take turns, roll the die, and see the game state on their own devices
2. Games end with plane conquest that persists across sessions
3. Players can build custom decks and use them in games
4. Archenemy mode plays correctly with per-player decks and scheme cards
5. A new user can understand how to play from the in-app tips and rules pages
6. The marketing landing page clearly communicates the value proposition
