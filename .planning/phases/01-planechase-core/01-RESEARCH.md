# Phase 1: Planechase Core — Research

**Researched:** 2026-05-13
**Domain:** Next.js 15 App Router, Supabase Auth/Postgres, Scryfall API, Framer Motion, Tailwind v4 + shadcn/ui, game state machine
**Confidence:** HIGH (core stack), MEDIUM (Supabase session TTL UI path, @ducanh2912/next-pwa compatibility)

---

## Summary

Phase 1 delivers the complete playable Planechase session — auth, game setup, die roll, plane card display, chaos escalation, and session persistence. The stack is entirely greenfield with no existing codebase to refactor. Every technical decision (Next.js 15 App Router, Supabase, Tailwind v4, Framer Motion 11, TanStack Query v5) is locked in CLAUDE.md; research confirms these are current and compatible with each other.

The two highest-risk areas for planning are: (1) **Supabase session TTL** — the default 1-hour JWT expiry will break mid-game sessions and must be changed to 14400 seconds (4 hours) in the Supabase Dashboard before any auth work is tested; and (2) **PWA library selection** — `@ducanh2912/next-pwa` v10.2.9 was last published ~2 years ago and its maintainers recommend migrating to `@serwist/next`. Since PWA is only a soft dependency for Phase 1 (GAME-06 uses sessionStorage, not service workers), defer PWA library selection to Phase 4 per PITFALLS.md and the existing STATE.md blocker.

