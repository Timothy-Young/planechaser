# Walking Skeleton: PlaneChaser Phase 1

**Phase:** 01-planechase-core
**Mode:** Walking Skeleton (Phase 1 of new project)
**Date:** 2026-05-13

---

## What the Walking Skeleton Proves

After Plan 01-01 completes, the following must work end-to-end on `localhost:3000`:

1. App loads — fonts (Russo One, Chakra Petch), dark OLED background (#0F0F23), CRT scanline overlay
2. `/auth` route exists and renders (even if form is not wired to Supabase yet)
3. `/setup` route exists and redirects to `/auth` if no session (middleware protecting it)
4. Supabase client can connect — health check passes (env vars present, client initializes)
5. `card_cache` Postgres table exists and is queryable
6. `game_sessions` Postgres table exists and is queryable
7. `npx vitest run` exits 0 (even with only scaffold tests)
8. `npx tsc --noEmit` exits 0

The skeleton is NOT a feature demo. It proves the architecture connective tissue works before any feature logic is built.

---

## Architectural Decisions (locked for all phases)

### Framework
| Decision | Value | Rationale |
|----------|-------|-----------|
| Framework | Next.js 16.x (App Router) | SSR + API routes + Vercel deployment in one |
| Router | App Router exclusively | `pages/` directory prohibited |
| React | 19.x (ships with Next.js) | Concurrent features, ships as peer |
| TypeScript | 5.x strict mode | Catches Scryfall API shape mismatches |
| Node minimum | 18.x | Next.js 15+ requirement |

### Auth + Database
| Decision | Value | Rationale |
|----------|-------|-----------|
| Auth provider | Supabase Auth | Email/password + Google OAuth bundled |
| Session layer | `@supabase/ssr` 0.x | App Router cookie handling; replaces deprecated `auth-helpers-nextjs` |
| Database | Supabase Postgres (hosted) | Same platform as auth; RLS for future conquest ownership |
| JWT TTL | 14400 seconds (4 hours) | Commander games run 2-4h; default 1h breaks mid-game |
| Server client | `createServerClient` from `@supabase/ssr` | Used in middleware, Server Components, Route Handlers |
| Browser client | `createBrowserClient` from `@supabase/ssr` | Used in Client Components |
| Auth guard | `getUser()` NOT `getSession()` | `getSession()` does not validate against Supabase Auth server |

### Styling
| Decision | Value | Rationale |
|----------|-------|-----------|
| CSS framework | Tailwind CSS v4 | CSS-native engine; no tailwind.config.js; `@theme inline` in globals.css |
| Component primitives | shadcn/ui (copy-in pattern) | Owned components; no upstream version lock |
| Animation import | `tw-animate-css` (NOT `tailwindcss-animate`) | `tailwindcss-animate` is deprecated in Tailwind v4 |
| Config location | `src/app/globals.css` via `@import "tailwindcss"` + `@theme inline` | No tailwind.config.js generated for v4 |

### Animation
| Decision | Value | Rationale |
|----------|-------|-----------|
| Animation library | `framer-motion` (package name) | v12 is a shim for `motion`; same API; do NOT mix `motion/react` imports |
| Die roll | AnimatePresence + spring | stiffness: 200, damping: 25 per UI-SPEC |
| Reduced motion | `useReducedMotion()` hook | Must gate ALL Framer Motion effects |

### State Architecture
| Layer | Technology | Persistence | Notes |
|-------|-----------|-------------|-------|
| In-session game state | `useReducer` + React Context | sessionStorage | Zero server calls during active play |
| App-level state (user, pod) | Zustand 5.x + `persist` | localStorage | Hydration guard pattern required |
| Server data (profile, pod) | TanStack Query v5 | In-memory + staleTime | `QueryClientProvider` must be in a `'use client'` providers.tsx |
| UI component state | `useState` | — | Local; no persistence |

### Card Data
| Decision | Value | Rationale |
|----------|-------|-----------|
| Image delivery | Client-side from `cards.scryfall.io` CDN | NEVER server-proxied (Scryfall ToS + legal) |
| Image component | `next/image` with `remotePatterns` | Lazy load, WebP, blur placeholder |
| Card metadata | Supabase `card_cache` table (30-day TTL) | Served via `/api/scryfall/planes` Route Handler |
| Scryfall SDK | NONE — typed `fetch` wrapper | `scryfall-sdk` npm is unofficial; write `src/lib/scryfall/client.ts` |
| Rate limiting | 100ms delay between Scryfall requests | `User-Agent: PlaneChaser/1.0 codetimcode@gmail.com` |

### Testing
| Tool | Purpose | Config file |
|------|---------|------------|
| Vitest 4.x | Unit + integration | `vitest.config.ts` |
| React Testing Library | Component tests | Paired with Vitest |
| Playwright 1.x | E2E (auth flow, game session) | `playwright.config.ts` (375×812 mobile viewport) |

### Deployment
| Decision | Value |
|----------|-------|
| Hosting | Vercel |
| Database | Supabase hosted (free tier) |
| PWA | Deferred to Phase 4 (`@serwist/next`) |

---

## Directory Layout

```
planechaser/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── auth/
│   │   │       └── page.tsx              # Auth screen (login + register)
│   │   ├── (game)/
│   │   │   ├── setup/
│   │   │   │   └── page.tsx              # Game Setup screen
│   │   │   └── game/
│   │   │       └── page.tsx              # Game Screen (main)
│   │   ├── api/
│   │   │   ├── scryfall/
│   │   │   │   └── planes/
│   │   │   │       └── route.ts          # Plane corpus cache proxy
│   │   │   └── sessions/
│   │   │       └── route.ts              # POST game session at end
│   │   ├── layout.tsx                    # Root layout (fonts, providers, WotC disclaimer)
│   │   └── globals.css                   # Tailwind v4 @import + @theme inline tokens
│   ├── components/
│   │   ├── ui/                           # shadcn copy-in components (owned)
│   │   └── game/                         # Custom game components
│   │       ├── PlaneCard.tsx
│   │       ├── DieButton.tsx
│   │       ├── ChaosCounter.tsx
│   │       ├── DieResultOverlay.tsx
│   │       ├── RollLogEntry.tsx
│   │       └── UserAccountMenu.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # createBrowserClient
│   │   │   └── server.ts                 # createServerClient (Server Components)
│   │   ├── game/
│   │   │   ├── engine.ts                 # Pure TS game engine (reducer, state machine)
│   │   │   ├── engine.test.ts            # Vitest unit tests
│   │   │   ├── shuffle.ts                # Fisher-Yates deck shuffle
│   │   │   └── types.ts                  # ActiveGameSession, DieRoll, PlaneCard interfaces
│   │   ├── scryfall/
│   │   │   ├── client.ts                 # Typed fetch wrapper
│   │   │   └── types.ts                  # ScryfallCard, ScryfallList interfaces
│   │   └── session-storage.ts            # Serialize/deserialize ActiveGameSession
│   ├── hooks/
│   │   ├── useGameEngine.ts              # Context consumer hook
│   │   ├── useGameSession.ts             # sessionStorage read/write
│   │   └── usePlaneCorpus.ts             # TanStack Query wrapper for /api/scryfall/planes
│   ├── store/
│   │   └── app-store.ts                  # Zustand store (auth user, notifications)
│   └── middleware.ts                     # @supabase/ssr session refresh + route protection
├── tests/
│   ├── auth.spec.ts                      # Playwright E2E auth flow
│   └── game-session.spec.ts              # Playwright E2E game session (375px viewport)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # card_cache, game_sessions, profiles tables
├── next.config.ts                        # remotePatterns for cards.scryfall.io
├── vitest.config.ts                      # tsconfigPaths, react plugin, jsdom
├── playwright.config.ts                  # mobile viewport 375x812, baseURL localhost:3000
├── .env.local.example                    # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── components.json                       # shadcn/ui config (generated by init)
```

---

## Database Schema (Postgres via Supabase)

```sql
-- card_cache: stores Scryfall plane corpus JSON with 30-day TTL
CREATE TABLE card_cache (
  card_type TEXT PRIMARY KEY,
  raw_json  JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- game_sessions: written once at game end (GAME-08); Phase 2 reads for conquest eligibility
CREATE TABLE game_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id    UUID NOT NULL REFERENCES auth.users(id),
  players         JSONB NOT NULL,  -- [{ user_id, display_name }]
  planes_visited  JSONB NOT NULL,  -- string[] of Scryfall IDs in visit order
  die_roll_history JSONB NOT NULL, -- DieRoll[]
  winner_user_id  UUID REFERENCES auth.users(id),
  win_condition   TEXT NOT NULL DEFAULT 'none',
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles: extends auth.users with display_name for username lookup
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Environment Variables Required

| Variable | Source | Required For |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | All Supabase operations |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | All Supabase operations |

Google OAuth credentials are configured in Supabase Dashboard → Authentication → Providers → Google.
No additional env vars needed for OAuth — Supabase handles the redirect.

---

## First Deployable Milestone

After Wave 1 (Plan 01-01) completes:
- `npm run dev` starts without errors
- `localhost:3000/auth` renders auth screen with correct dark theme
- `localhost:3000/setup` redirects to `/auth` (middleware protection working)
- Supabase tables (`card_cache`, `game_sessions`, `profiles`) exist
- `npx tsc --noEmit` exits 0
- `npx vitest run` exits 0

This is the skeleton. Every subsequent plan builds features on top of this proven foundation.
