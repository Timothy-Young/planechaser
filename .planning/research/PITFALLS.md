# Domain Pitfalls

**Domain:** MTG Companion App — Planechase + Archenemy formats
**Researched:** 2026-05-13
**Confidence note:** External fetch tools unavailable during research. Scryfall API and WotC policy
sections are drawn from the published documents known as of August 2025 training cutoff.
VERIFY both policies before shipping — they can change without notice.

---

## Critical Pitfalls

Mistakes that cause rewrites, legal exposure, or broken core gameplay.

---

### Pitfall 1: Proxying or Re-Hosting Scryfall Card Images

**What goes wrong:** Developer serves Scryfall images through their own server (reverse-proxy,
download-and-re-serve, or any form of local cache served to users) to avoid client-side CDN
latency or to work around CORS.

**Why it happens:** Developers want faster loads or want to guarantee image availability if
Scryfall is down.

**Consequences:** Direct violation of Scryfall's stated API guidelines. Scryfall explicitly asks
developers NOT to download card image files in bulk and NOT to serve images through their own
infrastructure. Doing so can get the app's IP/domain banned from the API and could result in
a cease-and-desist.

**Prevention:**
- Always load images directly from Scryfall's CDN URLs (`https://cards.scryfall.io/...`) in
  the browser/client. The CDN is purpose-built for this.
- Use browser-level caching (`Cache-Control` headers Scryfall sets) — the CDN handles
  freshness correctly.
- If offline support is needed, cache only the image URLs (strings), not the image bytes,
  unless you have explicit permission. Display a placeholder when offline.
- Never use a server-side route like `GET /api/card-image?id=xyz` that fetches from Scryfall
  and streams back to the client.

**Detection:** Any code path where the server fetches a Scryfall image URL and returns image
bytes to the client is a violation. Grep for `scryfall.io` in server-side fetch calls.

**Phase:** Address in Phase 1 (card display) — establish the correct pattern immediately.
Confidence: HIGH (Scryfall's developer guidelines are publicly documented)

---

### Pitfall 2: Exceeding Scryfall Rate Limits (10 req/sec)

**What goes wrong:** App fires multiple concurrent Scryfall API requests — e.g., fetching all
plane cards (100+) one by one on session start, or re-fetching on every plane change without
caching.

**Why it happens:** Fetching cards individually in a loop; not batching or pre-loading; not
caching previously fetched cards.

**Consequences:** Scryfall enforces a ~10 requests/second rate limit. Exceeding it results in
429 responses. If the app re-tries naively it can get temporarily blocked. Scryfall may ban
the app's API key/origin for persistent abuse.

**Prevention:**
- On first load, fetch ALL Planechase plane cards in ONE bulk call:
  `GET /cards/search?q=t%3Aplane&order=name` returns all Plane-type cards paginated.
  Two requests cover all ~100+ plane cards.
- Cache the full plane card list in localStorage/IndexedDB with a TTL of 24 hours.
  Plane cards almost never change; a daily refresh is more than sufficient.
- Similarly, batch-fetch all Archenemy scheme cards once:
  `GET /cards/search?q=t%3Ascheme`.
- Add a request queue with a 100ms minimum gap between requests if serial requests are needed.
- Set `User-Agent` header to `PlaneChaser/1.0 contact@yourdomain.com` per Scryfall guidelines
  so they can contact you if there's an issue.

**Detection:** Network tab showing 50+ Scryfall requests on app load. Any loop calling
Scryfall sequentially per card.

**Phase:** Address in Phase 1 (card data layer). Cache strategy must be designed before any
feature that displays cards.
Confidence: HIGH (Scryfall rate limit is publicly documented)

---

### Pitfall 3: Violating WotC Fan Content Policy — Commercial Use or Implicit Endorsement

**What goes wrong:** App monetizes (ads, paid tiers, merchandise), charges for "PlaneChaser
Pro," or uses WotC trademarks (Magic: The Gathering, Planechase, Archenemy, the Planeswalker
symbol) in a way that implies official WotC endorsement.

**Why it happens:** The v1 scope says no monetization, but it can creep in. Branding that looks
"official" is a natural design instinct.

**Consequences:** WotC's Fan Content Policy allows non-commercial fan projects to use MTG card
images, card names, and game terms — but explicitly prohibits: (1) charging money for the app
or content that uses their IP, (2) selling merchandise, (3) implying official endorsement or
partnership, (4) creating "new" MTG content (fake cards, altered rules presented as official).