The Scryfall plane corpus is ~185 cards (using `t:plane`). The correct API strategy is: fetch `GET /cards/search?q=t%3Aplane+is%3Aplanechase&order=name` at app startup, cache results in a Next.js Route Handler with a 30-day TTL in the Supabase `card_cache` table. Images load **client-side only** from `cards.scryfall.io` — never proxied through the server (legal constraint, Pitfall #1).

**Primary recommendation:** Build in wave order: scaffold → auth+DB → Scryfall card layer → game engine (pure TS) → UI screens. The game engine must be a pure TypeScript module with unit tests before any UI is wired to it.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| Scryfall API | Must be used for card images and data; no self-hosted card database |
| Legal | Must comply with Scryfall ToS: images load directly from `cards.scryfall.io` client-side, never proxied through server |
| Legal | Must comply with WotC Fan Content Policy: disclaimer in footer from day one, no monetization |
| Mobile | Must be fully usable on 375px-wide phone, touch-friendly controls |
| Performance | Plane card images must load quickly; lazy loading and caching required |
| Framework | Next.js 15 App Router exclusively — no `pages/` router |
| Auth | Supabase Auth (`@supabase/supabase-js` 2.x + `@supabase/ssr` 0.x) — no alternatives |
| Database | Supabase Postgres via hosted service |
| Styling | Tailwind CSS v4 + shadcn/ui — no MUI/Chakra |
| Animation | Framer Motion 11 |
| State | React Context + useReducer (game session), Zustand 4 (app state), TanStack Query v5 (server data) |
| Scryfall SDK | Do NOT use `scryfall-sdk` npm package; write typed fetch wrapper |
| Pages Router | Do NOT use `pages/` directory; App Router only |
| Redux | Do NOT use Redux Toolkit |
| WebSockets | Do NOT add Socket.io or WebSockets for game state |
| Deployment | Vercel |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can create account with email and password | Supabase Auth email/password signup; `@supabase/ssr` createBrowserClient pattern |
| AUTH-02 | User can sign in with Google OAuth | Supabase Auth Google provider; OAuth redirect handled by Supabase hosted auth |
| AUTH-03 | Session persists 4+ hours | JWT TTL must be set to 14400 seconds in Supabase Dashboard Auth Settings |
| AUTH-04 | User can log out from any screen | Supabase `signOut()` method; logout accessible from Game Screen header user menu |
| AUTH-05 | WotC fan content disclaimer on first launch | sessionStorage flag `planechaser_disclaimer_shown`; auto-dismiss after 3s |
| SETUP-01 | Create Planechase game session (player count + deck size) | Client-side form; initializes `ActiveGameSession` in sessionStorage |
| SETUP-02 | Optionally exclude previously visited planes | Filter `planeDeck` array against `visitedThisSession` from prior sessions stored in Supabase |
| SETUP-03 | Optionally enable win condition | Enum field on session config; no backend changes needed for Phase 1 |
| GAME-01 | Current plane card with official Scryfall art | `next/image` with `remotePatterns` for `cards.scryfall.io`; client-side CDN load only |
| GAME-02 | Roll planar die with animation; resolve Planeswalk/Chaos/Blank | State machine IDLE→ROLLING→RESOLVING→IDLE; Framer Motion AnimatePresence; die array `['planeswalk','chaos','blank','blank','blank','blank']` |
| GAME-03 | Chaos cost escalation counter | Integer `chaosCostThisTurn` in game reducer; increments on every roll after first per turn; resets on turn advance |
| GAME-04 | Draw next plane on Planeswalk with card transition animation | Advance `planeDeckIndex`; Framer Motion AnimatePresence exit+enter spring |
| GAME-05 | Display chaos ability text when Chaos rolled | Scryfall `oracle_text` field; displayed in DieResultOverlay Chaos variant |
| GAME-06 | Session state persists across tab switches/closes; Resume Game on load | `sessionStorage` write on every state change; check on app load; Resume Game modal if active session found |
| GAME-07 | Per-session log of die results and plane transitions | `dieRollHistory: DieRoll[]` in game state; rendered in Roll Log bottom sheet |
| GAME-08 | End game session and declare winner | End Game button → confirmation dialog → winner selection → POST to Supabase `game_sessions` table |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User auth (email + Google OAuth) | Frontend Server (SSR/middleware) | Supabase Auth (external) | `@supabase/ssr` middleware refreshes tokens in the server tier; Supabase Auth handles OAuth redirect |
| Session persistence (tab switch recovery) | Browser / Client | — | `sessionStorage` is client-only; no server involvement during active play |
| Plane card display with art | Browser / Client | CDN (Scryfall) | Images load directly from `cards.scryfall.io` CDN — never through server (legal constraint) |
| Card metadata / plane corpus | API / Backend (Route Handler) | Database / Storage | Next.js Route Handler caches Scryfall card JSON in Supabase `card_cache` table; serves to client |
| Die roll state machine | Browser / Client | — | Pure client-side game logic; must make zero server calls during gameplay |
| Chaos escalation counter | Browser / Client | — | In-memory game state (reducer); persisted to sessionStorage |
| Game session record (end of game) | API / Backend (Route Handler) | Database / Storage | Single POST at game end writes `game_sessions` row; no writes during active play |
| WotC disclaimer display | Browser / Client | — | Client-side `sessionStorage` flag `planechaser_disclaimer_shown` |
| App-level state (active user, pod) | Browser / Client | — | Zustand + `localStorage` persist middleware |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 [VERIFIED: npm registry] | Full-stack framework | App Router, SSR, API routes, built-in image optimization, Vercel deployment |
| React | 19.x (ships with Next.js) [VERIFIED: npm registry] | UI library | Concurrent features, ships with Next.js 15+ |
| TypeScript | 5.x | Type safety | Catches Scryfall API shape mismatches at compile time |
| `@supabase/supabase-js` | 2.105.4 [VERIFIED: npm registry] | Supabase client | Auth, Postgres queries, Realtime |
| `@supabase/ssr` | 0.10.3 [VERIFIED: npm registry] | Next.js App Router session | Required for Server Components + middleware cookie handling; replaces deprecated `auth-helpers-nextjs` |
| Tailwind CSS | 4.3.0 [VERIFIED: npm registry] | Utility styling | CSS-native engine (no PostCSS), CSS variable theming, mobile-first |
| Framer Motion | 12.38.0 [VERIFIED: npm registry] | Die roll + card animations | AnimatePresence, spring physics, `useReducedMotion` hook |
| Zustand | 5.0.13 [VERIFIED: npm registry] | Cross-page app state | Persist middleware for localStorage; lighter than Redux |
| `@tanstack/react-query` | 5.100.10 [VERIFIED: npm registry] | Server data reads | Supabase data fetching with staleTime control, loading/error states |

**Note on Framer Motion version:** npm registry shows 12.38.0 as latest, while CLAUDE.md specifies 11.x. Package was renamed from `framer-motion` to `motion` in late 2024 — the `framer-motion` npm package is now a re-export shim for `motion`. [VERIFIED: npm registry] API surface is identical; `import { motion, AnimatePresence } from 'framer-motion'` still works. Use `framer-motion` package name for compatibility.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui (CLI) | current | Accessible component primitives (copy-in pattern) | Run `npx shadcn@latest init` once; then `npx shadcn@latest add <component>` per component |
| `@testing-library/react` | 16.3.2 [VERIFIED: npm registry] | Component tests | All UI interaction tests |
| vitest | 4.1.6 [VERIFIED: npm registry] | Unit + integration tests | Game engine logic, die roll distribution, chaos escalation |
| playwright | 1.60.0 [VERIFIED: npm registry] | E2E tests | Auth flow, game session, 375px mobile viewport |
| `tw-animate-css` | current | CSS animations (replaces `tailwindcss-animate`) | shadcn/ui init installs this by default for Tailwind v4 |
| `lucide-react` | current | SVG icons | UI icons per UI-SPEC; no emoji as icons |

**PWA note:** `@ducanh2912/next-pwa` v10.2.9 was last published ~2 years ago. Maintainers recommend migrating to `@serwist/next`. [VERIFIED: npm registry + WebSearch] Defer PWA library selection to Phase 4 per STATE.md blocker — service worker image caching is out of scope for Phase 1. Phase 1 only needs `sessionStorage` persistence (GAME-06), not service workers.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `framer-motion` | `motion` (new package name) | Same API; `framer-motion` is a shim; either works but `framer-motion` is more familiar |
| `@ducanh2912/next-pwa` | `@serwist/next` | Serwist is actively maintained; `@ducanh2912/next-pwa` is stale; use Serwist in Phase 4 |
| Zustand persist → localStorage | sessionStorage for game state | Game state uses `sessionStorage` (clears on tab close, GAME-06 requirement); Zustand uses `localStorage` for app-level state only |

### Installation Commands

```bash
# 1. Scaffold
npx create-next-app@latest planechaser --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Supabase
npm install @supabase/supabase-js @supabase/ssr

# 3. Animation
npm install framer-motion

# 4. State
npm install zustand @tanstack/react-query

# 5. shadcn/ui init (run once; then add components individually)
npx shadcn@latest init
# When prompted: select "New York" style, accept defaults, will detect Tailwind v4 automatically

# 6. shadcn/ui components for Phase 1
npx shadcn@latest add button input dialog sheet dropdown-menu switch select slider skeleton

# 7. Icons
npm install lucide-react

# 8. Testing
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
npm install -D playwright @playwright/test
npx playwright install
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React Client Components)
  │
  ├── Auth Screen ──► Supabase Auth (Google OAuth + email/password)
  │                   (session stored as HttpOnly cookie via @supabase/ssr)
  │
  ├── Game Setup Screen
  │     │
  │     └── GET /api/scryfall/planes ──► Next.js Route Handler
  │                                        │
  │                                        ├── HIT: return card_cache rows
  │                                        │       (Supabase Postgres)
  │                                        └── MISS: fetch Scryfall API
  │                                               /cards/search?q=t:plane+is:planechase
  │                                               → store in card_cache
  │                                               → return JSON to client
  │
  ├── Game Screen (zero server calls during active play)
  │     │
  │     ├── Game Engine (useReducer + Context)
  │     │     ├── Die roll state machine: IDLE→ROLLING→RESOLVING→IDLE
  │     │     ├── Plane deck management (Fisher-Yates shuffle)
  │     │     ├── Chaos cost counter (chaosCostThisTurn)
  │     │     └── dieRollHistory[]
  │     │
  │     ├── sessionStorage (written on every state change)
  │     │     └── ActiveGameSession JSON blob
  │     │
  │     ├── PlaneCard (next/image)
  │     │     └── src from cards.scryfall.io (CDN direct, never proxied)
  │     │
  │     └── Animations (Framer Motion)
  │           ├── Die roll: ROLLING state button spinner
  │           ├── DieResultOverlay: AnimatePresence scale+opacity
  │           └── Card transition: AnimatePresence spring y:40→0
  │
  ├── Resume Game Modal (on app load if sessionStorage has active session)
  │
  └── End Game → POST /api/sessions ──► Supabase game_sessions table

middleware.ts
  └── @supabase/ssr createServerClient
      └── refreshes session token on every request
      └── protects /game and /setup routes (redirect to /auth if no session)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── auth/
│   │       └── page.tsx              # Auth screen (login + register)
│   ├── (game)/
│   │   ├── setup/
│   │   │   └── page.tsx              # Game Setup screen
│   │   └── game/
│   │       └── page.tsx              # Game Screen (main)
│   ├── api/
│   │   ├── scryfall/
│   │   │   └── planes/
│   │   │       └── route.ts          # Plane corpus cache proxy
│   │   └── sessions/
│   │       └── route.ts              # POST game session at end
│   ├── layout.tsx                    # Root layout (fonts, providers, WotC disclaimer)
│   └── globals.css                   # Tailwind v4 @import + @theme inline tokens
├── components/
│   ├── ui/                           # shadcn copy-in components (owned)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   └── ...
│   ├── game/                         # Phase 1 custom components
│   │   ├── PlaneCard.tsx
│   │   ├── DieButton.tsx
│   │   ├── ChaosCounter.tsx
│   │   ├── DieResultOverlay.tsx
│   │   ├── RollLogEntry.tsx
│   │   └── UserAccountMenu.tsx
│   └── providers.tsx                 # QueryClientProvider + GameEngineProvider (use client)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient
│   │   └── server.ts                 # createServerClient (Server Components)
│   ├── game/
│   │   ├── engine.ts                 # Pure TS game engine (reducers, state machine)
│   │   ├── engine.test.ts            # Vitest unit tests
│   │   ├── shuffle.ts                # Fisher-Yates deck shuffle
│   │   └── types.ts                  # ActiveGameSession, DieRoll, PlaneCard interfaces
│   ├── scryfall/
│   │   ├── client.ts                 # Typed fetch wrapper (no SDK)
│   │   └── types.ts                  # ScryfallCard, ScryfallList interfaces
│   └── session-storage.ts            # Serialize/deserialize ActiveGameSession
├── hooks/
│   ├── useGameEngine.ts              # Context consumer hook
│   ├── useGameSession.ts             # sessionStorage read/write
│   └── usePlaneCorpus.ts             # TanStack Query wrapper for /api/scryfall/planes
├── store/
│   └── app-store.ts                  # Zustand store (auth user, active pod, notifications)
└── middleware.ts                     # @supabase/ssr session refresh + route protection
```

### Pattern 1: Supabase SSR — createServerClient in middleware

The middleware MUST call `supabase.auth.getUser()` (not `getSession()`) on every request to revalidate the token. `getSession()` does not validate against the Supabase Auth server and must never be trusted in server code.

[CITED: supabase.com/docs/guides/auth/server-side/nextjs]

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: use getUser() not getSession() in server code
  const { data: { user } } = await supabase.auth.getUser()

  // Protect game routes
  if (!user && request.nextUrl.pathname.startsWith('/game')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Pattern 2: Supabase SSR — createBrowserClient (Client Components)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 3: Supabase SSR — createServerClient (Server Components + Route Handlers)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies; middleware handles this
          }
        },
      },
    }
  )
}
```

### Pattern 4: shadcn/ui + Tailwind v4 Init

Tailwind v4 removes `tailwind.config.js` — all configuration happens in CSS. shadcn/ui CLI auto-detects Tailwind v4. [CITED: ui.shadcn.com/docs/tailwind-v4]

```bash
npx shadcn@latest init
```

This generates a `globals.css` with `@import "tailwindcss"` and `@theme inline` directives. Override shadcn default CSS variables with the PlaneChaser color tokens from UI-SPEC:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Russo+One&display=swap');

@theme inline {
  --color-background: #0F0F23;
  --color-surface: #1A1A3E;
  --color-accent: #7C3AED;
  --color-accent-muted: #A78BFA;
  --color-cta: #F43F5E;
  --color-cta-hover: #E11D48;
  --color-text: #E2E8F0;
  --color-text-muted: #94A3B8;
  --color-destructive: #DC2626;
  --color-border: #2D2D5E;
  --font-heading: 'Russo One', sans-serif;
  --font-body: 'Chakra Petch', sans-serif;
}
```

