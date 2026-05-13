# Roadmap: PlaneChaser

## Overview

PlaneChaser ships in five vertical slices, each delivering a complete user-facing capability. Phase 1 establishes the working Planechase game loop — the minimum viable product a group can sit down and play. Phase 2 adds the conquest meta-game and pods, making every Commander win matter. Phase 3 unlocks Archenemy mode, the climactic event that conquest triggers. Phase 4 gives players a persistent identity: their conquered territory gallery and lifetime stats. Phase 5 closes the loop with achievements that reward exploration, conquest, and Archenemy moments across all prior systems.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Planechase Core** - Playable Planechase game loop: auth, card display, animated die roller, session persistence
- [ ] **Phase 2: Conquest + Pods** - Conquest meta-game and pod/playgroup tracking with leaderboard
- [ ] **Phase 3: Archenemy Mode** - Full Archenemy format: scheme cards, turn structure, dethrone vote
- [ ] **Phase 4: Profile + History** - Player profile with conquered territory gallery and lifetime stats
- [ ] **Phase 5: Achievements** - Async achievement evaluation and in-game badge notifications

## Phase Details

### Phase 1: Planechase Core
**Goal**: Players can sit down, log in on a shared device, configure a Planechase game, and play a full session — rolling the planar die, drawing plane cards with official art, tracking chaos escalation, and persisting state across tab switches.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SETUP-01, SETUP-02, SETUP-03, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password or Google OAuth and stay logged in for 4+ hours without re-authenticating
  2. User can start a new Planechase game by specifying player count and deck size, optionally excluding previously visited planes
  3. The current plane card displays with official Scryfall art loaded directly from the CDN (no server proxy)
  4. User can roll the planar die with animation; the app resolves Planeswalk, Chaos, and Blank correctly including chaos cost escalation
  5. Closing or switching away from the tab preserves full game state; re-opening the app prompts "Resume Game"
**Plans**: TBD
**UI hint**: yes

### Phase 2: Conquest + Pods
**Goal**: Winning players can conquer the current plane, accumulate a collection within a pod, and track standings on a pod leaderboard — and when a player hits the Archenemy threshold, the pod is notified that the next game is an Archenemy showdown.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CONQ-01, CONQ-02, CONQ-03, CONQ-04, CONQ-05, CONQ-06, CONQ-07, POD-01, POD-02, POD-03, POD-04, POD-05, POD-06
**Success Criteria** (what must be TRUE):
  1. At game end, the winning player can conquer the current plane; the plane appears in their profile collection
  2. User can create a named pod, invite players by username or link, and configure the Archenemy threshold and status-loss rule
  3. Pod leaderboard shows conquered plane counts for all members with accurate, real-time standings
  4. When a player's conquered count reaches the pod threshold, the app notifies the pod and flags the next session as an Archenemy game
  5. Conquest history is queryable as an append-only event log with full ownership transfer audit trail
**Plans**: TBD
**UI hint**: yes

### Phase 3: Archenemy Mode
**Goal**: A flagged Archenemy game plays under full Archenemy rules — the Archenemy player sees scheme cards each turn, the layout reflects team vs. Archenemy format, and the outcome (Archenemy win or team dethrone) resolves conquest transfers correctly.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Archenemy game screen shows the team-vs-Archenemy layout with the correct player designated as Archenemy
  2. At the start of each Archenemy turn, a random scheme card with Scryfall art is drawn and displayed; ongoing vs. abandoned schemes are tracked visually
  3. If the team wins, all team members can vote on which of the Archenemy's conquered planes to steal, and the majority vote transfers ownership correctly
  4. If the Archenemy wins, they gain the current plane (added to their collection via the conquest event log)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Profile + History
**Goal**: Players have a persistent identity page showing their conquered territory gallery, lifetime gameplay stats, and full plane visit history across all sessions.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. User can view a visual grid of all planes they currently own, each displaying the plane's official Scryfall art
  2. User can view accurate lifetime stats: total games played, total planewalk rolls, planes conquered, times as Archenemy, times dethroned
  3. User can scroll their full plane visit history across all past sessions (every plane ever landed on)
  4. User's earned achievement badges are visible on their profile page (populated once Phase 5 ships)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Achievements
**Goal**: The app evaluates and awards approximately 25-30 achievement badges across plane-visit, game, die-roll, conquest, and Archenemy categories — asynchronously post-session, with anti-exploit guards — and displays an in-game notification the moment an achievement is earned.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: ACHV-01, ACHV-02, ACHV-03, ACHV-04, ACHV-05, ACHV-06, ACHV-07, ACHV-08
**Success Criteria** (what must be TRUE):
  1. After a qualifying session ends, the server async-evaluates all achievement criteria and awards any newly earned badges to the correct player account
  2. Achievement evaluation cannot be gamed by short sessions or solo play (server-side session verification with minimum session length and player count guards)
  3. When an achievement is earned, the player sees an in-game notification with the badge name and description
  4. All achievement categories fire correctly: plane-visit milestones, specific-plane visits, game milestones, die-roll streaks, conquest milestones, and Archenemy milestones
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Planechase Core | 0/TBD | Not started | - |
| 2. Conquest + Pods | 0/TBD | Not started | - |
| 3. Archenemy Mode | 0/TBD | Not started | - |
| 4. Profile + History | 0/TBD | Not started | - |
| 5. Achievements | 0/TBD | Not started | - |
