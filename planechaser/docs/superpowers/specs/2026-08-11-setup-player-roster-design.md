# Setup player roster — design

Date: 2026-08-11
Status: approved, ready to implement

## Problem

The setup screen names players three different ways, and two of them name nobody.

- Plain Planechase offers a row of 2–6 count buttons. The game that results has exactly one player in it — the host — so every turn in the history logs as yours.
- Archenemy synthesises `Player 1…N` with editable text inputs, ids `local-1…local-N`.
- A pod game names people properly, but only through a second screen reached by the `Start game with <pod> →` link. Selecting a pod in the `Active Pod` dropdown names nobody.

So a player with a pod selected still sees "Player 1, Player 2" and has to discover a separate link to get real names. A player with friends but no pod has no way to name the table at all beyond typing.

## Goal

One roster that is exactly who is at the table, in every mode, prefilled from the pod when there is one, fillable from the friends list when there is not, and typeable when there is neither.

## Model

```ts
type SlotSource = 'self' | 'pod' | 'friend' | 'guest'

interface RosterSlot {
  /** Real user id for self, pod, and friend slots; `guest-N` otherwise. */
  id: string
  display_name: string
  source: SlotSource
}
```

The roster is an ordered `RosterSlot[]`. Its order is the play order. Its length is the player count. Membership is participation — a pod member who is not playing tonight is removed from the roster, not unchecked.

Pure module `src/lib/game/roster.ts`, no React:

| Function | Behavior |
|---|---|
| `fromPodMembers(members)` | Pod members in membership order, `source: 'pod'`. |
| `seedSolo(user)` | The signed-in user as slot 1 (`source: 'self'`), then `Player 2…N` guests. |
| `addSlot(roster, slot)` | Appends. No-op when the id is already present. |
| `removeSlot(roster, id)` | Drops the slot. |
| `renameSlot(roster, id, name)` | Guest slots only; pod, friend, and self names come from their profiles. |
| `fillSlot(roster, id, replacement)` | Swaps a slot in place, keeping its position. Used when a guest slot is filled from the friends list. |
| `reorder(roster, from, to)` | Moves one slot. |
| `toPlayers(roster)` | `Player[]` for game state — `{ id, display_name }`. |
| `canStart(roster, mode, designatedArchenemyId)` | Planechase needs 1, Archenemy needs 2 and a designation. |

Dedupe is by id, so a friend already on the roster cannot be added twice and a pod member cannot be re-added through the friends list.

## Behavior

**Pod selected.** The `Active Pod` dropdown drives the roster directly: choosing a pod fills it with that pod's members. Switching pods refills it, discarding manual edits — selecting a pod is an explicit act, and merge prompts are not worth the complexity. Choosing `No Pod (Solo)` drops the pod-sourced slots and keeps any friend and guest slots.

**No pod.** The roster seeds with the signed-in user as slot 1 so their own turns attribute to their account, followed by generic guest slots.

**Any slot** can be filled from the friends list, typed by hand, or removed, and `+ Add player` appends one.

**Identity.** Friend-filled slots carry the friend's real user id, exactly as pod slots do, so game history attributes their turns to their account. Conquest recording is unchanged and stays pod-scoped: a friend game credits nobody's conquest ledger.

**Minimums.** Planechase starts with 1 (solo play keeps working). Archenemy needs 2 and a designated archenemy.

## UI

One list in the config card, replacing the count buttons, the pod checkbox block, and the setup screen's use of `ArchenemyRoster`.

```
PLAYERS — TAP A NAME TO CHANGE          🎲 Randomize
┌────────────────────────────────────────────────┐
│ ① Jon Jones            [Make archenemy]   ▲▼   │
│ ② Will Turner          [Make archenemy]   ▲▼   │
│ ③ Player 3             [Make archenemy]   ▲▼   │
└────────────────────────────────────────────────┘
              + Add player
3 players · Jon goes first
```

`PlayerRoster` (`src/components/game/player-roster.tsx`):

- Order badge and up/down chevrons stay visible. Ordering is a repeated action and should not hide behind a menu. Randomize sits in the list header.
- The `Make archenemy` pill renders only in Archenemy and Both modes, with today's behavior.
- Tapping a name opens the slot sheet.
- `+ Add player` appends a guest slot and opens its sheet immediately.

`PlayerSlotSheet` (`src/components/game/player-slot-sheet.tsx`):

- Friends from `useFriends()`, with a filter input once the list passes 8 entries. Friends already on the roster are not offered.
- An "Or type a name" field for a guest.
- "Remove from this game".
- No friends and no pod: the name field and a link to `/friends`.
- Pod-sourced slot: only "Remove from this game". Their account name is theirs to change, not the host's.

Mobile: the row holds at most a badge, a name, one pill, and the chevron pair, which fits 375px. Everything else lives in the sheet.

`?podStart=true` remains a working deep link from the pods page — it preselects the pod and renders this same screen. The now-redundant `Start game with <pod> →` link is removed.

## Downstream

`startGame` builds `players` and `turnOrder` from the roster in every mode, and `config.playerCount` becomes the roster length. Local Planechase games therefore gain real per-player turn attribution, elimination, and "goes first" instead of collapsing to the host.

Unchanged: the multiplayer lobby builds its roster from real joiners and ignores the local roster, and `ArchenemyRoster` stays in place for it — the lobby's roster is genuinely non-editable, so the editable component would only carry inapplicable controls. Only the setup screen stops importing it.

No migration. Guest slots write `guest-N` ids into the session JSON, the same shape `local-N` already writes today for local Archenemy games. Implementation must confirm that no server-side achievement function assumes player ids are UUIDs rather than assuming it.

Deleted from `setup/page.tsx`: the count buttons, the pod checkbox block, the separate play-order block, `selectedPodPlayerIds`, `localPlayerNames`, `playerCount`, and the two effects that keep pod selection and play order in sync. The file is over 950 lines and doing too much; this is a net reduction.

## Testing

`src/lib/game/roster.test.ts` covers the pure module: seeding from pod members, seeding self when there is no pod, dedupe of a friend already rostered, remove, rename restricted to guest slots, fill-in-place, reorder, `toPlayers`, and `canStart` for each mode.

`src/components/game/player-roster.test.tsx` covers the interaction: tapping a name opens the sheet, picking a friend replaces that slot in place, already-rostered friends are absent from the list, and a pod slot offers only Remove.

## Risks

- Switching pods discards manual roster edits. Accepted.
- Removing the `Start game with <pod> →` link changes an existing habit. The deep link still works, and the dropdown now does the same job in one fewer tap.
- Local Planechase games change shape: they now carry every player rather than the host alone. This is the intended fix, but it changes what lands in game history for that mode.