**Important:** `tailwindcss-animate` is deprecated in Tailwind v4 — use `tw-animate-css` instead. shadcn/ui init installs `tw-animate-css` automatically for v4 projects.

### Pattern 5: Game Engine — useReducer State Machine

The game engine MUST be a pure TypeScript module with no React imports — testable with Vitest without jsdom:

```typescript
// src/lib/game/types.ts
export type DieResult = 'planeswalk' | 'chaos' | 'blank'
export type DieState = 'IDLE' | 'ROLLING' | 'RESOLVING'

export interface ActiveGameSession {
  sessionId: string
  players: { id: string; name: string }[]
  planeDeck: PlaneCard[]
  planeDeckIndex: number
  currentPlane: PlaneCard
  visitedThisSession: string[]
  dieRollHistory: DieRoll[]
  chaosCostThisTurn: number   // {N} mana per extra roll per turn; resets on turn advance
  dieState: DieState
  winCondition: 'none' | 'first-to-3' | 'timed-60'
  startedAt: number
}

export interface DieRoll {
  timestamp: number
  result: DieResult
  chaosCostAtRoll: number
  planeName: string
}

// src/lib/game/engine.ts
export type GameAction =
  | { type: 'ROLL_START' }
  | { type: 'ROLL_RESOLVE'; result: DieResult }
  | { type: 'DISMISS_OVERLAY' }         // returns to IDLE; increments chaos cost
  | { type: 'ADVANCE_TURN' }            // resets chaosCostThisTurn to 0
  | { type: 'END_GAME' }

export function gameReducer(state: ActiveGameSession, action: GameAction): ActiveGameSession {
  switch (action.type) {
    case 'ROLL_START':
      if (state.dieState !== 'IDLE') return state // guard double-tap
      return { ...state, dieState: 'ROLLING' }
    case 'ROLL_RESOLVE':
      return {
        ...state,
        dieState: 'RESOLVING',
        dieRollHistory: [...state.dieRollHistory, {
          timestamp: Date.now(),
          result: action.result,
          chaosCostAtRoll: state.chaosCostThisTurn,
          planeName: state.currentPlane.name,
        }],
      }
    case 'DISMISS_OVERLAY': {
      const lastRoll = state.dieRollHistory.at(-1)
      const isPlaneswalk = lastRoll?.result === 'planeswalk'
      const nextIndex = isPlaneswalk
        ? (state.planeDeckIndex + 1) % state.planeDeck.length
        : state.planeDeckIndex
      // Chaos cost increments for every roll that is NOT the first of the turn
      const isFirstRollOfTurn = state.dieRollHistory.filter(
        r => r.chaosCostAtRoll === state.chaosCostThisTurn
      ).length <= 1
      return {
        ...state,
        dieState: 'IDLE',
        planeDeckIndex: nextIndex,
        currentPlane: state.planeDeck[nextIndex],
        visitedThisSession: isPlaneswalk
          ? [...state.visitedThisSession, state.planeDeck[nextIndex].scryfallId]
          : state.visitedThisSession,
        chaosCostThisTurn: isFirstRollOfTurn ? 0 : state.chaosCostThisTurn + 1,
      }
    }
    case 'ADVANCE_TURN':
      return { ...state, chaosCostThisTurn: 0 }
    default:
      return state
  }
}
```

