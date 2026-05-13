# Requirements: PlaneChaser

**Defined:** 2026-05-13
**Core Value:** The conquest meta-game that turns every Commander game into a campaign — planechasers become conquerors, and conquerors become archenemies.

---

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can create an account with email and password
- [ ] **AUTH-02**: User can sign in with Google (Gmail OAuth)
- [ ] **AUTH-03**: User can log in and stay logged in across sessions (session persists 4+ hours to survive a Commander game)
- [ ] **AUTH-04**: User can log out from any screen
- [ ] **AUTH-05**: User is shown a WotC fan content policy disclaimer and app credits on first launch

### Game Setup

- [ ] **SETUP-01**: User can create a new Planechase game session specifying player count and plane deck size
- [ ] **SETUP-02**: User can optionally exclude previously visited planes when building the game deck
- [ ] **SETUP-03**: User can optionally enable a win condition for the session

### Planechase Gameplay

- [ ] **GAME-01**: App displays the current plane card with official card art loaded from the Scryfall CDN
- [ ] **GAME-02**: User can roll the planar die with animation; app resolves the result (Planeswalk, Chaos, or Blank)
- [ ] **GAME-03**: App tracks and displays the chaos cost escalation counter (increasing {1} cost per extra roll per turn)
- [ ] **GAME-04**: App draws the next random plane when Planeswalk is rolled, animating the card transition
- [ ] **GAME-05**: App displays the current plane's chaos ability text when Chaos is rolled
- [ ] **GAME-06**: All game session state persists across tab switches and accidental closes (sessionStorage); app offers "Resume Game" on load
- [ ] **GAME-07**: User can view a per-session log of all die results and plane transitions
- [ ] **GAME-08**: User can end the game session and declare which player (if any) won

### Archenemy Mode

- [ ] **ARCH-01**: When a player is designated as the Archenemy, the game screen reflects the Archenemy format (team vs. Archenemy layout)
- [ ] **ARCH-02**: At the start of each Archenemy turn, the app draws and displays a random scheme card with Scryfall art
- [ ] **ARCH-03**: App tracks which scheme cards are ongoing (in play) vs. abandoned (set aside)
- [ ] **ARCH-04**: App enforces Archenemy turn structure (Archenemy acts alone against the team)

### Conquest Meta-Game

- [ ] **CONQ-01**: At game end, the winning player can "conquer" the current plane, adding it to their persistent collection
- [ ] **CONQ-02**: Conquered planes are stored per player account and visible in their profile
- [ ] **CONQ-03**: When a player's conquered plane count reaches the pod's Archenemy threshold, the app notifies the pod and flags the next game as an Archenemy game
- [ ] **CONQ-04**: If the Archenemy wins the Archenemy game, they gain the current plane (added to their collection)
- [ ] **CONQ-05**: If the team defeats the Archenemy, all team members vote on which of the Archenemy's conquered planes to steal
- [ ] **CONQ-06**: The plane voted for by the team majority transfers from the Archenemy's collection to the player who cast the winning vote (or distributed per pod rules)
- [ ] **CONQ-07**: Conquest history is stored as an append-only event log (support for ownership transfers and audit trail)

### Pods / Playgroups

- [ ] **POD-01**: User can create a named pod/playgroup and invite other players by username or link
- [ ] **POD-02**: User can join a pod via invite
- [ ] **POD-03**: Pod creator can configure the Archenemy threshold (default: 5 conquered planes)
- [ ] **POD-04**: Pod creator can configure whether Archenemy status is lost immediately when the player drops below the threshold
- [ ] **POD-05**: User can view a pod leaderboard showing conquered plane counts for all pod members
- [ ] **POD-06**: Player's conquest progression is tracked within each pod they belong to

### Profile & History

- [ ] **PROF-01**: User can view their conquered planes gallery — a visual grid of all planes they currently own
- [ ] **PROF-02**: User can view lifetime stats (total games played, total planewalk rolls, planes conquered, times as Archenemy, times dethroned)
- [ ] **PROF-03**: User can view their full plane visit history across all sessions (every plane ever landed on)
- [ ] **PROF-04**: User can view their achievement badges on their profile page

### Achievements

- [ ] **ACHV-01**: App awards plane-visit milestone achievements (e.g., visit 10, 50, 100 unique planes; visit every plane)
- [ ] **ACHV-02**: App awards specific-plane achievements (e.g., land on Zendikar, Ravnica, Phyrexia)
- [ ] **ACHV-03**: App awards game milestone achievements (e.g., play 5 games, play a 4-player game, win first game)
- [ ] **ACHV-04**: App awards die-roll streak achievements (e.g., roll Chaos 3 times in a row, Planeswalk 5 times in one game)
- [ ] **ACHV-05**: App awards conquest achievements (e.g., conquer first plane, own 5 planes, own 10 planes, own every plane in a set)
- [ ] **ACHV-06**: App awards Archenemy achievements (e.g., first time as Archenemy, defeat the team, get dethroned, steal a plane)
- [ ] **ACHV-07**: App displays an in-game achievement notification when an achievement is earned
- [ ] **ACHV-08**: Achievement evaluation runs async post-session and cannot be exploited by short/solo sessions

---

## v2 Requirements

### Authentication

- **AUTH-V2-01**: User can log in with Discord (OAuth)
- **AUTH-V2-02**: User can link multiple auth providers to one account

### Social

- **SOCL-V2-01**: User can follow other players and see their recent conquests
- **SOCL-V2-02**: Global leaderboard (top conquerors across all pods)

### Gameplay

- **GAME-V2-01**: Plane exclusion list editor (blacklist specific planes for all games in a pod)
- **GAME-V2-02**: Custom plane deck presets (save a named deck configuration for reuse)
- **GAME-V2-03**: Planechase Anthology card support (additional plane sets beyond original)

### PWA / Offline

- **PWA-V2-01**: Full offline mode — pre-cache all plane and scheme images on first load
- **PWA-V2-02**: Push notifications for pod activity (someone conquered a plane, Archenemy game triggered)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time multi-device sync | One shared device per game session — sync adds complexity with no UX benefit at the table |
| Deck building / collection management | MTG deck tools are a separate domain; not core to Planechase companion value |
| Non-Planechase formats (Commander tracker, etc.) | Out of focus for v1; Planechase + Archenemy is the complete format pair |
| Monetization, premium tiers, ads | WotC Fan Content Policy prohibits commercial use of card images |
| Native iOS/Android app | PWA covers the mobile use case; app stores add review friction for v1 |
| Full MTG rules engine / card text lookup | Users know their cards; the app tracks game state, not rules |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 – AUTH-05 | Phase 1 | Pending |
| SETUP-01 – SETUP-03 | Phase 1 | Pending |
| GAME-01 – GAME-08 | Phase 1 | Pending |
| ARCH-01 – ARCH-04 | Phase 2 | Pending |
| CONQ-01 – CONQ-07 | Phase 2 | Pending |
| POD-01 – POD-06 | Phase 2 | Pending |
| PROF-01 – PROF-04 | Phase 3 | Pending |
| ACHV-01 – ACHV-08 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---

*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after initial definition*
