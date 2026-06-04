# PlaneChaser v2 — Continuation Prompt

Use this to start a new Claude Code session to continue the v2 Campaign Mode implementation.

---

## Prompt

I'm continuing work on PlaneChaser, an MTG Planechase/Archenemy companion app. 

### Current state
- **Phases 2-7a are COMPLETE** and merged to main (PRs #1-20)
- **Phase 7b (per-player plane decks)** is DEFERRED to a future milestone
- **Pre-Phase 8 (PRs #21 + #22)** is COMPLETE:
  - Unified decks page (plane/scheme tabs)
  - Pod management: max_players (2-8), owner CRUD (remove members, regen invite code, delete pod, add friends/any user directly)
  - Friends system: friend_requests table, friend codes, search by name/code, accept/decline, outgoing requests visible with cancel
  - Migrations 011-012 applied to Supabase
- **Playtesting feedback (PR #23)** is COMPLETE:
  - 10-task improvement plan from May 24 playtest session (Tim+Garrett+Matthew)
  - Fixed: non-host stats bug, card zoom overflow, default deck mode, turn indicator redesign, clickable breadcrumbs, game controls toolbar, Realtime pod refresh, pod-start player checkboxes, profile conquest pod filter, FAQ page
- **Phase 9 (Content Pages, PR #24)** is COMPLETE:
  - Marketing landing page overhaul (how-it-works stepper, social proof, expanded features, dual CTA)
  - How to Play rules page (/rules with 7 accordion sections)
  - About page (/about with mission/roadmap/builder/tech)
  - Shared Footer component on all content pages
  - SEO metadata + Open Graph tags on root and per-page layouts
- **Phase 11 (Multi-Plane + Deck Manipulation, PR #25)** is COMPLETE:
  - secondPlaneIndex in GameState for dual-plane support
  - Spatial Merging phenomenon detection + RESOLVE_SPATIAL_MERGE engine action
  - DualPlaneDisplay stacked component with amber badge
  - Dual chaos sequential trigger (both planes' chaos abilities fire one after the other)
  - REORDER_TOP action for top-of-deck placement
  - RevealCardsModal top/bottom toggle
  - Rules page updated with Spatial Merging section
  - Fixed Framer Motion Variants type error in about page (ease: as const)
  - Cleared stale .next cache that caused phantom build error

### Remaining phases (not started)

**Phase 7b: Per-Player Plane Decks** (deferred):
- AE-03/04/05: Each player brings their own plane deck instead of shared pod deck
- Deferred because scope was too large for Phase 7a
- See `memory/project_7b_deferred.md` for details

**Phase 8: Planar Map & Social**:
- PM-01-04: Planar map — grid/constellation of ~185 planes, color-coded by conquest status (unclaimed/yours/podmate), tap to zoom
- PM-05-06: Feedback form with Supabase `feedback` table
- PM-07: Tips/how-to-play accessible from game menu

**Phase 10: Custom Plane Builder & Import**:
- Custom planes table, image upload via Supabase Storage
- Card builder form: name, oracle text, chaos ability, image upload, preview
- Integration with PlaneCard type, deck builder, and game engine
- Import from URL or image paste
- Optional public sharing + moderation
- See `memory/project_future_milestones.md`

**Phase 12: Eternities Map Variant**:
- New GameMode: 'classic' | 'eternities_map'
- 2D grid state model, directional planeswalk (up/down/left/right), hellride mechanic
- Map rendering with scrollable/pannable view, pinch-to-zoom on mobile
- 3-step pruning, conquest integration
- See `memory/project_future_milestones.md`

### Key files to read first
1. `memory/MEMORY.md` — index of all memory files (read the linked files too)
2. `memory/project_v2_status.md` — phase completion tracker  
3. `memory/user_notes_status.md` — comprehensive mapping of my feature notes to implementation status
4. `memory/project_patterns.md` — established code patterns and conventions
5. `docs/superpowers/specs/2026-05-16-v2-campaign-mode-design.md` — the v2 design spec

### Minor items still pending
- Die roll audio file (die-roll.mp3) is 35s but playback capped at 1500ms — could trim file to save bandwidth
- User should verify 2 substitute audio files (planeswalk SFX from freesound 523651, button-click from 220206) sound acceptable

### Approach
Use the brainstorming skill to design whichever phase we tackle, then writing-plans to create the implementation plan, then subagent-driven-development to execute. This has been our workflow and it works well.

### Working directory
The main codebase is at: `planechaser/` (Next.js 15 App Router project). Main is up-to-date with all merged PRs through #25. Work from main or create a new worktree.
