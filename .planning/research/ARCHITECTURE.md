# Architecture Patterns

**Domain:** MTG companion app — Planechase + Archenemy formats with conquest meta-game
**Researched:** 2026-05-13
**Confidence:** HIGH (well-understood SPA + REST + auth patterns; Scryfall API is stable and documented)

---

## Recommended Architecture

Single-page application (React) backed by a lightweight REST API. No real-time sync — the
shared-device model removes that complexity entirely. State splits cleanly into two layers:
ephemeral game state (lives in React, survives a page refresh via sessionStorage) and
persistent meta-game state (lives in a backend DB, owned by user accounts).

```
Browser (React SPA)
  ├── Game Engine Layer       — ephemeral, in-memory + sessionStorage
  ├── UI Layer                — screens, components, animations
  └── API Client Layer        — REST calls + Scryfall proxy cache

Backend (Node / Express or similar)
  ├── Auth API                — JWT issue / refresh / verify
  ├── Game Session API        — record session outcomes, trigger conquest
  ├── Conquest / Meta API     — planes owned, pod membership, Archenemy status
  └── Achievement API         — evaluate and award badges

External
  └── Scryfall API            — card data + images (via backend proxy cache)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Auth Module** | Registration, login, JWT issue/refresh, session cookie | DB (users table), all protected API routes |
| **Card Cache Service** | Proxies Scryfall, stores card JSON + image URLs in DB/Redis | Scryfall API (outbound), Game Session API (inbound) |
| **Game Engine (client)** | Plane deck state, die roll logic, chaos cost counter, session history | Card Cache Service, sessionStorage |
| **Session Recorder (server)** | Receives end-of-session payload, persists visit history and conquest claims | DB (sessions, conquests), Achievement Evaluator |
| **Conquest / Meta Service** | Owns the "who controls which plane" truth, evaluates Archenemy threshold | DB (conquests, pods), Session Recorder |
| **Pod Manager** | Create/join pods, per-pod Archenemy threshold config, leaderboard queries | DB (pods, memberships), Conquest Service |
| **Achievement Evaluator** | Triggered post-session; evaluates rules against updated profile | DB (achievements, sessions, conquests) |
| **UI: Game Screen** | Full-screen plane display, die roll UI, chaos cost counter | Game Engine, Card Cache |
| **UI: Setup Flow** | Player count, pod selection, deck filters, session init | Pod Manager, Game Engine |
| **UI: Profile / Meta** | Conquered planes gallery, achievement badges, Archenemy status | Conquest Service, Achievement Evaluator |
| **UI: Pod Dashboard** | Pod leaderboard, Archenemy candidate, per-pod history | Pod Manager, Conquest Service |

---

## Data Model

### Ephemeral Game State (client-only, sessionStorage)

```typescript
interface ActiveGameSession {
  sessionId: string;           // uuid, created on session start
  podId: string | null;
  players: Player[];
  planeDeck: PlaneCard[];      // shuffled subset of all planes
  planeDeckIndex: number;      // pointer into deck
  currentPlane: PlaneCard;
  visitedThisSession: string[]; // planeId list, in order
  dieRollHistory: DieRoll[];
  chaosCostThisTurn: number;   // resets each turn; {1} per extra roll
  activeFormat: 'planechase' | 'archenemy';
  archnemeyPlayerId: string | null;
  currentSchemeCard: SchemeCard | null;
}

interface DieRoll {
  timestamp: number;
  result: 'planeswalk' | 'chaos' | 'blank';
  chaosCostPaid: number;
}
```

This object is initialized fresh each game and written to sessionStorage after every state
change. On browser refresh, the session resumes from sessionStorage — critical for a
shared device that might sleep mid-game.

### Persistent Data (server DB)

```
users
  id, email, password_hash, display_name, created_at, updated_at

pods
  id, name, created_by, archenemy_threshold (default 5), created_at

pod_memberships
  pod_id, user_id, joined_at, role (owner|member)

plane_conquests
  id, user_id, plane_scryfall_id, conquered_at, session_id
  -- one row per conquest event; current owner = most recent per plane per pod scope
  -- NOTE: conquest is pod-scoped; same plane can be owned by different users in different pods

game_sessions
  id, pod_id, created_by, started_at, ended_at, format, winner_user_id,
  archenemy_user_id, archenemy_outcome (won|lost|null)

session_plane_visits
  session_id, plane_scryfall_id, visit_order, chaos_triggered