**Chaos escalation rule:** Per official Planechase rules, each time a player rolls the planar die on a turn after the first roll, it costs {1} more than the previous roll. The `chaosCostThisTurn` counter increments on DISMISS_OVERLAY if the roll was not the first of the current turn. It resets to 0 on ADVANCE_TURN (player passes or new turn begins).

### Pattern 6: Planar Die Roll — Correct Probability Distribution

```typescript
// src/lib/game/engine.ts
const DIE_FACES: DieResult[] = ['planeswalk', 'chaos', 'blank', 'blank', 'blank', 'blank']

export function rollPlanarDie(): DieResult {
  return DIE_FACES[Math.floor(Math.random() * 6)]
}
```

Never use weighted probabilities — the distribution must be exactly 1/6 Planeswalk, 1/6 Chaos, 4/6 Blank to match the physical die.

### Pattern 7: sessionStorage Persistence

```typescript
// src/lib/session-storage.ts
const SESSION_KEY = 'planechaser_active_session'

export function saveSession(session: ActiveGameSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (e) {
    console.warn('sessionStorage write failed', e)
  }
}

export function loadSession(): ActiveGameSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
```

Call `saveSession` in the game engine context after every `dispatch` call via `useEffect`. Check `loadSession` on app mount to offer the Resume Game modal (GAME-06).

### Pattern 8: Framer Motion — Card Transition (Planeswalk)

Per UI-SPEC: old card exits (opacity 1→0, scale 1→0.95), new card enters (y: 40→0, opacity 0→1) with spring stiffness 200, damping 25.

```typescript
// src/components/game/PlaneCard.tsx
'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

const cardVariants = {
  enter: { y: 40, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
}

export function PlaneCard({ plane, key }: { plane: PlaneCard; key: string }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={shouldReduceMotion ? undefined : cardVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 200, damping: 25 }
        }
      >
        {/* next/image card art here */}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Pattern 9: next/image with cards.scryfall.io

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cards.scryfall.io',
        pathname: '/**',
      },
    ],
  },
}
```

Scryfall image URI format: `https://cards.scryfall.io/normal/front/{char1}/{char2}/{uuid}.jpg`
Use `image_uris.normal` (480×680) for display. `image_uris.large` (672×936) is available for high-DPI but increases load time. [CITED: scryfall.com/docs/api]

### Pattern 10: Scryfall Plane Corpus Fetch — Route Handler Cache

```typescript
// src/app/api/scryfall/planes/route.ts
import { createClient } from '@/lib/supabase/server'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function GET() {
  const supabase = await createClient()

  // Check cache
  const { data: cached } = await supabase
    .from('card_cache')
    .select('raw_json, cached_at')
    .eq('card_type', 'planes')
    .single()

  if (cached && Date.now() - new Date(cached.cached_at).getTime() < CACHE_TTL_MS) {
    return Response.json(cached.raw_json)
  }

  // Fetch from Scryfall — paginated search
  const planes: ScryfallCard[] = []
  let nextPage = 'https://api.scryfall.com/cards/search?q=t%3Aplane+is%3Aplanechase&order=name'

  while (nextPage) {
    await new Promise(r => setTimeout(r, 100)) // Scryfall politeness delay
    const res = await fetch(nextPage, {
      headers: { 'User-Agent': 'PlaneChaser/1.0 codetimcode@gmail.com' },
    })
    const data = await res.json()
    planes.push(...data.data)
    nextPage = data.has_more ? data.next_page : null
  }

  // Upsert cache
  await supabase.from('card_cache').upsert({
    card_type: 'planes',
    raw_json: planes,
    cached_at: new Date().toISOString(),
  })

  return Response.json(planes)
}
```

**Scryfall query:** `t:plane is:planechase` returns ~185 plane cards. [VERIFIED: WebSearch against scryfall.com/search] `is:planechase` filters to planechase-legal planes and avoids false positives from non-planechase plane types.

Scryfall response pagination: each page returns up to 175 results with `has_more: true` and `next_page` URL if more cards exist. Two requests will cover the full ~185-card corpus. [CITED: scryfall.com/docs/api]

### Anti-Patterns to Avoid

