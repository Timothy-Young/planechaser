# PlaneChaser

## What This Is

PlaneChaser is a mobile-friendly web companion app for Magic: The Gathering players who use the Planechase and Archenemy formats. Players share one device during a game to draw random plane cards, roll the planar die, and track game state. Across sessions, a persistent conquest meta-game lets players claim planes by winning Commander games — and when one player dominates enough, the entire pod escalates into an Archenemy showdown.

## Core Value

The conquest meta-game that turns every Commander game into a campaign — planechasers become conquerors, and conquerors become archenemies.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create an account and log in
- [ ] User can create a Planechase game session (set player count, deck size, exclude visited planes)
- [ ] App draws random plane cards with official art via Scryfall API
- [ ] App animates and resolves planar die rolls (Planeswalk, Chaos, Blank, chaos cost escalation)
- [ ] App tracks per-session and lifetime plane visit history
- [ ] Winning player can "conquer" the current plane, adding it to their account collection
- [ ] When a player reaches 5+ conquered planes, Archenemy mode is triggered
- [ ] Archenemy game displays scheme cards (via Scryfall) each turn
- [ ] App follows full Archenemy rules (team vs. Archenemy)
- [ ] If team defeats Archenemy, team votes on which conquered plane(s) to steal
- [ ] If Archenemy wins, they gain the current plane
- [ ] Archenemy status-loss threshold is configurable per pod
- [ ] Players can create or join named pods/playgroups for shared meta-game tracking
- [ ] Comprehensive achievements and badges for Planechase and Archenemy milestones
- [ ] App is mobile-first and usable on a shared phone or tablet

### Out of Scope

- Real-time multiplayer sync across devices — one shared device per game session
- Full deck-building features — card management is not in scope
- Non-Planechase or non-Archenemy MTG formats
- Monetization or premium features for v1

## Context

- **Format rules**: Planechase (https://magic.wizards.com/en/formats/planechase) — players share a deck of Plane cards and a planar die; chaotic effects change the game as planes change. Archenemy (https://magic.wizards.com/en/formats/archenemy) — one player with scheme cards vs. a team.
- **Card data**: Scryfall API (https://scryfall.com/docs/api) provides free, comprehensive MTG card data including all Planechase Plane cards and Archenemy Scheme cards with high-resolution images.
- **Planar die faces**: 1× Planeswalk (draw next plane), 1× Chaos (trigger current plane's chaos ability), 4× blank. Players may pay {1} per extra roll after the first each turn (escalating).
- **Device model**: One shared device (phone/tablet) sits in the center of the table. All players interact with it.
- **Account model**: Individual accounts required — conquest and achievement data is account-bound. Optional pod/playgroup grouping adds leaderboards and shared meta-game context.

## Constraints

- **Tech**: Scryfall API must be used for card images and data — no self-hosted card database
- **Legal**: Must comply with Scryfall's terms of use and Wizards of the Coast's fan content policy for card art display
- **Mobile**: Must be fully usable on a 375px-wide phone screen with touch-friendly controls
- **Performance**: Plane card images must load quickly; lazy loading and caching required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scryfall for card data | Free, comprehensive, widely used by MTG community apps | — Pending |
| Accounts required (no guest play) | Conquest and achievement features require persistent identity | — Pending |
| One shared device (not real-time sync) | Dramatically reduces complexity; fits how groups actually play at a table | — Pending |
| Archenemy threshold (5 planes) configurable per pod | Different pods have different play cadences; flexibility is a feature | — Pending |
| Team votes on stolen planes | Adds drama and group decision-making to the dethrone moment | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after initialization*
