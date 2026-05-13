# Feature Landscape

**Domain:** MTG Companion App — Planechase + Archenemy formats with conquest meta-game
**Researched:** 2026-05-13
**Confidence:** MEDIUM — Planechase/Archenemy rules are HIGH (official documentation + domain expertise). Existing app landscape is MEDIUM (training data; no live search available). Novel conquest meta-game is first-party requirements with no comparables.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plane card display with official art | The entire point of the app — players need to see the card in play | Medium | Scryfall API required; lazy loading mandatory due to image size |
| Planar die roller with animated result | Replaces physical die; must clearly show Planeswalk / Chaos / Blank | Low | 6 faces: 1× Planeswalk, 1× Chaos, 4× Blank; animation builds excitement |
| Chaos cost escalation tracker | Per official rules, each re-roll costs {1} more per extra roll per turn | Low | Simple integer counter per turn; reset each turn |
| Draw next plane (Planeswalk) | Navigate to a new random plane; never revisit planes in the current stack | Medium | In-session deck management; reshuffle when exhausted |
| Current plane name + chaos ability text | Players need to read the chaos ability without a physical card in hand | Low | Scryfall card object provides oracle text |
| Session start / session end flow | Players must configure a game before it starts and cleanly end it | Low | Player count, optional plane exclusions |
| Plane visit history (current session) | "What planes have we been to?" is asked every game | Low | Ordered list in session state |
| Mobile-first layout (375px+) | Shared phone at the table is the explicit device model | Medium | Large touch targets, no hover states, landscape + portrait |
| Responsive to table orientation | Shared device is picked up, rotated, passed around | Low | Portrait primary; no forced orientation |
| Fast image load / caching | A 10-second wait mid-game kills the experience | Medium | Prefetch next N planes; cache visited cards |
| Archenemy scheme card display | Show current scheme with full art and oracle text | Medium | Same Scryfall pattern as planes |
| Archenemy turn flow | Draw scheme at start of Archenemy's turn; set aside ongoing schemes | Medium | "Ongoing" vs "abandoned" scheme state |
| Team vs. Archenemy player identification | App must know who is the Archenemy vs. who is the team | Low | Single designation at game start |
| Player accounts (persistent identity) | Conquest and achievements are meaningless without identity | Medium | Auth required; no guest mode per PROJECT.md |

---

## Differentiators

Features that set PlaneChaser apart. Not expected, but highly valued.

### The Conquest Meta-Game (Core Differentiator)

This is the feature that does not exist in any known MTG companion app. It transforms a per-game utility into a campaign platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Conquer a plane on game win | Winning player claims the current plane as a persistent trophy | Medium | Writes to account; plane card stored in "territory" |
| Player territory view | Show each player's conquered planes as a visual collection | Medium | Gallery of plane cards owned by each player |
| Archenemy threshold trigger | When a player reaches N conquered planes (default 5, configurable), Archenemy mode is unlocked for the pod | Medium | Threshold is per-pod configurable per PROJECT.md |
| Pod/playgroup creation and management | Named groups with shared leaderboards and meta-game context | Medium | Pod-level threshold config; shared conquest history |
| Pod leaderboard | Rank players in a pod by conquered planes count | Low | Derived from territory data; simple sort |
| Archenemy dethrone mechanic — team wins | Team votes on which conquered plane(s) to steal from the defeated Archenemy | High | Multi-step UX: vote UI, conflict resolution, transfer |
| Archenemy dethrone mechanic — archenemy wins | Archenemy gains the current plane (a second conquest vector) | Low | Same conquest write path; different trigger |
| Archenemy status loss threshold (configurable) | Different pods have different play cadences | Low | Pod-level config; single integer setting |
| Lifetime plane visit history (cross-session) | See everywhere you've ever been in the Multiverse | Low | Append to account history each session |
| Conquest trophy display | Conquered planes shown prominently on player profile | Low | Visual reward; motivates play |

### Achievements and Milestone Rewards

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Planechase achievements | e.g., "Chaotic Neutral" (trigger chaos 10 times), "World Traveler" (visit 20 distinct planes) | Medium | Event-driven badge system; define ~15-20 achievements |
| Archenemy achievements | e.g., "Lone Wolf" (win as Archenemy), "United Front" (defeat Archenemy as team) | Medium | Additional ~10 Archenemy-specific achievements |
| Conquest achievements | e.g., "Warlord" (conquer 10 planes), "Dethroned" (lose conquered planes) | Low | Tied to conquest event system |
| Achievement notification UX | In-game toast/modal at the moment of unlocking | Medium | Must not interrupt active game flow |

### Session Quality-of-Life

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Plane exclusion list | Exclude specific planes (e.g., universally hated "Interplanar Tunnel") | Low | Checkbox list at session start |
| Chaos visual effect | Animate chaos trigger distinctly from planeswalk | Low | Distinct color/animation; builds table energy |
| Plane flavor text display | Adds MTG lore richness to the experience | Low | Scryfall provides flavor text |
| Previous plane peek | "What was the last plane?" without navigating away | Low | Single tap overlay |
| Die roll history (session) | See the last N rolls in this session | Low | Append to session log |

---

## Anti-Features

