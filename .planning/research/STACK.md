# Technology Stack

**Project:** PlaneChaser — MTG Planechase/Archenemy Companion Web App
**Researched:** 2026-05-13
**Confidence note:** External lookup tools (WebSearch, Context7, Bash) were unavailable in this session. All recommendations are drawn from verified knowledge through August 2025. Confidence levels reflect this constraint. Versions should be re-verified against official docs before pinning in package.json.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (App Router) | Full-stack framework | SSR for fast first paint on mobile; App Router provides file-based routing, layouts, and server components that are now the stable standard. API routes eliminate a separate backend process. PWA support via next-pwa fits the shared-device, offline-tolerant use case. |
| React | 19.x | UI library | Ships with Next.js 15. React 19 concurrent features enable smooth animations (die roll, card draw) without jank. |
| TypeScript | 5.x | Type safety | Catches shape mismatches against Scryfall API responses at compile time — critical when you don't own the schema. |

**Why Next.js over plain Vite/React:** The app needs server-side logic for auth callbacks, Scryfall proxy (rate-limit protection, caching), and potentially server-side rendering for the plane card display. A single Next.js deployment on Vercel covers all of this without a separate API server. Vite is excellent but would require a separate backend — extra operational surface with no benefit for this scale.

**Why not Remix:** Remix is a strong alternative but the Next.js App Router is now equally capable of progressive enhancement and has a vastly larger 2025 ecosystem and hiring pool. No technical reason to prefer Remix here.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth | 2.x (`@supabase/supabase-js`) | User accounts, session management | Provides email/password + OAuth (Google, Discord — relevant for gaming community) out of the box. Free tier is generous for a side project. Row-level security (RLS) means the same Postgres database serves as both auth and data store with enforced ownership rules. |
| `@supabase/ssr` | 0.x | Next.js App Router session handling | Official package for reading/writing Supabase sessions in Server Components, middleware, and Route Handlers. Required for App Router; replaces the deprecated `@supabase/auth-helpers-nextjs`. |

**Why Supabase over NextAuth/Auth.js:** Auth.js (NextAuth v5) is excellent but requires your own database adapter and separate data layer configuration. Supabase bundles auth + Postgres + realtime + storage in one hosted platform — fewer integration points for a solo/small project. The RLS policies make it easy to enforce "only this user can write to their conquest records."

**Why not Clerk:** Clerk has superb DX but is a paid service past the free tier limits, and adds a third-party dependency in the critical auth path. Supabase keeps all data in one place.

**Confidence:** HIGH — Supabase + Next.js App Router is a well-established pattern as of 2025.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (Postgres) | via hosted service | Persistent user data: plane collections, achievements, pods | Relational model maps cleanly to the data: users → pods (many-to-many), users → conquered_planes (one-to-many with metadata), pods → archenemy_status. Postgres JSON columns handle flexible achievement definitions. |
| Supabase Realtime | bundled | Live pod membership / leaderboard updates | Built into Supabase; Postgres-change streaming over websockets. Enables pod leaderboards to update without polling. Not needed for the game session itself (single device) but useful for pod management screens. |

**Schema notes:**
- `users` — managed by Supabase Auth, extended with profile data
- `pods` — group name, threshold config, archenemy status
- `pod_members` — user_id, pod_id, role
- `conquered_planes` — user_id, plane_scryfall_id, conquered_at, pod_id
- `achievements` — user_id, achievement_key, earned_at, metadata (JSONB)
- `game_sessions` — pod_id, started_at, planes_visited (JSONB array), winner_user_id

**Why not Firebase/Firestore:** Firebase has worse TypeScript ergonomics, no native SQL (harder for relational pod/plane queries), and vendor lock-in to Google. Supabase provides Postgres and a migration-based workflow compatible with standard tools.

**Why not PlanetScale/Neon + separate auth:** More moving parts for no gain at this scale.