- **Server-proxying Scryfall images:** Any route handler that fetches from `cards.scryfall.io` and returns image bytes is a legal violation. `next/image` with `remotePatterns` is the correct pattern — it optimizes/resizes but the browser still fetches from the CDN.
- **`getSession()` in middleware:** Use `getUser()` only. `getSession()` does not revalidate and can return stale sessions.
- **Die roll on client-side `Date.now()` as RNG:** Use `Math.floor(Math.random() * 6)` against the fixed DIE_FACES array — do not use timestamps as randomness.
- **Storing game state in Supabase during active play:** All in-session state stays in `sessionStorage`; only write to Supabase on game end (GAME-08).
- **Zustand store for game session state:** Zustand handles `localStorage`-persisted app state only. Game session state uses `useReducer` + Context + `sessionStorage` — not Zustand.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token refresh cycle | Custom JWT refresh logic | Supabase `@supabase/ssr` middleware | Handles cookie rotation, refresh, expiry automatically |
| Card image lazy loading + WebP conversion | `<img>` with manual lazy attr | `next/image` with `remotePatterns` | Built-in lazy load, format conversion, blur placeholder, CDN cache |
| Accessible dialog/sheet/toggle | Custom modal/bottom sheet | shadcn Dialog, Sheet, Switch | Focus trapping, ARIA attributes, keyboard nav already built in |
| Spring animation physics | CSS transitions | Framer Motion AnimatePresence | Card exit/enter with spring stiffness/damping is non-trivial in CSS |
| Scryfall pagination handling | One-time fetch assuming no pagination | Paginated loop in Route Handler | The plane corpus spans 2 pages; single fetch will miss cards |
| Server-side Supabase client in App Router | Direct `createClient()` call with cookies | `@supabase/ssr` `createServerClient` | Cookies API in Next.js App Router requires async pattern; `@supabase/ssr` handles it |
| Fisher-Yates shuffle | `sort(() => Math.random() - 0.5)` | Correct Fisher-Yates implementation | The sort-based approach has non-uniform distribution for deck shuffling |

**Key insight:** The Supabase + Next.js App Router integration has a known complexity surface — do not attempt to manually manage cookies or session state. Use `@supabase/ssr` exactly as documented and follow the `getUser()` pattern in middleware.

---

## Common Pitfalls

### Pitfall 1: Supabase JWT Expiry Breaks Mid-Game Session
**What goes wrong:** Default JWT TTL is 1 hour. A Commander game runs 2–4 hours. Token expires mid-game; Supabase returns 401; app shows login screen with no game state context.
**Why it happens:** Following the default Supabase setup without adjusting Auth settings.
**How to avoid:** In Supabase Dashboard → Settings → Auth → JWT Expiry, set to `14400` (4 hours = 14400 seconds). [VERIFIED: WebSearch + supabase.com/docs/guides/auth/sessions]. Do this before any auth testing.
**Warning signs:** Players complain the app logs them out mid-game. 401 responses in Network tab after ~1 hour of play.

### Pitfall 2: Scryfall Image Proxying (Legal)
**What goes wrong:** Serve Scryfall images through a Next.js API route (`/api/card-image?id=...`) for any reason — CORS workaround, caching, etc.
**Why it happens:** Developers see a cross-origin image and reflexively add a proxy.
**How to avoid:** Use `next/image` with `remotePatterns` for `cards.scryfall.io`. The browser fetches from Scryfall CDN directly. `next/image` optimizes size/format without proxying the original content.
**Warning signs:** Any server-side fetch to `cards.scryfall.io` in a Route Handler.

### Pitfall 3: Die Roll Double-Tap Race Condition
**What goes wrong:** Player taps Roll Die twice during animation; die resolves twice; wrong plane shown.
**Why it happens:** Tap handler is not locked during animation.
**How to avoid:** Dispatch `ROLL_START` first, which sets `dieState: 'ROLLING'`. The reducer guards: `if (state.dieState !== 'IDLE') return state`. Button has `disabled` and `pointer-events: none` while `dieState !== 'IDLE'`.
**Warning signs:** Plane advances twice on rapid double-tap. Easy to test: spam Roll Die button during animation.

### Pitfall 4: sessionStorage Write Outside useEffect
**What goes wrong:** Game state written to sessionStorage during render (not in effect), causing hydration warnings and React concurrent mode inconsistencies.
**How to avoid:** Write to sessionStorage in a `useEffect` that depends on the game state:
```typescript
useEffect(() => { saveSession(gameState) }, [gameState])
```

### Pitfall 5: Zustand Hydration Mismatch in Next.js App Router
**What goes wrong:** Zustand `persist` middleware reads from `localStorage` on client; server renders with initial empty state; React detects mismatch; hydration error in console or broken UI.
**Why it happens:** Next.js renders server-side HTML before client-side hydration. localStorage is not available server-side.
**How to avoid:** Use a `useHydration` pattern — wrap UI that reads Zustand persisted state with a check:
```typescript
const [hydrated, setHydrated] = useState(false)
useEffect(() => setHydrated(true), [])
if (!hydrated) return <Skeleton />
```
Or use Zustand's built-in `onRehydrateStorage` callback to delay rendering.

### Pitfall 6: shadcn/ui Init With Wrong Tailwind Version
**What goes wrong:** Running `npx shadcn@latest init` on a Tailwind v4 project generates v3-style `tailwind.config.js` that conflicts with v4's CSS-native config.
**Why it happens:** The init command needs to detect the installed Tailwind version correctly.
**How to avoid:** Install Tailwind v4 first (`npm install tailwindcss`), then run `npx shadcn@latest init`. The CLI detects v4 and generates `globals.css` with `@import "tailwindcss"` and `@theme inline` — no `tailwind.config.js` generated. [CITED: ui.shadcn.com/docs/tailwind-v4]

### Pitfall 7: TanStack Query Provider in Server Component
**What goes wrong:** `QueryClientProvider` placed in a Server Component causes "React cannot render class components" error.
**Why it happens:** `QueryClientProvider` requires client-side React context.
**How to avoid:** Create a `src/components/providers.tsx` with `'use client'` directive that wraps `QueryClientProvider`. Import and use in root `app/layout.tsx`.

