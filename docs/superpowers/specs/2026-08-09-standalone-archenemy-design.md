# Standalone Archenemy

## Goal

Make Archenemy a game type a table can play on its own, without a planar deck and
without planeswalking. Give schemes a lifecycle that matches the printed rules:
every scheme set in motion persists on screen and stacks with the others, each is
cleared manually, and a cleared scheme returns to the bottom of the scheme deck.
Add life tracking, since a standalone Archenemy game has no plane card to anchor
the screen and the 40/20 life split is the format's other defining rule.

## Scope

### In scope

| ID | Requirement |
|----|-------------|
| SA-01 | Three game modes selectable at setup: Planechase, Archenemy, Planechase + Archenemy |
| SA-02 | An Archenemy-only game runs with no planar deck, no planar die, and no planeswalking |
| SA-03 | Every scheme set in motion persists on a board and stacks; unbounded simultaneous ongoing schemes |
| SA-04 | Each scheme in motion is cleared manually — `Abandon` for ongoing, `Resolve` for one-shot |
| SA-05 | A cleared scheme returns to the **bottom** of the scheme deck, per the printed rules |
| SA-06 | Two-sided turn tracker (Archenemy ↔ Team); starting an Archenemy turn sets the top scheme in motion automatically |
| SA-07 | Life tracking: archenemy at 40, each hero at 20, manual adjustment, hero elimination at 0 |
| SA-08 | Standalone games are fully decoupled from pods and the conquest meta-game |

### Out of scope

| ID | Requirement | Reason |
|----|-------------|--------|
| SA-X1 | Supervillain Rumble variant (3+ players, each with their own scheme deck) | Comparable in size to the deferred per-player plane decks (Phase 7b). Needs N scheme decks and N boards. |
| SA-X2 | Scheme deck legality enforcement (20-card minimum, max two copies per name) | Independent of this work; belongs with the scheme deck builder. |
| SA-X3 | Any change to the pod-triggered Archenemy conquest flow | That path is the conquest meta-game and is deliberately untouched. |

### Reference

Format rules: <https://magic.wizards.com/en/formats/archenemy>

The rules this design leans on, verbatim in substance:

- The archenemy starts at 40 life and always goes first. Each team member starts at 20.
- The scheme deck holds 20 or more cards, no more than two copies of any one scheme.
- On each of the archenemy's turns, at the start of their first main phase, they
  reveal the top card of their scheme deck and set that scheme in motion.
- Most schemes trigger immediately and are then **put on the bottom of the scheme
  deck**. Ongoing schemes instead remain face up and active until an ability says
  to abandon them, at which point they too go to the bottom of the scheme deck.
- The other players take their turns simultaneously.
- The game continues until the archenemy loses, or until every team member has lost.

---

## 1. Existing state and why it needs to change

Archenemy today is an add-on to a Planechase game. `GameState.archenemy` is an
optional slice inside a state object built entirely around `deck: PlaneCard[]`,
and `/setup` only offers Archenemy as a toggle on a Planechase game. Three
specific things block a standalone game:

1. **The state assumes a planar deck.** `PLANESWALK` computes
   `(base + 1) % state.deck.length`. With an empty deck that is `NaN`, and the
   resulting index reads `undefined` out of the deck. Every plane action has the
   same shape of problem.

2. **Schemes cycle by index, not by deck order.** `DRAW_SCHEME` reads
   `schemeDeck[currentSchemeIndex % schemeDeck.length]` and increments the index.
   Nothing ever moves a card to the bottom. As long as schemes are cleared in the
   order they were drawn this is indistinguishable from the real rule, but once a
   table abandons an ongoing scheme out of order — which is the normal case — the
   two models diverge and the app deals cards the printed rules would not.

3. **Only ongoing schemes persist.** A one-shot scheme appears for three seconds
   via `lastDrawnScheme` and a `setTimeout`, then vanishes with no way to bring it
   back. Ongoing schemes stack in an inline bar that squeezes the plane card to
   `max-h-[300px]`.

No database change is required. `active_game_sessions.game_type` already accepts
`'archenemy'` (`004_game_sessions_multiplayer.sql:10`), and every new field lives
in the `game_state` JSONB column.

## 2. Approach

Add a mode discriminant to the existing `GameState` rather than introducing a
second state type or nesting the plane fields into a slice.

A separate `ArchenemyGameState` with its own route and storage key would avoid
inert fields, but it would duplicate session creation, realtime sync, wire-state,
resume, and end-of-game history — and the combined Planechase + Archenemy mode
would then belong to neither type.

Nesting plane state into a `planes` slice is the cleanest long-term shape, but it
rewrites every `state.deck` and `state.currentPlaneIndex` reference across the
game page, the wire format, and the engine tests. That is a large regression
surface on a format people already play, bought for a structural tidiness this
feature does not need.