**Confidence:** HIGH

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | v4 uses a native CSS engine (no PostCSS required), faster builds, and CSS variables for theming. Mobile-first utilities (`sm:`, `md:` prefixes) match the project's 375px-primary layout requirement. Dark mode with `dark:` prefix suits a card game app. |
| shadcn/ui | current (tracks Radix) | Accessible component primitives | Not a dependency — it's a code-copy pattern. Components are pasted into the project and owned, so there's no upstream version lock. Provides accessible Dialog, Sheet, Button, Tabs as starting points. Pair with Tailwind. |

**Why not MUI / Chakra / Mantine:** These are full component libraries with heavy JS bundles. On mobile, bundle size matters. Tailwind + shadcn/ui gives comparable DX with better control over what ships.

**Confidence:** HIGH for Tailwind v4. MEDIUM for shadcn/ui (the "no dependency" model is unconventional; verify it still suits the team's workflow).

---

### Animation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Framer Motion | 11.x | Die roll animation, card draw/flip, chaos effect transitions | The de facto React animation library. `useAnimate` hook and `AnimatePresence` handle the die roll sequence (numeric spin → final face reveal) and card entrance/exit animations cleanly. Springs and physics make the die feel tactile. |
| CSS Animations (native) | — | Simple entrance effects, loading states | Use for anything Framer Motion is overkill for. Tailwind's `animate-` utilities cover pulse/spin/bounce. |

**Why not React Spring:** React Spring is excellent but Framer Motion has better documentation, more examples for game-like UI, and `AnimatePresence` specifically solves the card-replacement animation (old plane exits as new plane enters) elegantly.

**Why not GSAP:** GSAP is the most powerful option but requires a paid license for some plugins and its API is more complex than needed for this scope.

**Confidence:** HIGH

---

### Scryfall API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `fetch` (Next.js) | built-in | Scryfall API calls | No SDK needed — Scryfall's REST API is simple, well-documented, and returns predictable JSON. Next.js `fetch` with extended options handles caching natively. |
| Next.js Route Handlers (proxy) | built-in | Rate-limit protection + response caching | Scryfall's rate limit is 50–100ms between requests. A server-side proxy route (`/api/scryfall/[...path]`) batches requests, caches responses in memory or edge cache, and prevents the client from hammering Scryfall directly. This also hides any API key if Scryfall ever introduces one. |
| `next/image` | built-in | Card image display with lazy loading | Handles lazy loading, blur-up placeholders, and format conversion (WebP) automatically. Critical for perceived performance on mobile — the card image is the primary visual element. Configure `remotePatterns` to allow `cards.scryfall.io`. |

**Scryfall-specific patterns:**

1. **Pre-fetch the plane/scheme card list at build time** — Scryfall has a "search by set" endpoint. The full list of Planechase plane cards (set codes: `ohop`, `opca`, `ogw` planechase, `opc2`, `hop`) and Archenemy scheme cards (`oarc`, `oarch`) is small enough (~200 cards combined) to fetch once at build time via `generateStaticParams` or an initialization script, storing card IDs in a JSON asset. This eliminates runtime Scryfall dependency during gameplay.

2. **Image URL structure** — Scryfall image URIs follow `https://cards.scryfall.io/{size}/{face}/{id1}/{id2}/{uuid}.jpg`. Use `normal` size (488×680px) for gameplay display; `small` for thumbnails. Never `large` on mobile.

3. **Card search endpoint for gameplay** — Use `https://api.scryfall.com/cards/search?q=type%3Aplane+set%3Ahop` style queries during the data-init phase, not during live gameplay.

4. **No official Scryfall JavaScript SDK exists** (as of knowledge cutoff). The community library `scryfall-sdk` (npm) exists but is unofficial, may lag behind API changes, and adds a dependency for a simple REST API. Use `fetch` directly with a typed wrapper.

**Typed Scryfall wrapper pattern:**
```typescript
// lib/scryfall.ts
export type ScryfallCard = {
  id: string;
  name: string;
  type_line: string;
  oracle_text: string;
  image_uris: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
  };
  set: string;
  set_name: string;
};

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`,
    { next: { revalidate: 86400 } } // cache 24h
  );
  if (!res.ok) throw new Error(`Scryfall error: ${res.status}`);
  const data = await res.json();
  return data.data as ScryfallCard[];
}
```

**Confidence:** HIGH for the fetch-based approach. MEDIUM for the pre-fetch-at-build-time pattern (verify Scryfall ToS allows automated bulk fetches; their bulk data endpoint is specifically designed for this).

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Context + `useReducer` | built-in | In-session game state (current plane, die roll history, turn state) | The game session state is local to one device, non-persistent across refreshes mid-game, and follows a clear event-driven model (rolled die → chaos triggered → plane changed). A reducer with typed action unions is clean and testable without extra libraries. |
| Zustand | 4.x | Cross-page app state (current user, active pod, conquest notifications) | Lighter than Redux, simpler than MobX. The `persist` middleware syncs to `localStorage` for things like "which pod am I in right now" — survives page refreshes without a server round-trip. |
| TanStack Query (React Query) | 5.x | Server data: user profile, pod data, achievement list, conquered planes | Handles caching, background refetch, loading/error states for all Supabase data reads. Eliminates manual `useEffect` + loading state boilerplate. The `staleTime` config controls how aggressively it re-fetches conquest data. |

**Why this split:** Game session state (die, current plane, chaos cost) is ephemeral and local — Context/useReducer is correct. Cross-page identity state (who am I, what pod am I in) persists but doesn't need server sync on every read — Zustand with localStorage is correct. Server data (conquests, achievements, leaderboard) needs cache + refetch semantics — TanStack Query is correct.

**Why not Redux Toolkit:** Overkill for this scope. The boilerplate cost isn't paid back by any capability needed here.

**Confidence:** HIGH

---

### Infrastructure & Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | current | Hosting | Zero-config Next.js deployment; edge network improves mobile TTFB; preview deployments for each PR. Free tier is sufficient for early development. |
| Supabase (hosted) | current | Database + Auth backend | Free tier: 500MB DB, 50k MAU. Sufficient for a pod-based gaming app with modest user counts. |

**Why not self-hosted Supabase / Railway / Render:** Additional ops complexity with no benefit for a side project. Vercel + Supabase hosted is the minimal-ops path.

**Confidence:** HIGH

---

### PWA (Progressive Web App)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next-pwa` or `@ducanh2912/next-pwa` | current | Service worker, offline support, "Add to Home Screen" | Players use one shared device at a table — installing the app to the home screen eliminates the browser chrome and gives full-screen display. Service worker caches card images after first load; subsequent games work even with spotty table wifi. |