Features to explicitly NOT build in v1 (and reasoning).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time multi-device sync | Dramatically increases complexity (WebSockets, conflict resolution, latency); one shared device fits how groups actually play | One shared device is the explicit model per PROJECT.md |
| Deck builder / card search | Scope creep; Moxfield, Archidekt already do this better; distracts from conquest meta-game | Link out to Scryfall for individual card lookup if needed |
| Non-Planechase/Archenemy formats | Commander life tracking, etc. already saturated (SpellTable, MTG Companion app) | Out of scope per PROJECT.md |
| In-app card trading or purchases | Legal exposure with WotC; far outside scope | Out of scope |
| AI deck suggestions or card recommendations | Not relevant to game companion; scope creep | Out of scope |
| Social feed / public profiles | Privacy concerns; adds moderation burden; not useful at the table | Pods provide sufficient social layer |
| Monetization / premium tiers (v1) | Adds complexity; reduces adoption; validate first | Out of scope per PROJECT.md |
| Custom plane card creation | WotC IP concerns; community homebrew is separate ecosystem | Out of scope |
| Offline-first with full sync | Complex conflict resolution; PWA cache for assets is sufficient | Cache Scryfall images; light offline gracefully |

---

## Feature Dependencies

```
Account/Auth
  └── Pod/Playgroup membership
        └── Pod-level threshold config
        └── Pod leaderboard
        └── Conquest tracking (per player, per pod)
              └── Archenemy threshold trigger
                    └── Archenemy game mode
                          └── Dethrone mechanic (steal planes)
              └── Conquest trophy display
              └── Conquest achievements

Planechase session (core loop)
  └── Plane card display (Scryfall)
  └── Planar die roller
        └── Chaos cost escalation (per-turn counter)
        └── Planeswalk → draw next plane
  └── Session plane visit history
        └── Lifetime plane visit history (persisted to account)
  └── Plane exclusion list (session config)
  └── Conquer plane (on game win → writes to account)
        └── Triggers achievement evaluation
        └── Triggers Archenemy threshold check

Archenemy session (escalation of conquest)
  └── Scheme card display (Scryfall)
  └── Team vs. Archenemy state
  └── Ongoing scheme state tracking
  └── Dethrone outcome handling
        └── Team vote on plane theft
        └── Plane transfer between accounts

Achievement system
  └── Event bus from: die rolls, plane visits, conquests, archenemy outcomes
  └── In-game notification UX
```

---

## MVP Recommendation

The MVP must deliver the conquest loop end-to-end, even if other features are sparse. Without conquest working, PlaneChaser is just another Planechase die roller (and several of those already exist).

**Prioritize in order:**

1. Auth + Pods — identity and social context for meta-game
2. Planechase session core — plane display, die roller, chaos escalation, planeswalk
3. Plane conquest on win — the defining mechanic; must work before Archenemy
4. Archenemy threshold + mode — the escalation climax of the meta-game
5. Archenemy session — scheme display, team/archenemy flow, dethrone
6. Achievements — reward layer that reinforces all of the above

**Defer to post-MVP:**

- Die roll history (nice, not essential)
- Flavor text display (polish, not function)
- Lifetime cross-session plane history (useful, can be added without schema changes)
- Advanced pod leaderboard sorting/filtering (basic sort is sufficient for v1)
- Plane exclusion list (useful but not table stakes — can be added post-launch)

---

## Existing App Landscape

**Confidence: MEDIUM** — Based on training data; live app store survey unavailable.

### What Exists (as of training cutoff)

| App | Strength | Gap |
|-----|----------|-----|
| MTG Companion (official WotC) | Life tracking, event registration, collection | No Planechase/Archenemy support at all |
| Companion for MtG (third-party) | Life counter, Planechase die roller | No conquest meta-game, no persistence, basic UI |
| Spellfire / various Planechase die apps | Simple die roller | No card display, no persistence, no accounts |
| SpellTable (WotC) | Remote play video | No Planechase support |
| MTG Life Counter apps (generic) | Life tracking | No format-specific features |

**Key gap PlaneChaser fills:** No existing app combines Planechase card management + Archenemy support + persistent cross-session conquest meta-game. The conquest mechanic is genuinely novel in this space.

### UX Patterns for Shared-Device Table Play

Observed patterns from companion apps used on a shared device:

- **Center-screen primary action** — the die roll button must be the dominant element; secondary info (plane text) is scrollable below
- **High contrast, readable at arm's length** — users often look at the screen from across a small table
- **One-tap primary actions** — rolling the die, resolving planeswalk must be single taps; no buried menus during play
- **Confirmation dialogs only for destructive/consequential actions** — "Conquer this plane?" and "End game?" warrant confirmation; "Roll die" does not
- **Session state persists on accidental close** — closing the browser tab mid-game should not lose game state; restore from localStorage/session store
- **Minimal text entry during play** — selecting players from a list, not typing names, during Archenemy mode setup

---

## Sources

- Magic: The Gathering official Planechase format rules: https://magic.wizards.com/en/formats/planechase (HIGH confidence — official)
- Magic: The Gathering official Archenemy format rules: https://magic.wizards.com/en/formats/archenemy (HIGH confidence — official)
- Scryfall API documentation: https://scryfall.com/docs/api (HIGH confidence — official; planes filterable by `type:plane`, schemes by `type:scheme`)
- Existing app landscape: MEDIUM confidence — training data, no live app store survey performed (WebSearch unavailable in this environment)
- PlaneChaser PROJECT.md requirements: HIGH confidence — first-party authoritative source