### Pitfall 8: `framer-motion` vs `motion` Package Naming
**What goes wrong:** Documentation references both `framer-motion` and `motion/react` import paths interchangeably; mixing them causes duplicate instance warnings.
**Why it happens:** Framer Motion was rebranded to `motion` in late 2024. `framer-motion` is now a shim.
**How to avoid:** Install and import `framer-motion` consistently throughout the project. Do not mix with `motion/react` imports.

---

## Scryfall Data Strategy

**Corpus size:** ~185 Planechase-legal plane cards [VERIFIED: WebSearch → scryfall.com/search?q=t:plane returns 185 results]

**Recommended approach — Server-side cache in Supabase:**

1. On first request to `/api/scryfall/planes`, fetch all pages from `GET https://api.scryfall.com/cards/search?q=t%3Aplane+is%3Aplanechase&order=name` with 100ms delay between pages.
2. Store the full card array as JSONB in `card_cache` table (one row, `card_type = 'planes'`).
3. Return cached data for 30 days before re-fetching.
4. Client receives `{ id, name, type_line, oracle_text, image_uris, set_name }[]` and shuffles client-side.

**Why NOT Scryfall bulk-data:** The oracle-cards bulk file is ~100MB and includes every card in MTG. Downloading and filtering it for ~185 plane cards is wasteful. The paginated search endpoint is the right tool. [CITED: scryfall.com/docs/api/bulk-data]

**Card fields to store:**
- `id` (Scryfall UUID — stable primary key; never use name as key)
- `name`
- `type_line`
- `oracle_text` (chaos ability text for GAME-05)
- `flavor_text` (optional, for display richness)
- `image_uris.normal` (480×680 — primary display size)
- `image_uris.art_crop` (not needed in Phase 1 but useful later)
- `set_name` (shown under card per UI-SPEC)
- `set` (set code, for reference)

**User-Agent header:** Always include `User-Agent: PlaneChaser/1.0 codetimcode@gmail.com` per Scryfall developer guidelines.

---

## Game State Architecture

### sessionStorage Schema

The full `ActiveGameSession` interface should be stored as a single JSON blob under key `planechaser_active_session`:

```typescript
interface ActiveGameSession {
  sessionId: string           // crypto.randomUUID() on game start
  players: Player[]           // [{id, name}] — player count and names from setup
  planeDeck: PlaneCard[]      // shuffled subset of plane corpus
  planeDeckIndex: number      // current position in deck
  currentPlane: PlaneCard     // planeDeck[planeDeckIndex]
  visitedThisSession: string[]// Scryfall IDs of planes visited, in order
  dieRollHistory: DieRoll[]   // full roll log for GAME-07
  chaosCostThisTurn: number   // {0..N} per-turn chaos cost escalation
  dieState: DieState          // 'IDLE' | 'ROLLING' | 'RESOLVING'
  winCondition: WinCondition  // from SETUP-03
  excludeVisited: boolean     // from SETUP-02
  startedAt: number           // Date.now() on session start
  lastUpdatedAt: number       // Date.now() on every state change
}
```

**Resume Game detection:** On app load, call `loadSession()`. If result is non-null AND `result.dieState !== undefined` AND `result.sessionId`, show the Resume Game modal (Screen 6 in UI-SPEC).

**Session clearing:** Call `clearSession()` when user taps "Start New Game" (confirmed) or completes GAME-08 End Game flow.

### State Layer Separation

| State | Store | Persistence | Reset |
|-------|-------|-------------|-------|
| In-session game state | `useReducer` + Context | `sessionStorage` | On game end or new game start |
| App-level state (current user, active pod) | Zustand + `localStorage` | `localStorage` | On logout |
| Server data (user profile, pod data) | TanStack Query | In-memory + query cache | On window focus (configurable) |
| UI component state (overlay open/closed) | `useState` local | — | On unmount |

---

## Die Roll State Machine

```
IDLE ──[tap Roll Die]──► ROLLING ──[400ms]──► RESOLVING
                                                  │
                           ┌──────────────────────┤
                           │        │              │
                      Planeswalk  Chaos           Blank
                       (overlay) (overlay)      (overlay)
                           │        │              │
                        [tap]    [tap/Got It]    [tap/auto-2s]
                           │        │              │
                           └────────┴──────────────┘
                                    │
                             DISMISS_OVERLAY dispatch
                                    │
                                  IDLE
```

- `ROLL_START` dispatch: generates die result synchronously, sets `dieState: 'ROLLING'`
- After 400ms animation delay: dispatch `ROLL_RESOLVE` with the pre-generated result
- `RESOLVING` state: overlay visible, Roll Die button disabled
- `DISMISS_OVERLAY` dispatch: advances plane if Planeswalk, increments chaos cost if not first roll, returns to IDLE