**Note:** Next.js 15 does not have built-in PWA support. `@ducanh2912/next-pwa` is the maintained fork of `next-pwa` compatible with Next.js 13+ App Router. Verify the exact package name and version before use — this space moves fast.

**Confidence:** MEDIUM — verify `@ducanh2912/next-pwa` compatibility with Next.js 15 App Router before committing.

---

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 2.x | Unit + integration tests | Faster than Jest, native ESM support, compatible with Vite's transform pipeline. Test game logic (shuffle algorithms, die roll distribution, conquest threshold checks) without a browser. |
| React Testing Library | 15.x | Component tests | Test user interactions: tapping "Roll Die," confirming conquest, joining a pod. Pairs with Vitest. |
| Playwright | 1.x | E2E tests for critical paths | Auth flow, starting a game session, rolling die, conquering a plane. Mobile viewport presets test the 375px layout. |

**Confidence:** HIGH

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | Vite + React SPA | SPA requires separate API server for auth callbacks and Scryfall proxy; no SSR for first-load performance |
| Framework | Next.js 15 | Remix | Equivalent capability; smaller ecosystem and community in 2025; no technical advantage here |
| Auth | Supabase Auth | Auth.js (NextAuth v5) | More configuration required; doesn't bundle a database; two integration points instead of one |
| Auth | Supabase Auth | Clerk | Paid past free limits; third-party dependency in critical path |
| Database | Supabase Postgres | Firebase Firestore | Worse TypeScript ergonomics; NoSQL awkward for relational pod/user/plane data; Google vendor lock-in |
| Database | Supabase Postgres | PlanetScale | Separate auth story; MySQL dialect loses Postgres JSON and RLS features |
| Styling | Tailwind CSS v4 | Tailwind CSS v3 | v4 is the current release; CSS-native engine is faster; no reason to use v3 for a greenfield project |
| Styling | Tailwind + shadcn/ui | MUI / Chakra | Heavy JS bundles; opinionated design systems that fight a custom card-game aesthetic |
| Animation | Framer Motion | React Spring | Both excellent; Framer Motion has better docs and AnimatePresence for card transitions |
| Animation | Framer Motion | GSAP | GSAP is more powerful but overkill; some plugins are paid |
| State (server) | TanStack Query v5 | SWR | TanStack Query has better devtools, more granular cache control, and mutation patterns needed for conquest recording |
| Scryfall | fetch wrapper | `scryfall-sdk` npm | Unofficial; adds dependency for a simple REST API; type definitions may lag |
| Deployment | Vercel | Netlify | Both are fine; Vercel has tighter Next.js integration (same company) |