The mode discriminant keeps session sync, wire-state, undo, resume, spectators,
and game history working unchanged. Its cost is three inert plane fields in an
Archenemy-only state, and guards on the plane actions — guards the codebase needs
anyway, because they close the `% 0` bug above.

The isolation that the slice refactor would have bought is taken at the UI layer
instead, by splitting the game page into per-mode boards.

## 3. State model

`src/lib/game/types.ts`:

```ts
export type GameMode = 'planechase' | 'archenemy' | 'both'

export interface InMotionScheme {
  /** Unique per set-in-motion event: a scheme deck may hold two copies of a name. */
  instanceId: string
  card: SchemeCard
  setInMotionAt: number
}

export interface ArchenemyState {
  archenemyId: string
  archenemyName: string
  /** Ordered draw pile. Index 0 is the top. */
  schemeDeck: SchemeCard[]
  /** Every scheme currently face up, ongoing and one-shot alike, newest first. */
  schemesInMotion: InMotionScheme[]
  schemesPlayed: number
  /** Whose turn it is. The archenemy always takes the first turn. */
  side: 'archenemy' | 'team'
  /** Increments at the start of each archenemy turn. Starts at 1. */
  turnNumber: number
}

export interface GameConfig {
  playerCount: number
  deckSize: number
  mode: GameMode
  /** @deprecated Read `mode` instead. Retained so archived sessions still parse. */
  isArchenemy?: boolean
}

export interface GameState {
  // ...unchanged fields...
  /** Life by player id. Present whenever `archenemy` is present. */
  life?: Record<string, number>
}
```

`currentSchemeIndex` and `activeSchemes` are removed. `schemeDeck` becomes a
mutable pile rather than a fixed ring:

- Setting a scheme in motion **shifts** `schemeDeck[0]` out of the pile and pushes
  an `InMotionScheme` onto `schemesInMotion`. Ongoing and one-shot take the same
  path — the rules only differ in *when* a scheme leaves the board, not in where
  it goes.
- Clearing a scheme removes it from `schemesInMotion` and **pushes its card to the
  end of `schemeDeck`**. This is the bottom-of-deck rule, and it makes the pile
  self-replenishing.
- `schemeDeck` can only be empty if every card is simultaneously in motion. That
  is a legal position; setting a scheme in motion is then a no-op with a message,
  not an error.

`instanceId` is generated with `crypto.randomUUID()` at set-in-motion time. It is
required because a user scheme deck is stored as `scheme_ids: string[]` and may
legally hold two copies of the same card, so a card id does not identify a board
position.

Life is seeded at game start: 40 for `archenemyId`, 20 for every other player. It
is shown whenever `state.archenemy` exists, so the combined mode gets it too.

## 4. Engine

`src/lib/game/engine.ts`. New actions:

```ts
| { type: 'SET_SCHEME_IN_MOTION' }
| { type: 'DISMISS_SCHEME'; instanceId: string }
| { type: 'END_ARCHENEMY_TURN' }
| { type: 'ADJUST_LIFE'; playerId: string; delta: number }
| { type: 'SET_LIFE'; playerId: string; value: number }
```

`DRAW_SCHEME` and `ABANDON_SCHEME` are removed.

**`SET_SCHEME_IN_MOTION`** — returns state unchanged when there is no `archenemy`
slice or `schemeDeck` is empty. Otherwise shifts the top card, appends an
`InMotionScheme` to the front of `schemesInMotion`, and increments
`schemesPlayed`. It remains available as a button for the whole game: some cards
instruct the archenemy to set a scheme in motion outside the normal timing, and it
is the recovery path when the table taps ahead by mistake.

**`DISMISS_SCHEME`** — removes the entry with the given `instanceId` and appends
its card to the end of `schemeDeck`. Unknown `instanceId` returns state unchanged.
One action covers both resolve and abandon; the board chooses the button label
from `card.isOngoing`. The two are the same state transition, and modelling them
as one action means an abandon and a resolve undo identically.

**`END_ARCHENEMY_TURN`** — flips `side`. Flipping *to* `archenemy` also increments
`turnNumber` and applies `SET_SCHEME_IN_MOTION`'s transition in the same reducer
step, so one tap produces one undo step rather than two. Flipping to `team` only
flips the side. This action is only meaningful in `archenemy` mode; in `both` mode
the existing per-player `END_TURN` continues to drive turns and the archenemy's
scheme is set in motion from the board's manual button.

**`ADJUST_LIFE` / `SET_LIFE`** — write `life[playerId]`. `ADJUST_LIFE` applies a
delta; `SET_LIFE` writes an absolute value for direct entry. Life is not clamped
at zero: the format has effects that take a player below zero, and clamping would
hide that from the table.