**Critical:** Generate the die result BEFORE starting the animation. The animation reveals the result; the result does not depend on the animation. This prevents any timing-based exploits.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Config file | `vitest.config.ts` (Wave 0 gap — must create) |
| Quick run command | `npx vitest run src/lib/game` |
| Full suite command | `npx vitest run` |
| E2E command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email signup creates Supabase user | E2E (Playwright) | `npx playwright test auth.spec.ts` | ❌ Wave 0 |
| AUTH-02 | Google OAuth redirects correctly | E2E (Playwright) | `npx playwright test auth.spec.ts` | ❌ Wave 0 |
| AUTH-03 | Session persists after 4 hours (JWT TTL) | Manual | Verify in Supabase Dashboard | Manual only |
| AUTH-04 | Logout clears session cookie | E2E (Playwright) | `npx playwright test auth.spec.ts` | ❌ Wave 0 |
| AUTH-05 | Disclaimer shown on first launch, not subsequent | Unit (RTL) | `npx vitest run src/components` | ❌ Wave 0 |
| SETUP-01 | Game session initializes with correct player count and deck size | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| SETUP-02 | Excluded planes not present in deck | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| GAME-01 | Plane card renders with correct image src | Unit (RTL) | `npx vitest run src/components/game` | ❌ Wave 0 |
| GAME-02 | Die roll returns only valid results with correct 1/6/1/6/4/6 distribution over 6000 trials | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| GAME-03 | Chaos cost increments on 2nd+ roll; resets on ADVANCE_TURN | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| GAME-04 | planeDeckIndex advances on Planeswalk; wraps at end of deck | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| GAME-05 | Chaos overlay displays oracle_text from current plane card | Unit (RTL) | `npx vitest run src/components/game` | ❌ Wave 0 |
| GAME-06 | sessionStorage written after every state change; loadSession returns saved state | Unit | `npx vitest run src/lib/session-storage.test.ts` | ❌ Wave 0 |
| GAME-07 | Roll log contains correct history in order | Unit | `npx vitest run src/lib/game/engine.test.ts` | ❌ Wave 0 |
| GAME-08 | End game POSTs correct payload to /api/sessions | Integration | `npx vitest run src/app/api` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/game/engine.test.ts` (game engine unit tests, ~1s)
- **Per wave merge:** `npx vitest run` (full unit suite)
- **Phase gate:** Full Vitest suite green + Playwright auth and game session E2E green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/game/engine.test.ts` — covers GAME-02, GAME-03, GAME-04, GAME-07, SETUP-01, SETUP-02
- [ ] `src/lib/session-storage.test.ts` — covers GAME-06
- [ ] `src/components/game/PlaneCard.test.tsx` — covers GAME-01, GAME-05
- [ ] `src/components/game/DieButton.test.tsx` — covers GAME-02 (UI integration)
- [ ] `tests/auth.spec.ts` (Playwright) — covers AUTH-01, AUTH-02, AUTH-04
- [ ] `tests/game-session.spec.ts` (Playwright) — covers full game session E2E, 375px viewport
- [ ] `vitest.config.ts` — framework config (plugins: tsconfigPaths, react; environment: jsdom)
- [ ] `playwright.config.ts` — E2E config (mobile viewport 375×812, baseURL localhost:3000)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, dev server | Assumed ✓ | Verify ≥18.x | — |
| npm | Package install | Assumed ✓ | — | — |
| Supabase project | Auth, DB | External service | — | Use Supabase local dev via CLI if needed |
| Vercel | Deployment | External service | — | Local dev unblocked |
| Google OAuth credentials | AUTH-02 | Must configure | — | Email-only auth works first; add Google OAuth credentials via Supabase Dashboard |
| Scryfall API | Card data | Public API, no key | — | Falls back to empty deck with error message |

**Missing dependencies with no fallback:**
- Supabase project (URL + anon key) — required before any auth or DB work. Create at supabase.com before starting Wave 1.

**Missing dependencies with fallback:**
- Google OAuth: configure credentials in Supabase Dashboard → Providers → Google after initial scaffold. Email auth works without it.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email/password + Google OAuth); `getUser()` not `getSession()` in server code |
| V3 Session Management | yes | `@supabase/ssr` HttpOnly cookie refresh; JWT TTL 14400s; middleware refreshes on every request |
| V4 Access Control | yes | Next.js middleware protects `/game` and `/setup` routes; redirect to `/auth` if no session |
| V5 Input Validation | yes | Game setup form: player count (2–6), deck size (10–86) validated client-side with controlled inputs |
| V6 Cryptography | no | No custom crypto; Supabase handles all signing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session replay from stolen cookie | Spoofing | HttpOnly cookie prevents JS access; Supabase refresh token rotation on each use |
| CSRF on session endpoint | Tampering | Supabase `@supabase/ssr` uses SameSite=Lax cookies; POST to `/api/sessions` requires active session |
| XSS via oracle_text injection | Tampering | Scryfall oracle text rendered as plain text string (no `dangerouslySetInnerHTML`); shadcn components handle escaping |
| Scryfall image proxy abuse | Elevation | `remotePatterns` whitelist in `next.config.ts` limits `next/image` to `cards.scryfall.io` only |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwindcss-animate` + `tailwind.config.js` | `tw-animate-css` + `globals.css @theme inline` | Tailwind v4 (2024) | No config file; animations via CSS import |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Supabase 2024 | Required for App Router; old package deprecated |
| `framer-motion` v10 import paths | `framer-motion` v12 (shim for `motion`) | Late 2024 | Same API; can import from `framer-motion` or `motion/react` |
| `domains: ['cards.scryfall.io']` in next.config | `remotePatterns` array | Next.js 14 | `domains` deprecated; must use `remotePatterns` |
| `next-pwa` / `@ducanh2912/next-pwa` | `@serwist/next` | 2024 | `@ducanh2912/next-pwa` is unmaintained; defer to Phase 4 |
| Zustand v4 | Zustand v5 | 2024 | API largely compatible; minor breaking changes in TypeScript generics |

**Deprecated/outdated (do NOT use):**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr`
- `tailwindcss-animate`: replaced by `tw-animate-css` in Tailwind v4 projects
- `domains` in `next.config.images`: replaced by `remotePatterns`
- `pages/` router in Next.js: maintenance mode, use `app/` router exclusively

---

## Wave Planning Hints

The natural dependency order for tasks within Phase 1:

**Wave 0 — Foundation (no dependencies; parallelizable)**
- Scaffold Next.js 15 app with all flags
- Install all dependencies
- Run `npx shadcn@latest init`; override CSS variables with UI-SPEC tokens
- Create `vitest.config.ts` and `playwright.config.ts`
- Create Supabase project; set JWT TTL to 14400 seconds
- Create all test file stubs (Wave 0 Gaps above)

**Wave 1 — Auth + DB Schema (depends on Wave 0)**
- `src/middleware.ts` with `@supabase/ssr` route protection
- `src/lib/supabase/client.ts` and `server.ts`
- Auth Screen UI (Screen 1 from UI-SPEC)
- Supabase DB schema migration: `users`, `game_sessions`, `card_cache` tables
- WotC disclaimer (AUTH-05) — sessionStorage flag + toast component

**Wave 2 — Card Data Layer (depends on Wave 0)**
- Scryfall typed fetch wrapper (`src/lib/scryfall/client.ts`)
- Route Handler `/api/scryfall/planes` with Supabase cache
- `usePlaneCorpus` TanStack Query hook
- Fisher-Yates shuffle implementation