---

## What NOT to Use

| Technology | Reason to Avoid |
|------------|----------------|
| `scryfall-sdk` (npm) | Unofficial SDK, may have stale types, adds a dependency for a thin REST wrapper. Write a typed `fetch` wrapper instead. |
| Socket.io / WebSockets for game state | Out of scope per PROJECT.md: "one shared device, no real-time sync." Don't add this complexity. Supabase Realtime covers the only legitimate use case (pod leaderboard). |
| Redux Toolkit | Overkill. Context + Zustand + TanStack Query covers every state layer without the boilerplate. |
| react-query v3 / v4 | Use TanStack Query v5 only — v3/v4 APIs differ significantly and community attention has moved to v5. |
| NextAuth v4 | Deprecated. If using Auth.js at all, use v5 — but Supabase Auth is preferred. |
| Tailwind CSS v3 | Greenfield project — use v4 for CSS-native engine and improved DX. |
| `pages/` router (Next.js) | Legacy. Use App Router exclusively. The `pages/` router is in maintenance mode. |
| React Native / Expo | The PROJECT.md targets a web app. React Native adds a build/deployment layer with no benefit for a browser-based companion app. |

---

## Installation

```bash
# Scaffold
npx create-next-app@latest planechaser --typescript --tailwind --eslint --app

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Animation
npm install framer-motion

# State
npm install zustand @tanstack/react-query

# UI primitives (shadcn/ui — run once, then add components individually)
npx shadcn@latest init

# PWA (verify version compatibility with Next.js 15 before running)
npm install @ducanh2912/next-pwa

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event playwright @playwright/test
```

---

## Key Version Verification Checklist

Before starting development, verify these against official sources:

- [ ] Next.js: `npm info next version` — expect 15.x
- [ ] React: `npm info react version` — expect 19.x
- [ ] Tailwind CSS: `npm info tailwindcss version` — expect 4.x
- [ ] `@supabase/supabase-js`: `npm info @supabase/supabase-js version` — expect 2.x
- [ ] `@supabase/ssr`: `npm info @supabase/ssr version`
- [ ] Framer Motion: `npm info framer-motion version` — expect 11.x
- [ ] TanStack Query: `npm info @tanstack/react-query version` — expect 5.x
- [ ] `@ducanh2912/next-pwa`: verify App Router compatibility in README

---

## Sources

**Note:** External documentation tools (WebSearch, Context7, WebFetch) were unavailable during this research session. All recommendations are based on verified ecosystem knowledge through August 2025. Confidence levels are assigned conservatively.

Authoritative sources to verify before implementation:
- Next.js 15 App Router: https://nextjs.org/docs
- Supabase + Next.js App Router guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- `@supabase/ssr` package: https://supabase.com/docs/guides/auth/server-side-rendering
- Scryfall API reference: https://scryfall.com/docs/api
- Scryfall bulk data (for pre-fetch strategy): https://scryfall.com/docs/api/bulk-data
- Tailwind CSS v4: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion/
- TanStack Query v5: https://tanstack.com/query/v5/docs
- shadcn/ui: https://ui.shadcn.com/docs
- `@ducanh2912/next-pwa`: https://ducanh2912.github.io/next-pwa/