**Prevention:**
- Keep v1 completely free, no ads, no IAP, no Patreon integrations on the app itself.
- Include the required disclaimer on About/footer: "PlaneChaser is unofficial Fan Content
  permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the
  materials used are property of Wizards of the Coast. (c) Wizards of the Coast LLC."
- Do NOT use the Magic: The Gathering logo, the Planeswalker symbol (the five-color sunburst),
  or the MTG card frame design as UI chrome.
- Use card NAMES and TYPE names (Plane, Scheme) freely — these are game terms, not logos.
- Use Scryfall card images freely in context — displaying actual card art in a game assistant
  is explicitly the intended use case.

**Detection:** Any pricing page, payment flow, or official-looking logo usage. Review branding
before launch.

**Phase:** Design phase (Phase 1) — get the disclaimer in the UI shell from day one.
Confidence: MEDIUM (WotC Fan Content Policy is published; exact current wording should be
verified at https://company.wizards.com/en/legal/fancontentpolicy before shipping)

---

### Pitfall 4: Game State Lost on Browser Refresh / Tab Switch

**What goes wrong:** The active game session (current plane, plane history, die roll count,
chaos escalation counter, which player is Archenemy) is held only in React/component state.
Refreshing the page or switching apps on mobile kills the session.

**Why it happens:** Easiest implementation is in-memory state. Developers underestimate how
often mobile users switch apps mid-game (Discord ping, text message, etc.).

**Consequences:** Entire game session is destroyed. Players lose plane history, visit counts,
and the current meta-game context. This is the #1 UX complaint in session-based companion
apps.

**Prevention:**
- Persist ALL active game state to localStorage on every state change (debounced at ~200ms).
  Use a dedicated `GameSession` serialization layer, not ad-hoc localStorage calls.
- On app load, check for a persisted session and offer "Resume Game" before starting new.
- The session schema should include: `{ currentPlane, planeHistory, visitedIds, chaosCount,
  dieRollsThisTurn, archanemyPlayerId, conqueredPlanes[], timestamp }`.
- For the conquest meta-game (account-level data), sync to the server only on confirmed game
  events (plane conquered, Archenemy triggered) — not on every die roll.
- Test explicitly: start a game, press the home button on the phone, return to the app.

**Detection:** No localStorage writes when plane changes or die rolls occur.

**Phase:** Phase 1 (core game loop). Must be in place before any playtesting.
Confidence: HIGH (standard pattern; directly implied by the "shared mobile device" model)

---

### Pitfall 5: Race Conditions in the Planar Die Roll Animation

**What goes wrong:** Player taps "Roll" multiple times during the animation; or two players
tap simultaneously (shared device). State updates from multiple rapid taps stack, causing the
die to "land" on the wrong face or triggering Planeswalk twice.

**Why it happens:** Animation library resolves asynchronously; the tap handler is not locked
during animation.

**Consequences:** Planes change incorrectly, die result is wrong, chaos effects fire
twice — corrupts session integrity.

**Prevention:**
- Use a `isRolling` boolean flag. Set to `true` on roll start, `false` on animation complete.
  Gate the roll handler: `if (isRolling) return;`
- Disable (visually and functionally) the Roll button during animation. Do not just hide it —
  visually disabled state prevents player confusion.
- Generate the die result FIRST (synchronously), then run the animation to that result. Never
  let the animation determine the outcome — the outcome drives the animation.
- Use `useReducer` or a state machine (XState) for the roll lifecycle:
  `IDLE → ROLLING → RESOLVING → IDLE`. Transitions enforce valid sequences.

**Detection:** Rapid double-tap the roll button during animation. If the plane changes twice,
the guard is missing.

**Phase:** Phase 1 (die roll mechanic). Design the state machine before animating.
Confidence: HIGH (standard animation/interaction pattern)

---

### Pitfall 6: Touch Target Sizes Below 44px on Shared-Device UI

**What goes wrong:** Core actions (Roll Die, Conquer Plane, Trigger Chaos) have touch targets
smaller than 44x44px CSS pixels. On a 375px screen with excited players, small targets cause
mis-taps.

**Why it happens:** Designers mock on desktop; looks fine. On a shared phone at a game table
with multiple people leaning over it, accuracy drops dramatically.

**Consequences:** Accidental conquests, accidental plane changes, frustrated players. The
"shared device" model means multiple people are poking the same phone under non-ideal
conditions (dim lighting, table at arm's length, slightly wet game night snack hands).

**Prevention:**
- All primary action buttons: minimum 44x44px tap target (Apple HIG standard).
- For the Roll Die button specifically: minimum 64x64px. This is THE core interaction.
- Destructive/irreversible actions (Conquer Plane, Trigger Archenemy) must require a
  confirmation tap — not just a second chance, but a visible "Are you sure?" that prevents
  accidental triggers.
- Use CSS `padding` to extend tap area without changing visual size. Do not use small icons
  as standalone tap targets.
- Test with actual humans on an actual phone at a table, not on a desktop browser with a mouse.

**Detection:** Use Chrome DevTools mobile emulation and audit touch targets. Any interactive
element under 44px in either dimension is a bug.

**Phase:** Phase 1 (core UI shell). Establish the design token for button sizing before
building any interactive component.
Confidence: HIGH (WCAG 2.5.5, Apple HIG, Google Material — all cite 44px minimum)

---

### Pitfall 7: Too Many Taps to Core Actions (Navigation Depth)

**What goes wrong:** Rolling the die or changing the plane requires 2–3 taps through navigation
(Menu > Game > Roll). The current plane is buried under an accordion or tab.

**Why it happens:** Standard app navigation patterns (bottom nav, hamburger menu) are applied
without considering that the app is used as a single shared table-top display, not a personal
phone app.

**Consequences:** Game flow interrupts every time a player has to navigate. Players revert to
physical dice and cards. The app is abandoned.

**Prevention:**
- The ACTIVE GAME SCREEN must be the root/home screen while a game is in progress. All
  secondary features (pod settings, achievements, history) must be accessible FROM the game
  screen, not the other way around.
- Die Roll and Conquer Plane actions must be reachable in ONE TAP from the game screen.
  No menus, no drawers, no tabs.
- Use a persistent bottom sheet or HUD overlay pattern: plane art fills the screen, action
  buttons float over it. Don't hide the plane to show a menu.
- The distinction between "in-game" and "meta-game" states should be a clear mode switch,
  not a navigation stack.

**Detection:** Count taps from app open to first die roll. If more than 2 taps (open → game
screen → roll), there are too many.

**Phase:** Phase 1 (UX architecture). Wire this up in Figma/low-fi before writing any
navigation code. Changing navigation structure after screens are built is expensive.
Confidence: HIGH (standard mobile UX principle; amplified by shared-device model)

---

### Pitfall 8: Achievement System That Feels Hollow or Is Trivially Exploitable

**What goes wrong:** Achievements are awarded for things players can trivially repeat
(roll die 10 times → achievement farms in one session), or achievements are so hard to
earn they never fire. Neither drives engagement.

**Why it happens:** Achievement lists are designed in isolation, not against actual play data.
The "grind achievements" pattern is copied from solo games but doesn't translate to social
multiplayer.

**Consequences:** Players unlock trivial achievements once and ignore the system. Or the
system becomes a grind that players game by fake-playing. The meta-game layer that is
PlaneChaser's core differentiator loses its meaning.

**Prevention:**
- Categorize achievements: SESSION (this game), LIFETIME (career), SOCIAL (pod-level).
  Weight them accordingly. Social and lifetime achievements are harder to exploit.
- Gate achievements on GAME OUTCOMES, not action counts: "Conquered a plane in your first
  session" is better than "Visited 5 planes" (which can be farmed by planwalking repeatedly).
- Add temporal guards: achievements that require winning a game cannot be earned from a
  session with 0 plane conquests. Require a minimum session length or player count (≥2).
- Do NOT award achievements for actions the server cannot independently verify
  (e.g., "won a game" should require a game session record with ≥2 players and ≥3 plane
  visits — not just a client-side button press).
- Design achievements against the Archenemy trigger mechanic: the conquest loop is the
  fun part. Most mid/high tier achievements should require engaging with that loop.

**Detection:** Ask: "Can one player alone, in 5 minutes, earn this achievement by just tapping
buttons?" If yes, add server-side guards.

**Phase:** Phase 2 (achievements). Design the validation model (what the server must verify)
before building the award UI.
Confidence: MEDIUM (general gamification best practices; exploit prevention specific to
this app's mechanics is derived reasoning)

---

## Moderate Pitfalls

---

### Pitfall 9: Using JWTs Without Refresh Tokens for a Casual App

**What goes wrong:** App issues short-lived JWTs (1-hour expiry) with no refresh token flow.
Players are mid-game when the token expires. The app shows a login screen, breaking the session.

**Why it happens:** Following generic auth tutorials that don't account for long-play-session
use cases (a Commander game runs 2–4 hours).

**Prevention:**
- Issue refresh tokens with a long TTL (30 days) stored in an httpOnly cookie.
- Access token TTL should be at least 4 hours to survive a full Commander game night.
- On 401, silently refresh before surfacing an error to the user.
- The "logged-out mid-game" experience must NEVER lose the active game session — session
  is stored in localStorage independent of auth state.

**Phase:** Phase 1 (auth). Set token TTLs correctly from the first implementation.
Confidence: HIGH (standard auth pattern)

---

### Pitfall 10: Pod Membership Writes Without Idempotency

**What goes wrong:** Player taps "Join Pod" twice (network lag → double tap). Server creates
two pod membership records. Player appears in the pod twice, leaderboard counts their wins
doubled.

**Why it happens:** Mobile networks are slow and players retry. Join/leave operations are not
idempotent.

**Prevention:**
- Pod membership writes must be idempotent: `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING`
  on `(pod_id, user_id)` unique constraint.
- All write endpoints that modify shared state must be protected with a unique idempotency key
  per user action (UUID generated client-side, stored server-side for 24h to deduplicate).
- Disable the "Join Pod" button immediately on tap; re-enable only on confirmed error.

**Phase:** Phase 2 (pod/social features).
Confidence: HIGH (standard distributed systems pattern)

---

### Pitfall 11: Leaderboard Queries That Don't Scale Past a Small Pod

**What goes wrong:** Leaderboard query does a `SELECT COUNT(*) FROM conquests WHERE pod_id = ?`
on every page load, full table scan, no indexes. Fast with 5 players; hangs with 50.

**Why it happens:** Early development uses small test data. The query is never profiled.

**Prevention:**
- Index `conquests(pod_id, user_id)`.
- Maintain a denormalized `pod_leaderboard_cache` table updated on conquest events, not
  recomputed on read.
- Leaderboard data is eventually consistent (5-minute staleness is fine for a social game).
  Cache aggressively.

**Phase:** Phase 2 (database design). Add indexes in the schema migration, not retroactively.
Confidence: MEDIUM (derived from general relational DB patterns for leaderboards)

---

### Pitfall 12: Scryfall Search Results Including Non-Plane/Non-Scheme Cards

**What goes wrong:** The search query `q=t:plane` returns cards with "Plane" in any type field,
including non-Planechase cards (e.g., creature subtypes that happen to match). App displays
wrong cards.

**Why it happens:** Scryfall type search is broad. The "plane" supertype in Planechase cards
is specifically `type_line` containing "Plane —" (with an em dash and subtype).

**Prevention:**
- Use the precise Scryfall query: `t:plane is:planechase` or filter client-side for
  `type_line` starting with "Plane —".
- For scheme cards: `t:scheme` is more reliable as "Scheme" is a specific card type.
- Store the full Scryfall `id` (UUID) for each card — never rely on card name strings as
  primary keys (names can be reprinted with different art; UUIDs are stable per printing).
- After fetching, assert the count matches expected (~100+ plane cards, ~150+ scheme cards).
  If far off, flag the query as broken.

**Phase:** Phase 1 (card data layer).
Confidence: MEDIUM (based on Scryfall query syntax documentation known at training cutoff;
verify with Scryfall docs)

---

### Pitfall 13: No Offline Fallback for Card Images

**What goes wrong:** Game is being played in a basement with spotty WiFi. Scryfall CDN is
unreachable. The plane card shows a broken image icon. Players cannot see what plane they are on.

**Why it happens:** App assumes network availability; no fallback was designed.

**Prevention:**
- Cache card images using the Cache API (Service Worker) after first load. Cache the most
  recently visited plane images and the full plane card list images progressively.
- Display a text fallback: plane name, type line, oracle text — all stored from the initial
  bulk fetch. The TEXT is always available even if the image CDN is down.
- Register a service worker that serves cached Scryfall CDN responses for image URLs.
  Cache strategy: Cache-First for card images (they are immutable per Scryfall ID).

**Phase:** Phase 1 (core game loop) — the text fallback. Phase 3 (polish) — full service
worker image caching.
Confidence: HIGH (standard PWA pattern)

---

## Minor Pitfalls

---

### Pitfall 14: Planar Die Probability Not Matching Rules

**What goes wrong:** Developer implements a simple random roll: `Math.floor(Math.random() * 6)`.
But the planar die has 1 Planeswalk face, 1 Chaos face, and 4 blank faces — it must be
simulated as a D6 with those weights, not a generic RNG.

**Prevention:**
- Implement as: outcomes = `['planeswalk', 'chaos', 'blank', 'blank', 'blank', 'blank']`,
  then `outcomes[Math.floor(Math.random() * 6)]`. Do not use weighted probability shortcuts
  that could drift from the actual 1/6, 1/6, 4/6 distribution.
- Display the result LABEL (Planeswalk, Chaos, Blank), not a number.

**Phase:** Phase 1.
Confidence: HIGH (rules are published)

---

### Pitfall 15: Archenemy Scheme Cards Displaying Out of Turn Order

**What goes wrong:** Archenemy rules specify that the Archenemy draws a new scheme at the
start of each of their turns, and "Set in Motion" schemes persist until abandoned. App just
shows random schemes without respecting the draw order or ongoing scheme state.

**Prevention:**
- Model the Archenemy scheme deck as an ordered queue (shuffled on game start, then drawn
  sequentially — like a real card deck).
- Track "ongoing" schemes separately from the draw pile. The active zone shows ongoing schemes
  in addition to the current scheme being set in motion.
- Do NOT re-shuffle on every scheme draw — that breaks the rules.

**Phase:** Phase 2 (Archenemy mode).
Confidence: HIGH (published Archenemy rules)

---

### Pitfall 16: Account Deletion Without Cascade Effects on Pod Data

**What goes wrong:** User deletes their account. Their conquered planes remain in the database
attributed to a deleted user. Pod leaderboard shows ghost entries. Archenemy threshold
calculation counts a ghost user's planes.

**Prevention:**
- On account deletion: soft-delete the user record (`deleted_at` timestamp).
- Conquered planes transfer to "unowned" or are released back to the pool — define this rule
  before shipping.
- Pod leaderboards must filter out deleted-user rows.
- Use DB foreign keys with appropriate ON DELETE behavior (SET NULL for conquered planes,
  CASCADE for pod memberships).

**Phase:** Phase 2 (account management).
Confidence: MEDIUM

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Card data fetch | Scryfall rate limit / bulk re-fetch | Batch fetch + 24h localStorage cache |
| Phase 1: Card image display | Proxying Scryfall images via server | Always load directly from cards.scryfall.io |
| Phase 1: Die roll | Race condition on double-tap during animation | isRolling guard + state machine |
| Phase 1: Mobile UI shell | Touch targets < 44px | Design token: min button size 48px |
| Phase 1: Session persistence | State lost on tab switch | Persist full session to localStorage |
| Phase 1: Auth | Token expiry mid-game | 4h+ access token TTL + silent refresh |
| Phase 1: Legal | WotC branding / disclaimer | Add disclaimer to footer on day one |
| Phase 2: Achievements | Exploitable trivial unlock conditions | Server-side session verification |
| Phase 2: Pod membership | Duplicate join on double-tap | Unique constraint + idempotency key |
| Phase 2: Leaderboard | Full-table-scan query | Index conquests(pod_id, user_id) |
| Phase 2: Archenemy scheme deck | Random re-shuffle each draw | Model as ordered queue |
| Phase 2: Account deletion | Ghost data in pod/leaderboard | Soft-delete + FK cascade rules |
| Phase 3: Offline | Broken image on bad network | Service worker Cache-First for card images |

---

## Sources

- Scryfall API documentation — https://scryfall.com/docs/api (verify rate limits and image
  usage policy before shipping; policy was ~10 req/sec and no server-side image proxying as
  of August 2025) — MEDIUM confidence on exact limits, HIGH on proxying prohibition
- WotC Fan Content Policy — https://company.wizards.com/en/legal/fancontentpolicy (verify
  exact wording and disclaimer text before shipping) — MEDIUM confidence on details
- Apple Human Interface Guidelines (touch targets) — HIGH confidence
- WCAG 2.5.5 Target Size guideline — HIGH confidence
- MTG Planechase rules — https://magic.wizards.com/en/formats/planechase — HIGH confidence
- MTG Archenemy rules — https://magic.wizards.com/en/formats/archenemy — HIGH confidence
- Standard distributed systems patterns (idempotency, leaderboard caching) — HIGH confidence