**Wave 3 — Game Engine (depends on Wave 0; parallelizable with Wave 1-2)**
- `ActiveGameSession` TypeScript interfaces
- `gameReducer` with full state machine
- `rollPlanarDie` function
- `session-storage.ts` serialize/deserialize
- All unit tests (engine.test.ts, session-storage.test.ts) — must pass before Wave 4

**Wave 4 — UI Screens (depends on Waves 1–3)**
- Game Setup Screen (Screen 2 from UI-SPEC)
- Game Screen layout and zone structure (Screen 3)
- `PlaneCard` component with `next/image` + loading/error states
- `ChaosCounter` strip component
- `DieButton` with Framer Motion ROLLING state
- `DieResultOverlay` — three variants (Planeswalk/Chaos/Blank)
- Roll Log bottom sheet (Screen 5)
- Resume Game modal (Screen 6)
- User Account Menu with logout (AUTH-04)

**Wave 5 — Game End + Integration (depends on Wave 4)**
- End Game flow (GAME-08): winner selection → POST `/api/sessions`
- `game_sessions` Supabase insert
- Full E2E tests (auth.spec.ts, game-session.spec.ts)
- Accessibility audit (WCAG AA contrast, 44px touch targets, aria-labels per UI-SPEC)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Scryfall query `t:plane is:planechase` returns ~185 cards and all Planechase-legal planes | Scryfall Data Strategy | Deck would be incomplete or contain wrong cards; verify by checking card count against official Planechase card list |
| A2 | `@supabase/ssr` 0.10.3 is compatible with Next.js 16.2.6 | Standard Stack | Build failure or session handling errors; check supabase.com/docs before starting Wave 1 |
| A3 | `framer-motion` 12.x retains the same `AnimatePresence` / spring API as 11.x | Animation patterns | Animation code would need API migration; check motion.dev docs |
| A4 | Zustand v5 `persist` middleware API is compatible with code examples in this document | Pattern 7 / State Architecture | Hydration errors or persist failures; check zustand docs changelog |
| A5 | Google OAuth setup in Supabase Dashboard requires no additional server-side code beyond the redirect URL configuration | AUTH-02 implementation | OAuth flow broken; Supabase handles the OAuth redirect automatically but credentials must be configured |

---

## Open Questions

1. **Scryfall plane corpus exact count and query**
   - What we know: `t:plane` returns ~185 results; `is:planechase` further filters to planechase-legal
   - What's unclear: whether any non-planechase plane subtypes exist that would contaminate the results without `is:planechase`
   - Recommendation: Verify at project start by running the query in Scryfall UI: `https://scryfall.com/search?q=t%3Aplane+is%3Aplanechase` and asserting the count matches a known plane list

2. **Supabase JWT TTL UI location**
   - What we know: Setting exists in Dashboard → Settings → Auth; value `14400` for 4 hours
   - What's unclear: Exact current navigation path in Supabase Dashboard UI (UI changes frequently)
   - Recommendation: Locate in first Supabase setup session; document the exact path in CONVENTIONS.md

3. **WotC Fan Content Policy disclaimer exact wording**
   - What we know: UI-SPEC includes the required text verbatim
   - What's unclear: Whether the policy wording has changed since UI-SPEC was written
   - Recommendation: Verify at https://company.wizards.com/en/legal/fancontentpolicy before Phase 1 ships

4. **PWA library for Phase 1 scope**
   - What we know: GAME-06 uses `sessionStorage` only — no service worker needed in Phase 1. PWA deferred to Phase 4.
   - What's unclear: Whether `@ducanh2912/next-pwa` or `@serwist/next` will be selected for Phase 4
   - Recommendation: Do not install either in Phase 1. Evaluate `@serwist/next` during Phase 4 research.

---

## Sources

### Primary (HIGH confidence)
- [CLAUDE.md](./CLAUDE.md) — Locked technology stack, constraints, and conventions
- [.planning/research/SUMMARY.md](.planning/research/SUMMARY.md) — Project-level architecture decisions
- [.planning/research/PITFALLS.md](.planning/research/PITFALLS.md) — Domain-specific pitfalls with prevention strategies
- [.planning/research/ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) — Data model, component boundaries, build order
- [.planning/phases/01-planechase-core/01-UI-SPEC.md](.planning/phases/01-planechase-core/01-UI-SPEC.md) — Approved UI design contract for all Phase 1 screens
- [npm registry](https://npmjs.com) — All package versions verified via `npm view <pkg> version`

### Secondary (MEDIUM confidence)
- [supabase.com/docs/guides/auth/server-side/nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` middleware pattern, `getUser()` guidance [WebSearch verified]
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — shadcn/ui + Tailwind v4 init procedure [WebSearch verified]
- [supabase.com/docs/guides/auth/sessions](https://supabase.com/docs/guides/auth/sessions) — JWT TTL configuration via Dashboard [WebSearch verified]
- [scryfall.com/docs/api](https://scryfall.com/docs/api) — Plane corpus query, pagination, image URIs, bulk data [WebSearch + ASSUMED training knowledge]
- [nextjs.org/docs/app/api-reference/components/image](https://nextjs.org/docs/app/api-reference/components/image) — `remotePatterns` configuration [WebSearch verified]
- [motion.dev](https://motion.dev) — Framer Motion 12 AnimatePresence API, spring config [WebSearch verified]

### Tertiary (LOW confidence)
- WebSearch results re: `@ducanh2912/next-pwa` staleness and `@serwist/next` recommendation — single-source, not cross-verified with official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — verified via npm registry
- Supabase SSR patterns: HIGH — official docs cited via WebSearch
- Scryfall query and corpus size: MEDIUM — WebSearch result; verify by running query before build
- Framer Motion spring config: HIGH — aligns with UI-SPEC contract and documented API
- shadcn/ui + Tailwind v4 init: HIGH — official shadcn docs cited
- PWA library status: MEDIUM — WebSearch; maintainer deprecation notice not cross-verified

**Research date:** 2026-05-13
**Valid until:** 2026-06-12 (30 days) — Scryfall query, package versions, and Supabase Dashboard UI locations should be re-verified if planning is delayed beyond this date.
