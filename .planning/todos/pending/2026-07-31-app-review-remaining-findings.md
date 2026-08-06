---
created: 2026-07-31T03:45:00.000Z
title: Remaining findings from the 2026-07-31 app review
area: general
files:
  - planechaser/src/components/providers.tsx
  - planechaser/src/app/api/cards/route.ts
  - planechaser/src/proxy.ts
  - planechaser/src/store/app-store.ts
  - planechaser/src/lib/game/engine.ts
---

## Problem

The 2026-07-31 review covered the whole app. The hardening PR of the same date
fixed error boundaries, the viewport lock, PWA, CI, server-side achievements
and the synced-payload bloat. These findings were identified and deliberately
left out of that PR to keep its blast radius reviewable. Roughly priority
ordered.

### Medium

1. **Theme flash on every load.** `src/app/layout.tsx` hardcodes
   `className="dark" data-theme="eternities"` on `<html>`, and `ThemeSync` in
   `providers.tsx` corrects it in a post-hydration effect. Anyone on light mode
   or the Atlas theme sees a flash of the wrong theme on every navigation.
   Needs a blocking inline script in `<head>`, or the theme read from a cookie
   in the server layout.

2. **`/api/cards` ships the whole corpus uncached.** `src/app/api/cards/route.ts`
   sets no `Cache-Control` and no `revalidate`, so every client refetches ~185
   rows with full oracle text from Supabase every hour. This is static data —
   `s-maxage` plus `stale-while-revalidate` would cut it to near zero.

3. **Middleware protects only four routes.** `src/proxy.ts:34` guards `/game`,
   `/setup`, `/pods`, `/profile`. Not `/decks`, `/map`, `/friends`,
   `/custom-planes`, `/scheme-decks`, `/games`, `/lobby`, `/admin`. RLS still
   protects the data, so this is not a breach — but signed-out visitors get
   broken empty shells instead of a redirect, and `/admin` should have a
   middleware check regardless.

4. **The Supabase `User` object is persisted to localStorage.**
   `src/store/app-store.ts` persists the whole zustand store under
   `planechaser-app`, including `user` (email, metadata). It goes stale against
   the real session and duplicates PII outside the auth cookie. Add
   `partialize` so only `activePodId`, themes and preferences persist.

### Low — engine correctness

5. **Turn history can record the wrong plane's chaos text.**
   `src/lib/game/engine.ts:160` derives `chaosEffects` from
   `state.deck[state.turnStartPlaneIndex]`, but `turnStartPlaneIndex` is only
   updated on `END_TURN`. A player who planeswalks and *then* rolls chaos gets
   the previous plane's chaos ability written into their turn history.

6. **Deck exhaustion wraps instead of reshuffling.** `engine.ts:48` does
   `(base + 1) % state.deck.length`. The official rule is to shuffle the planar
   discard into a fresh deck; here planes repeat in identical order. It also
   breaks the "visited pile" assumption that `SHUFFLE_REMAINING` and
   `REORDER_TOP` rely on, since after the wrap `currentPlaneIndex` is 0 and the
   whole deck reads as "ahead".

7. **The planar map renders ~185 thumbnails unvirtualised.**
   `src/app/map/page.tsx:431`. The v2 spec called for virtualisation;
   `loading="lazy"` carries it today. Worth measuring the unfiltered view on a
   mid-range phone before deciding.

8. **Accessibility sweep.** 11 `aria-label`s across 155 `<button>`s, and 14 raw
   `<img>` tags (each flagged by eslint). The icon-only buttons in the game
   toolbar are the ones to audit first.

9. **Privacy policy claims analytics that don't exist.**
   `src/app/privacy/page.tsx:41` says the app collects "basic analytics such as
   page views and session duration". No such instrumentation exists — the admin
   dashboard derives play stats from `game_sessions` rows. Align the copy with
   reality before launch.

### Spec gaps still unbuilt (from docs/superpowers/specs/2026-05-16-v2-campaign-mode-design.md)

- **MP-04 — turn order cannot be reordered.** `lobby/page.tsx:48` and
  `setup/page.tsx:207` both take `players.map(p => p.id)` as-is, so turn order
  is join order. At a real table it comes from a die roll. Likely the first
  thing a playtest complains about.
- **MP-10 — no reconnect handling.** No `navigator.onLine`, no "Reconnecting…"
  spectator state, no resync on reconnect. The host's sessionStorage backup
  exists; the recovery half does not.
- **GM-10 / PM-07 — no onboarding or contextual tips.** `/rules` and `/faq`
  exist, but there is no first-game overlay and no `(?)` icons in-game. This is
  spec success-metric #5.
- **AE-03/04/05 — per-player plane decks**, already formally deferred as
  "Phase 7b".

## Solution

Take these in separate, small PRs. Suggested grouping:

1. Theme flash + `/api/cards` caching + middleware routes + localStorage
   `partialize` — one "polish and correctness" PR, no schema impact.
2. Engine fixes (5 and 6) with unit tests in `src/lib/game/engine.test.ts` —
   these change game behaviour, so they want their own PR and a playtest.
3. MP-04 and MP-10 together, since both touch the lobby/session flow.
4. GM-10 tips as content work, parallelisable with anything.
