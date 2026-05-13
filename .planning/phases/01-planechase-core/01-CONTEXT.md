# Phase 1: Planechase Core - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can sit down, create accounts, log in on a shared device, configure a Planechase game with other account-holding players, and play a full session — rolling the planar die, drawing plane cards with official Scryfall art, tracking chaos escalation, and persisting state across tab switches. At game end, the host declares a winner by selecting from the player list.

This phase establishes the account model and player-identity foundation that Phase 2 conquest tracking builds on.

</domain>

<decisions>
## Implementation Decisions

### Player Identification

- **D-01:** Every player at the table must have a PlaneChaser account. There are no guest slots. Conquest tracking (Phase 2) requires account-bound identity from game 1.
- **D-02:** During game setup, the logged-in device host is auto-added as Player 1 (their account is already known). No need for the host to type their own username.
- **D-03:** Additional players are added by the host typing each player's PlaneChaser username. The app validates each username against Supabase before allowing game start. If a username is not found, show an inline error and block the game from starting until all usernames resolve to valid accounts.
- **D-04:** The game setup screen stores each player's `user_id` alongside their display name so that GAME-08 winner declaration and Phase 2 conquest claiming are account-linked, not name-linked.

### Claude's Discretion

- **Turn lifecycle:** Claude decides how the chaos escalation counter resets. Recommended: an "End Turn" tap resets the counter. Auto-reset on Planeswalk is acceptable. The UI-SPEC shows a "chaos counter strip" — implement reset logic per standard Planechase rules.
- **Plane deck behavior:** Claude decides per standard Planechase rules. Deck size (SETUP-01) controls how many planes are shuffled into the game deck. When the deck is exhausted, shuffle all planes back in and continue (infinite game). Scryfall pre-fetched corpus is the source.
- **Session persistence scope:** Claude decides a reasonable expiry. Recommended: offer Resume Game for sessions up to 24 hours old; older sessions are silently discarded (stale game from days ago is not worth resuming in practice).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/REQUIREMENTS.md` — All 40 v1 requirements; Phase 1 requirement IDs: AUTH-01–05, SETUP-01–03, GAME-01–08
- `.planning/ROADMAP.md` — Phase 1 goal and 5 success criteria

### Architecture and Technical Decisions
- `.planning/research/SUMMARY.md` — Synthesized architecture, stack rationale, and critical pitfalls (start here)
- `.planning/research/ARCHITECTURE.md` — Two-state architecture (ephemeral game state vs. persistent meta-game), conquest event log model, Scryfall delivery approach
- `.planning/research/PITFALLS.md` — 16 critical pitfalls; most critical for Phase 1: never proxy Scryfall images server-side, session state must survive tab switch, die roll state machine to prevent double-tap, WotC disclaimer required day one
- `.planning/research/STACK.md` — Full technology stack with version choices and rationale
- `.planning/phases/01-planechase-core/01-RESEARCH.md` — Phase-specific technical research: scaffold commands, Supabase SSR patterns, Scryfall corpus strategy, Framer Motion die config, verified npm versions, Nyquist validation architecture

### UI Design Contract
- `.planning/phases/01-planechase-core/01-UI-SPEC.md` — **APPROVED.** 6 screens fully specced: Auth, Game Setup, Game Screen, Die Roll Result Overlay, Session Roll Log, Resume Game Modal. Color tokens, typography (Russo One / Chakra Petch), spacing system, Framer Motion spring values, shadcn/ui component list, all copywriting, accessibility contract. Planner MUST follow this spec — no design decisions to make.

### Project Identity
- `CLAUDE.md` — Project constraints (Scryfall ToS, WotC fan content policy, 375px mobile, touch targets), full stack install commands, key version checklist

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None — this is Phase 1. Patterns established here become the baseline for all subsequent phases.

### Integration Points
- Supabase Auth → game session (host's session token authenticates the device; player username lookups use the same Supabase client)
- Player `user_id` array stored in `game_sessions` table → Phase 2 reads this for conquest claim eligibility
- sessionStorage game state schema → must include `players: [{ user_id, display_name }]` for Phase 2 forward-compat

</code_context>

<specifics>
## Specific Ideas

- **Player list in sessionStorage:** The session state should store `players: Array<{ user_id: string, display_name: string }>` — not just names. This is the forward-compat hook that lets Phase 2 tie a game win to the correct account without schema migration.
- **Username validation UX:** Validate as the host types (debounced lookup, not on submit). Show a green checkmark when the username resolves, red X when not found. This is a shared-device game — fast setup matters.
- **All players need accounts upfront:** This is a deliberate design decision. It keeps conquest tracking clean from day one and avoids a messy "retroactively claim your plane" flow in Phase 2.

</specifics>

<deferred>
## Deferred Ideas

- Turn lifecycle (End Turn button vs. auto-reset) — left to Claude's discretion per decisions above; no user preference stated. Not a Phase 2+ item, just implementation detail for Phase 1.
- Plane deck behavior details — standard Planechase rules apply; Claude decides per research.
- Session expiry — Claude decides reasonable 24h window; implementation detail.

</deferred>

---

*Phase: 1-planechase-core*
*Context gathered: 2026-05-13*
