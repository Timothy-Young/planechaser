<!-- GSD:project-start source:PROJECT.md -->
## Project

**PlaneChaser**

PlaneChaser is a mobile-friendly web companion app for Magic: The Gathering players who use the Planechase and Archenemy formats. Players share one device during a game to draw random plane cards, roll the planar die, and track game state. Across sessions, a persistent conquest meta-game lets players claim planes by winning Commander games — and when one player dominates enough, the entire pod escalates into an Archenemy showdown.

**Core Value:** The conquest meta-game that turns every Commander game into a campaign — planechasers become conquerors, and conquerors become archenemies.

### Constraints

- **Tech**: Scryfall API must be used for card images and data — no self-hosted card database
- **Legal**: Must comply with Scryfall's terms of use and Wizards of the Coast's fan content policy for card art display
- **Mobile**: Must be fully usable on a 375px-wide phone screen with touch-friendly controls
- **Performance**: Plane card images must load quickly; lazy loading and caching required
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (App Router) | Full-stack framework | SSR for fast first paint on mobile; App Router provides file-based routing, layouts, and server components that are now the stable standard. API routes eliminate a separate backend process. PWA support via next-pwa fits the shared-device, offline-tolerant use case. |
| React | 19.x | UI library | Ships with Next.js 15. React 19 concurrent features enable smooth animations (die roll, card draw) without jank. |
| TypeScript | 5.x | Type safety | Catches shape mismatches against Scryfall API responses at compile time — critical when you don't own the schema. |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth | 2.x (`@supabase/supabase-js`) | User accounts, session management | Provides email/password + OAuth (Google, Discord — relevant for gaming community) out of the box. Free tier is generous for a side project. Row-level security (RLS) means the same Postgres database serves as both auth and data store with enforced ownership rules. |
| `@supabase/ssr` | 0.x | Next.js App Router session handling | Official package for reading/writing Supabase sessions in Server Components, middleware, and Route Handlers. Required for App Router; replaces the deprecated `@supabase/auth-helpers-nextjs`. |
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (Postgres) | via hosted service | Persistent user data: plane collections, achievements, pods | Relational model maps cleanly to the data: users → pods (many-to-many), users → conquered_planes (one-to-many with metadata), pods → archenemy_status. Postgres JSON columns handle flexible achievement definitions. |
| Supabase Realtime | bundled | Live pod membership / leaderboard updates | Built into Supabase; Postgres-change streaming over websockets. Enables pod leaderboards to update without polling. Not needed for the game session itself (single device) but useful for pod management screens. |
- `users` — managed by Supabase Auth, extended with profile data
- `pods` — group name, threshold config, archenemy status
- `pod_members` — user_id, pod_id, role
- `conquered_planes` — user_id, plane_scryfall_id, conquered_at, pod_id
- `achievements` — user_id, achievement_key, earned_at, metadata (JSONB)
- `game_sessions` — pod_id, started_at, planes_visited (JSONB array), winner_user_id
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | v4 uses a native CSS engine (no PostCSS required), faster builds, and CSS variables for theming. Mobile-first utilities (`sm:`, `md:` prefixes) match the project's 375px-primary layout requirement. Dark mode with `dark:` prefix suits a card game app. |
| shadcn/ui | current (tracks Radix) | Accessible component primitives | Not a dependency — it's a code-copy pattern. Components are pasted into the project and owned, so there's no upstream version lock. Provides accessible Dialog, Sheet, Button, Tabs as starting points. Pair with Tailwind. |
### Animation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Framer Motion | 11.x | Die roll animation, card draw/flip, chaos effect transitions | The de facto React animation library. `useAnimate` hook and `AnimatePresence` handle the die roll sequence (numeric spin → final face reveal) and card entrance/exit animations cleanly. Springs and physics make the die feel tactile. |
| CSS Animations (native) | — | Simple entrance effects, loading states | Use for anything Framer Motion is overkill for. Tailwind's `animate-` utilities cover pulse/spin/bounce. |
### Scryfall API Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `fetch` (Next.js) | built-in | Scryfall API calls | No SDK needed — Scryfall's REST API is simple, well-documented, and returns predictable JSON. Next.js `fetch` with extended options handles caching natively. |
| Next.js Route Handlers (proxy) | built-in | Rate-limit protection + response caching | Scryfall's rate limit is 50–100ms between requests. A server-side proxy route (`/api/scryfall/[...path]`) batches requests, caches responses in memory or edge cache, and prevents the client from hammering Scryfall directly. This also hides any API key if Scryfall ever introduces one. |
| `next/image` | built-in | Card image display with lazy loading | Handles lazy loading, blur-up placeholders, and format conversion (WebP) automatically. Critical for perceived performance on mobile — the card image is the primary visual element. Configure `remotePatterns` to allow `cards.scryfall.io`. |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Context + `useReducer` | built-in | In-session game state (current plane, die roll history, turn state) | The game session state is local to one device, non-persistent across refreshes mid-game, and follows a clear event-driven model (rolled die → chaos triggered → plane changed). A reducer with typed action unions is clean and testable without extra libraries. |
| Zustand | 4.x | Cross-page app state (current user, active pod, conquest notifications) | Lighter than Redux, simpler than MobX. The `persist` middleware syncs to `localStorage` for things like "which pod am I in right now" — survives page refreshes without a server round-trip. |
| TanStack Query (React Query) | 5.x | Server data: user profile, pod data, achievement list, conquered planes | Handles caching, background refetch, loading/error states for all Supabase data reads. Eliminates manual `useEffect` + loading state boilerplate. The `staleTime` config controls how aggressively it re-fetches conquest data. |
### Infrastructure & Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | current | Hosting | Zero-config Next.js deployment; edge network improves mobile TTFB; preview deployments for each PR. Free tier is sufficient for early development. |
| Supabase (hosted) | current | Database + Auth backend | Free tier: 500MB DB, 50k MAU. Sufficient for a pod-based gaming app with modest user counts. |
### PWA (Progressive Web App)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next-pwa` or `@ducanh2912/next-pwa` | current | Service worker, offline support, "Add to Home Screen" | Players use one shared device at a table — installing the app to the home screen eliminates the browser chrome and gives full-screen display. Service worker caches card images after first load; subsequent games work even with spotty table wifi. |
### Testing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 2.x | Unit + integration tests | Faster than Jest, native ESM support, compatible with Vite's transform pipeline. Test game logic (shuffle algorithms, die roll distribution, conquest threshold checks) without a browser. |
| React Testing Library | 15.x | Component tests | Test user interactions: tapping "Roll Die," confirming conquest, joining a pod. Pairs with Vitest. |
| Playwright | 1.x | E2E tests for critical paths | Auth flow, starting a game session, rolling die, conquering a plane. Mobile viewport presets test the 375px layout. |
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
## Installation
# Scaffold
# Supabase
# Animation
# State
# UI primitives (shadcn/ui — run once, then add components individually)
# PWA (verify version compatibility with Next.js 15 before running)
# Testing
## Key Version Verification Checklist
- [ ] Next.js: `npm info next version` — expect 15.x
- [ ] React: `npm info react version` — expect 19.x
- [ ] Tailwind CSS: `npm info tailwindcss version` — expect 4.x
- [ ] `@supabase/supabase-js`: `npm info @supabase/supabase-js version` — expect 2.x
- [ ] `@supabase/ssr`: `npm info @supabase/ssr version`
- [ ] Framer Motion: `npm info framer-motion version` — expect 11.x
- [ ] TanStack Query: `npm info @tanstack/react-query version` — expect 5.x
- [ ] `@ducanh2912/next-pwa`: verify App Router compatibility in README
## Sources
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