**Nothing about losing is automatic.** Reaching 0 or less life never eliminates a
player or ends a game by itself; it only surfaces a prompt the host confirms.
A hero at or below 0 gets an eliminate prompt, and elimination reuses the existing
`ELIMINATE_PLAYER` / `RESTORE_PLAYER` actions and `eliminatedPlayerIds`, so a
misclick is reversible. When every hero is eliminated, the board offers
"Archenemy wins"; when the archenemy is eliminated or at or below 0 life, it
offers "Heroes win". Both are prompts, and the host ends the game.

**Undo** — all five new actions snapshot into `stateHistory`. The existing
skip-history list (`PLANESWALK`, `SETTLE_DIE`, the reveal and reorder actions) is
plane-only and is unchanged.

**Plane-action guards** — `PLANESWALK`, `PLANESWALK_NO_LEAVE`,
`RESOLVE_SPATIAL_MERGE`, `RESOLVE_PHENOMENON`, `SHUFFLE_REMAINING`,
`REORDER_TOP` and `REORDER_BOTTOM` return state unchanged when
`deck.length === 0`. In practice these fire only in `archenemy` mode, where the
deck is empty by construction; in `planechase` and `both` the deck is non-empty
and behaviour is exactly as it is today.

`END_TURN` guards differently: on `config.mode === 'archenemy'` and on an empty
`turnOrder`. Its plane lookups are already optional-chained and degrade safely,
so the genuine hazard there is `% turnOrder.length` yielding `NaN` — and an
empty deck is not the right signal, since existing tests legitimately drive
`END_TURN` against a stub state with no deck.

## 5. UI

`/game` splits into a router and per-mode boards:

| Component | Responsibility |
|-----------|----------------|
| `src/app/game/page.tsx` | Mode routing, session sync, dialogs, storage |
| `src/components/game/planechase-board.tsx` | Plane card, die, chaos and reveal overlays |
| `src/components/game/archenemy-board.tsx` | Standalone Archenemy screen |
| `src/components/game/scheme-board.tsx` | The list of schemes in motion, shared by both modes |
| `src/components/game/life-tracker.tsx` | Life chips and the adjustment pad |

The existing page is 736 lines; extraction shrinks it rather than adding a third
mode's worth of conditionals to it.

### 5.1 Archenemy-only board

With no plane card competing for the screen, the schemes are the screen.

- **Header** — turn state is the dominant element: "Archenemy's Turn · Turn 4" or
  "Heroes' Turn", with a `Schemes: 14 left` counter reading `schemeDeck.length`.
- **Newest scheme** — `schemesInMotion[0]` rendered as a full card via the
  existing `SchemeCard` component with `border_crop` art, carrying its own
  `Resolve` / `Abandon` button. It persists; there is no auto-hide timeout.
- **Board** — the *remaining* entries, `schemesInMotion.slice(1)`, as compact
  rows: `art_crop` thumbnail, name, and an `Ongoing` badge in
  `var(--color-gold)` where `card.isOngoing`. Newest first. Tapping a row opens
  the full card with its `Resolve` or `Abandon` button. Clearing the newest
  scheme promotes the next one into the full-card slot.

  A vertical list rather than a horizontal rail: the board has to stay scannable
  at 375px whether two ongoing schemes are out or nine, and vertical scroll is the
  natural mobile gesture. There is no cap on simultaneous schemes.
- **Footer** — `End Archenemy Turn` / `End Heroes' Turn` as the primary action,
  `Set Scheme in Motion` as secondary, and the existing game-controls toolbar
  (undo, end game) unchanged.
- **Life** — a collapsible chip row, the archenemy's chip visually distinct from
  the heroes'. Tapping a chip opens a +/- pad with direct entry. An eliminated
  hero's chip is dimmed with a restore control.

### 5.2 Combined mode

The plane card and die keep the screen. `<SchemeBoard>` moves behind a
`Schemes (3)` pill that opens a bottom sheet, replacing today's inline bar that
squeezes the plane card to `max-h-[300px]`. Same component, different container.

### 5.3 Setup

`/setup` gains a three-way mode selector at the top. Selecting Archenemy hides
deck size, plane exclusions, and type/subtype filters, and shows archenemy
designation, hero names, and scheme deck choice. Each mode's controls move into
their own component so the 895-line page shrinks.

Pod selection stays available as a source of player names but is not required. No
archenemy threshold, no `last_archenemy_user_id` back-to-back check, and no
leaderboard lookup gates a standalone game — that machinery stays exclusive to the
pod-triggered conquest path.

## 6. Persistence, sync, and end of game