archenemy_schemes_played
  session_id, scheme_scryfall_id, turn_played

achievements
  id, user_id, achievement_key, earned_at, session_id

card_cache
  scryfall_id, name, type_line, oracle_text, image_uri, cached_at, raw_json
  -- server-side; prevents hammering Scryfall
```

### Conquest Ownership Model

Conquest is pod-scoped. Within a pod, the most recent `plane_conquests` row for a given
`plane_scryfall_id` determines current ownership. This allows:
- The same plane to be contested and re-conquered across sessions
- Per-pod Archenemy threshold evaluation
- "Steal conquered planes" on Archenemy defeat (insert new rows for winning team members
  via a vote transaction)

Archenemy threshold query (per pod):
```sql
SELECT user_id, COUNT(*) as plane_count
FROM plane_conquests pc
JOIN (
  SELECT plane_scryfall_id, MAX(conquered_at) as latest
  FROM plane_conquests
  WHERE pod_id = :pod_id
  GROUP BY plane_scryfall_id
) latest ON pc.plane_scryfall_id = latest.plane_scryfall_id
         AND pc.conquered_at = latest.latest
WHERE pc.pod_id = :pod_id
GROUP BY user_id
HAVING COUNT(*) >= :threshold;
```

---

## Data Flow

### Game Session Flow (happy path)

```
1. Setup Flow
   User selects pod → Pod Manager returns pod config (threshold, members)
   User configures deck filters → Game Engine requests plane list from Card Cache
   Card Cache checks DB → if stale/missing, fetches from Scryfall, stores, returns
   Game Engine shuffles deck, creates ActiveGameSession, writes to sessionStorage

2. Active Gameplay (all client-side, no server calls)
   Die roll → Game Engine updates chaosCostThisTurn, appends to dieRollHistory
   Planeswalk → Game Engine advances planeDeckIndex, updates currentPlane
   Archenemy turn → Game Engine picks next SchemeCard from shuffled scheme deck

3. Session End
   "Conquer Plane" action → Game Engine marks conquest claim in session object
   "End Session" → UI prompts for winner
   Client POSTs session payload to Session Recorder API:
     { sessionId, podId, winnerId, conquestClaims[], visitedPlanes[], archnemeyOutcome }
   Session Recorder writes game_sessions, session_plane_visits rows
   Session Recorder writes plane_conquests rows (one per claim)
   Session Recorder triggers Achievement Evaluator (async, queue or direct call)
   Session Recorder evaluates new Archenemy candidate, returns updated meta-game state
   Client clears sessionStorage, navigates to post-game summary screen

4. Post-Game Summary
   Client fetches updated profile from Conquest / Meta API
   Displays newly earned achievements, current plane gallery, Archenemy status
```

### Scryfall Data Flow

```
Client requests plane list
  → GET /api/cards/planes?filters=...
  → Card Cache Service checks card_cache table (cached_at within 30 days)
  → MISS: fetch from Scryfall /cards/search?q=type:plane
          store JSON + image_uri in card_cache
          return to client
  → HIT: return cached JSON
  → Client receives { id, name, image_uri, oracle_text }[] 
  → Browser caches image URLs via standard HTTP cache headers (Scryfall CDN is cacheable)
  → Game Engine holds full plane list in memory for session duration
```

Scryfall rate limit: 10 requests/second, with a politeness delay of 50-100ms recommended.
The backend proxy absorbs all Scryfall calls — the client never calls Scryfall directly.
Card data changes rarely (new sets); 30-day server cache is safe.

### Auth Flow

```
Register/Login → POST /auth/register or /auth/login
  → Server issues: access_token (JWT, 15min), refresh_token (opaque, 7 days, HttpOnly cookie)
  → Client stores access_token in memory (not localStorage — XSS mitigation)
  → On 401, client calls POST /auth/refresh → new access_token issued
  → All API calls include Authorization: Bearer <access_token>
