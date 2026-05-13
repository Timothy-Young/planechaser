# Project Research Summary: PlaneChaser

**Domain:** Tabletop game companion app with persistent cross-session meta-game
**Researched:** 2026-05-13
**Confidence:** HIGH (stack and architecture), MEDIUM (app landscape, some Scryfall policy details)

---

## Executive Summary

PlaneChaser occupies a genuinely empty niche: no existing MTG companion app combines Planechase card management, Archenemy support, and a persistent conquest meta-game in one product. The closest competitors are generic die roller apps with no persistence or accounts. The conquest mechanic — where winning a Commander game lets you claim a plane, accumulated planes trigger Archenemy mode, and Archenemy defeats allow the winning team to steal planes — is novel in this space and is the reason to build PlaneChaser.

The recommended implementation is a **Next.js 15 App Router** application backed by **Supabase** (Postgres + Auth), deployed on Vercel. The architecture splits cleanly between ephemeral in-session game state (client-only, persisted to sessionStorage) and persistent meta-game state (server DB, updated at session end). Active gameplay makes zero server calls — the die-roll experience is instant and offline-tolerant.

The top risks are **legal and UX, not technical.** Scryfall's image policy prohibits server-side image proxying. WotC's Fan Content Policy requires a specific disclaimer and prohibits monetization. On the UX side, the shared-device table-top model demands one-tap access to core actions with 44px+ touch targets.

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | SSR + API routes + PWA in one Vercel deployment |
| Auth + DB | Supabase (Postgres + Auth) | Bundled platform; RLS enforces conquest ownership |
| Styling | Tailwind CSS v4 + shadcn/ui | Mobile-first; owned component primitives |
| Animation | Framer Motion 11 | AnimatePresence for card transitions; spring physics for die |
| Server data | TanStack Query v5 | Conquest/achievement/pod reads with stale-time control |
| Game state | React Context + useReducer | Event-driven reducer maps to die-roll lifecycle |
| App state | Zustand 4 + localStorage | Cross-page; survives page refresh |
| PWA | `@ducanh2912/next-pwa` | Home screen install + offline image caching *(verify App Router compat)* |
| Card data | Scryfall API (typed fetch wrapper) | No SDK exists; pre-fetch full plane/scheme corpus at build |

---

## Features

### Table Stakes (must have)
- Plane card display with Scryfall art (direct CDN load — no server proxy)
- Planar die roller with animation (Planeswalk, Chaos, Blank, cost escalation)
- Archenemy scheme card display and turn flow
- Player accounts (login required)
- Mobile-first layout (375px+) with session persistence on tab switch
- WotC fan content disclaimer in footer

### Differentiators (conquest meta-game)
- Conquer current plane on Commander game win
- Pod/playgroup creation with per-pod Archenemy threshold (default: 5 planes)
- Archenemy mode trigger + full scheme deck
- Dethrone mechanic with team vote on plane theft
- Pod leaderboard
- ~25-30 achievement badges across Planechase, Archenemy, and conquest categories

### Defer to v2+
- Plane exclusion list, die roll history, OAuth social login, advanced leaderboard filtering, full service worker image caching, lifetime history charts

---

## Architecture

**Two state domains:**

1. **Ephemeral (client-only):** Game Engine lives in the browser. All in-session state written to sessionStorage on every change. Active gameplay makes zero server calls.
2. **Persistent (server):** Session Recorder receives one POST at game end. Conquest event log is append-only. Achievement evaluation runs async post-session.

**Build order:**
1. Card Cache Service (Scryfall bulk fetch → Postgres → served from memory; clients never call Scryfall)
2. Auth + DB schema
3. Game Engine (TypeScript module — unit-testable before any UI)
4. Core gameplay loop (Setup + Game Screen)
5. Conquest / Pod / Meta services
6. Achievement Evaluator + Profile UI
7. PWA hardening + service worker

---

## Critical Pitfalls

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | **Proxying Scryfall images server-side** | Images must load directly from `cards.scryfall.io` in the client | Phase 1 |
| 2 | **Game state lost on tab switch** | Persist full session state to sessionStorage on every state change | Phase 1 |
| 3 | **Die roll double-tap race condition** | State machine: IDLE → ROLLING → RESOLVING → IDLE | Phase 1 |
| 4 | **Touch targets below 44px** | Design token: 48px min, 64px for Roll Die; 44px is WCAG minimum | Phase 1 |
| 5 | **WotC fan content violation** | Disclaimer in footer day one; no MTG logos as UI chrome; no monetization | Phase 1 |
| 6 | **Achievement exploitability** | Server-side session verification with min session length + player count guards | Phase 3 |
| 7 | **Access token TTL < game length** | Supabase default is 1h; set to 4h+ (Commander games run 2-4h) | Phase 1 |
| 8 | **Conquest ownership as a flag (not an event log)** | `plane_conquests` append-only; current owner = latest row per plane per pod | Phase 2 |

---

## Roadmap Implications

| Phase | Delivers | Research Flags |
|-------|----------|----------------|
| Phase 1 | Auth, card display, animated die roller, chaos escalation, session persistence, compliant app shell | None — standard patterns |
| Phase 2 | Conquest loop, pods, leaderboard, Archenemy mode, dethrone vote | Dethrone vote UX needs design spike; conquest query performance |
| Phase 3 | ~25-30 achievement badges, async evaluation, player profile + territory gallery | Standard async job pattern |
| Phase 4 | Full PWA, plane exclusion list, die roll history, polish | Verify `@ducanh2912/next-pwa` + Next.js 15 App Router compatibility |

---

## Open Questions (verify before shipping)

1. Confirm Scryfall query `t:plane is:planechase` returns the expected full plane corpus
2. Pull exact WotC Fan Content Policy disclaimer wording from https://company.wizards.com/en/legal/fancontentpolicy
3. Verify `@ducanh2912/next-pwa` App Router compatibility (or evaluate `next-pwa` v5 / manual Workbox as fallback)
4. Evaluate Scryfall `/bulk-data` endpoint vs. paginated type-search for initial card corpus fetch
5. Define dethrone vote mechanic (sequential taps vs. timeout majority) before Phase 2 implementation

---

*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Last updated: 2026-05-13*