**Wire format** (`src/lib/game/wire-state.ts`). `WireArchenemyState` drops
`currentSchemeIndex` and `activeSchemes`. It keeps `schemeDeckIds` as bare ids —
a spectator never needs the draw pile's card data — and carries `schemesInMotion`
inlined in full, because a spectator must be able to read every face-up scheme.
`side`, `turnNumber` and `life` are carried as-is. In Archenemy-only mode
`deckIds` and `visibleCards` are empty arrays and `deckCount` is 0.

**Legacy tolerance.** `fromWireState` and `loadGameState` translate a pre-change
payload forward: `activeSchemes` becomes `schemesInMotion` entries with generated
`instanceId`s, `currentSchemeIndex` is dropped, `config.mode` is derived as
`isArchenemy ? 'both' : 'planechase'`, and `side` defaults to `'archenemy'` with
`turnNumber` 1. This follows the precedent already set by `isLegacyState`, so a
game in flight when this ships keeps rendering instead of going blank.

**End of game.** A standalone game ends through a simple dialog recording the
winning side and turn count to game history. No plane transfer, no pod
requirement, and `ArchenemyEndDialog` is not involved — it stays on the
pod-triggered path where the conquest stakes live.

**Achievements.** `villain_origin` and `supervillain` count Archenemy sessions and
so include standalone games. Nothing plane- or conquest-scoped is granted, because
a standalone game visits no planes and touches no pod.

## 7. Error handling

| Condition | Behaviour |
|-----------|-----------|
| `SET_SCHEME_IN_MOTION` with every card already in motion | No-op; board shows "All schemes are in motion" |
| `DISMISS_SCHEME` with an unknown `instanceId` | No-op; state returned unchanged |
| Plane action dispatched with an empty deck | No-op; state returned unchanged |
| Archenemy mode started with an empty scheme corpus or empty selected deck | Setup blocks the start with an explanatory message; the game is unplayable without schemes |
| Legacy `game_state` payload from before this change | Translated forward on read; never throws |
| Life adjusted for an unknown player id | No-op |

## 8. Testing

**Engine unit tests** (`src/lib/game/engine.test.ts`):

- A cleared scheme lands at the bottom of `schemeDeck`, for both ongoing and
  one-shot cards.
- Out-of-order clearing: set three schemes in motion, clear the middle one, and
  assert deck order and board contents. This is the case the old index-modulo
  model got wrong.
- Deck exhaustion: every card in motion makes `SET_SCHEME_IN_MOTION` a no-op;
  clearing one card makes it work again.
- `END_ARCHENEMY_TURN` flipping to `archenemy` sets a scheme in motion and
  increments `turnNumber`; flipping to `team` does neither.
- A single undo after `END_ARCHENEMY_TURN` reverts both the flip and the scheme.
- Two copies of the same scheme in motion are cleared independently by
  `instanceId`.
- Every plane action returns state unchanged on an empty deck.
- `ADJUST_LIFE` and `SET_LIFE` write the right player and allow negative totals.

**Wire-state tests** (`src/lib/game/wire-state.test.ts`):

- Round-trip of an Archenemy-only state with an empty deck and several schemes in
  motion.
- A legacy payload carrying `activeSchemes` and `currentSchemeIndex` reads back
  with populated `schemesInMotion` and a derived `config.mode`.

**Playwright** (375px viewport): start a standalone Archenemy game from setup,
take several archenemy turns, confirm schemes accumulate on the board, abandon an
ongoing scheme from the middle of the stack, and confirm the deck counter and
board update.

## 9. Files touched

| File | Change |
|------|--------|
| `src/lib/game/types.ts` | `GameMode`, `InMotionScheme`, reshaped `ArchenemyState`, `life`, new actions |
| `src/lib/game/engine.ts` | New scheme/turn/life actions, plane-action guards |
| `src/lib/game/engine.test.ts` | Tests above |
| `src/lib/game/wire-state.ts` | `WireArchenemyState` reshape, legacy translation |
| `src/lib/game/wire-state.test.ts` | Tests above |
| `src/lib/game/session-storage.ts` | Legacy translation on load |
| `src/app/setup/page.tsx` | Mode selector; per-mode controls extracted |
| `src/app/game/page.tsx` | Reduced to mode routing and session concerns |
| `src/components/game/*` | New board, scheme board, life tracker components |
| `src/components/scheme-card.tsx` | `Resolve` / `Abandon` labelling by `isOngoing` |
| `src/lib/rules/content.ts`, `src/lib/faq/content.ts` | Document the standalone mode and scheme lifecycle |

No migration. No change to `ArchenemyEndDialog`, `archenemy-picker`, pod queries,
or the conquest event log.