```

---

## Auth Architecture

Use JWT + HttpOnly refresh token. Rationale:
- **JWT access tokens** — stateless verification on every API call, no DB lookup per request
- **HttpOnly refresh token cookie** — survives page reload on the shared device without
  exposing token to JS; CSRF mitigated by requiring JSON body on refresh endpoint
- **No OAuth for v1** — social login (Google/Discord) adds value but not for MVP; the
  friend-group context means users will register directly
- **Session-based auth is the wrong fit** — server-side sessions require sticky sessions or
  a shared session store; JWT is simpler for a stateless REST API

Access token lifetime: 15 minutes (short, reduces blast radius if stolen).
Refresh token lifetime: 7 days (covers a gaming weekend without re-login).

---

## Scryfall Integration

### Fetching Card Sets

Planechase planes: `type:plane` — returns all Plane-type cards across all sets.
Archenemy schemes: `type:scheme` — returns all Scheme-type cards.
Both sets are small and static (~150 planes, ~100 schemes as of 2025). Fetch once at
app initialization and cache server-side.

### Caching Strategy

```
Tier 1: Server DB cache (card_cache table)
  - Full card JSON stored on first fetch
  - Stale-after: 30 days (cards don't change; new sets are rare)
  - Invalidation: manual or on 404 from Scryfall (card moved/renamed)

Tier 2: In-memory (server process)
  - Warm the full plane list and scheme list on server startup
  - Served from memory for game session requests
  - No expiry — restart restarts the warm cache from DB

Tier 3: Browser HTTP cache
  - Scryfall image CDN (Cloudflare) sets long-lived cache headers
  - Browser caches images naturally; no explicit browser caching code needed
  - Service Worker (optional enhancement): pre-cache plane images on first load
    for offline resilience during a game session
```

### Image Display

Always use `image_uri.normal` (480×680px) or `image_uri.large` (672×936px) from Scryfall.
Never hotlink `image_uri.png` for bulk display — use `normal` size.
Display as `<img>` tags with `loading="lazy"` for the card gallery; eager-load the current
active plane.

---

## Component Structure (UI)

### Screen Hierarchy

```
App Shell (auth gate, global nav)
├── Auth Screens
│   ├── /login
│   └── /register
├── Hub Screen  /hub
│   ├── Recent sessions summary
│   ├── Pod selector / create pod
│   └── Quick-start CTA
├── Setup Flow  /setup/*
│   ├── /setup/players      — player count + name entry
│   ├── /setup/pod          — link to pod or play pod-less
│   ├── /setup/filters      — plane exclusion options
│   └── /setup/ready        — confirm + start
├── Game Screen  /game
│   ├── PlaneDisplay        — full-bleed card image, plane name, oracle text
│   ├── DieRoller           — animated roll, result display, chaos cost counter
│   ├── SessionControls     — end session, conquer plane, pass device
│   └── ArchnemeyOverlay    — scheme card display (conditional on format)
├── Post-Game Screen  /game/results
│   ├── ConquestConfirm     — winner selects claimed plane
│   ├── AchievementsEarned  — new badges flash
│   └── ArchnemeyVote       — team votes on plane theft (conditional)
└── Profile / Meta Screens
    ├── /profile            — conquered planes gallery, achievement badges
    ├── /pod/:id            — pod leaderboard, Archenemy status, history
    └── /settings           — account, notification prefs
```

### Key Design Decisions for Shared-Device UI

- **Game Screen is full-screen, touch-optimized** — no browser chrome visible; use
  `display: standalone` PWA manifest to eliminate address bar.
- **"Pass device" gesture** — a prominent button rotates or signals whose turn it is;
  no per-player login swap needed (game state is shared, not per-player).
- **Die roll is the hero interaction** — large tap target, satisfying animation (CSS
  transform + spring physics), clear result display at arm's length.
- **No modals during active play** — destructive actions (end session, conquer) use
  full-screen confirmation screens to prevent accidental taps.
- **Archenemy mode is a visual mode switch** — dark theme overlay signals the format
  change; scheme card replaces plane card as the primary display element.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Real-time sync between devices
**What:** WebSocket or polling to keep multiple devices in sync.
**Why bad:** The project explicitly chose one shared device. Adding sync doubles
architecture complexity, introduces conflict resolution problems, and is out of scope.
**Instead:** Commit to the shared-device model. If multi-device sync is validated later,
it's a feature addition, not a refactor.

### Anti-Pattern 2: Storing game state server-side during active play
**What:** Persisting every die roll and plane transition to the DB in real time.
**Why bad:** Adds latency to the die roll (the hero interaction), requires auth on every
roll, and creates chatty API traffic. Offline resilience is lost.
**Instead:** Keep all in-session state client-side (React + sessionStorage). Flush to
server only at session end. The single-device model makes this safe — no sync needed.

### Anti-Pattern 3: Calling Scryfall directly from the browser
**What:** Frontend makes Scryfall API calls directly.
**Why bad:** Rate limit (10 req/s) is easily hit by a group of players on slow networks
all loading the same session. No opportunity to cache. Scryfall ToS recommends
server-side caching for applications that serve multiple users.
**Instead:** All Scryfall traffic through the backend proxy cache.

### Anti-Pattern 4: Conquest as a simple flag per user per plane
**What:** A boolean `conquered: true` on a user's profile for each plane.
**Why bad:** Conquest needs to be pod-scoped (same plane can be contested in different
groups), transferable (team can steal planes), and auditable (show history). A flag loses
all of this.
**Instead:** Append-only `plane_conquests` event log. Current owner = latest row.

### Anti-Pattern 5: Achievement evaluation in the request path
**What:** The POST /session endpoint runs all achievement rules before returning.
**Why bad:** Achievement logic can be complex (lifetime stats, cross-session patterns).
Blocking the post-game response on it degrades UX.
**Instead:** Achievement evaluation runs async after session record is written. Client
polls or receives via a follow-up GET /profile after a short delay.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Scryfall proxy cache | SQLite or Postgres table, warm on startup | Same — card corpus is tiny (~250 cards) | Same — card data is static |
| game_sessions writes | Single Postgres instance | Single instance, add read replica | Partition by pod_id |
| Achievement evaluation | Synchronous in-process | Background job queue (BullMQ) | Worker fleet |
| Auth token verification | In-process JWT verify | Same (stateless) | Same |
| Plane image loading | Scryfall CDN handles it | Same | Same |

The architecture does not need to anticipate 1M users for v1. A single Postgres instance
handles the full load profile for a niche MTG companion app. Design for correctness and
developer velocity first.

---

## Build Order (Dependencies)

```
1. Card Cache Service + Scryfall proxy
   Required by: Game Engine, all card display components.
   No dependencies. Build first.

2. Auth Module (register, login, JWT issue/verify/refresh)
   Required by: all protected API routes, frontend session management.
   No dependencies on other app modules. Build second.

3. Data Model + DB migrations
   Required by: all server-side services.
   Build alongside auth.

4. Game Engine (client-side)
   Required by: Game Screen UI.
   Depends on: Card Cache Service (for plane/scheme data).
   Build as a pure TypeScript module with unit tests before wiring to UI.

5. Session Recorder API
   Required by: post-game flow, conquest, achievements.
   Depends on: Auth, DB schema.

6. Setup Flow + Game Screen UI
   The core gameplay loop. Depends on: Game Engine, Card Cache, Auth.
   This is the MVP deliverable.

7. Conquest / Meta Service + Pod Manager
   The meta-game layer. Depends on: Session Recorder.
   Build after core game loop is playable.

8. Achievement Evaluator
   Depends on: Conquest Service, Session Recorder.
   Build last — it reads from all other systems.

9. Profile / Pod Dashboard screens
   Depends on: Conquest Service, Achievement Evaluator, Pod Manager.
   Build alongside #7-8.
```

---

## How the Conquest Meta-Game Links to Game Sessions

Every `game_session` row carries a `winner_user_id` and optional `archenemy_outcome`.
At session end, the client sends `conquestClaims[]` — a list of plane IDs the winner
wants to claim. The Session Recorder:

1. Writes the session row.
2. Writes `plane_conquests` rows for each claimed plane (one per plane, pointing to
   this session and the winner).
3. Re-evaluates Archenemy threshold for the pod: if any user now has >= threshold
   conquered planes, sets their `is_archenemy_candidate` flag.
4. Returns the updated conquest state to the client.

The Archenemy outcome path runs in reverse:
- If Archenemy loses: team votes (client-side poll), winning vote is sent to server,
  server inserts new `plane_conquests` rows transferring planes to the winning voter.
- If Archenemy wins: server inserts one new `plane_conquests` row for the current plane.

This means conquest history is fully auditable (all rows are kept, never deleted) and
the "current owner" is always a query, not a stored flag — which makes theft and transfer
correct by construction.

---

## Sources

- Scryfall API documentation: https://scryfall.com/docs/api (card types, rate limits,
  image URIs — HIGH confidence, primary source)
- PlaneChaser PROJECT.md requirements (authoritative for this project's constraints)
- JWT best practices: RFC 7519, OWASP JWT cheat sheet (HttpOnly refresh token pattern —
  HIGH confidence, industry standard)
- PWA shared-device UX: W3C Web App Manifest spec, `display: standalone` behavior —
  HIGH confidence
- Scryfall ToS re: caching: https://scryfall.com/docs/api (HIGH confidence — "be a
  good consumer, cache aggressively")
