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
  - Marketing landing page overhaul, How to Play rules page, About page, shared Footer, SEO metadata
- **Phase 11 (Multi-Plane + Deck Manipulation, PR #25)** is COMPLETE:
  - Dual-plane support (secondPlaneIndex), Spatial Merging, DualPlaneDisplay, dual chaos, REORDER_TOP
- **Phase 8 (Planar Map & Social, PR #26)** is COMPLETE:
  - Planar map page (/map) with conquest-colored CSS grid, filter by owner, tap-to-zoom
  - Feedback form (/feedback) with category selector + Supabase feedback table (migration 013)
  - Map added to bottom nav, How to Play link in game controls toolbar
- **Phase 10 (Custom Plane Builder, PR #27)** is COMPLETE:
  - custom_planes table + Supabase Storage bucket (migration 014)
  - Builder form (/custom-planes/new and /custom-planes/[id]/edit) with live preview + image upload
  - Custom planes list page (/custom-planes) with edit/delete
  - useFullPlaneCorpus merger hook integrating custom planes into deck builder + game setup
  - Sharing/moderation deferred to future iteration

### Remaining phases (not started)

**Phase 7b: Per-Player Plane Decks** (deferred):
- Each player brings their own plane deck instead of shared pod deck
- See `memory/project_7b_deferred.md`

**Phase 12: Eternities Map Variant**:
- New GameMode: 'classic' | 'eternities_map'
- 2D grid state model, directional planeswalk (up/down/left/right), hellride mechanic
- Map rendering with scrollable/pannable view, pinch-to-zoom on mobile
- 3-step pruning, conquest integration
- See `memory/project_future_milestones.md`

**Phase 13: Admin Dashboard**:
- Admin role system, route protection for /admin/*
- Feedback viewer, user management, aggregate stats, content management, pod oversight
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
Use writing-plans to create the implementation plan, then subagent-driven-development to execute. This has been our workflow and it works well.

### Working directory
The main codebase is at: `planechaser/` (Next.js 15 App Router project). Main is up-to-date with all merged PRs through #27. Work from main or create a new worktree.
