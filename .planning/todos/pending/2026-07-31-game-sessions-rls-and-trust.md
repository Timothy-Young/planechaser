---
created: 2026-07-31T03:30:00.000Z
title: game_sessions has policies but RLS may never have been enabled
area: security
priority: high
files:
  - planechaser/supabase/migrations/001_initial_schema.sql
  - planechaser/supabase/migrations/019_fix_rls_recursion.sql
  - planechaser/src/lib/pods/queries.ts
---

## Problem

Two related issues found during the 2026-07-31 review.

### 1. RLS enablement is missing from the migrations

`public.game_sessions` is created in `001_initial_schema.sql` with **no**
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, and no later migration adds one.
Grep across every migration confirms only `active_game_sessions` (a different
table) gets RLS enabled.

Yet `019_fix_rls_recursion.sql:123` adds a SELECT policy to `game_sessions` —
policies on a table without RLS enabled are inert.

Two possibilities, and they need different responses:

- **RLS is enabled in the live database** (likely — migration 024 was driven by
  Supabase advisors, which raise "RLS disabled in public" as an ERROR, and it
  is not listed among the 3 accepted warnings). Then production is fine, but
  the migrations are not a faithful description of the schema, so any rebuilt
  environment (a branch database, a local `supabase db reset`, a disaster
  recovery restore) comes up **wide open**.
- **RLS is genuinely off in production.** Then every authenticated user can
  read, update and delete every other user's game history right now.

**Verify against the live database first** — do not assume:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('game_sessions', 'conquered_planes', 'user_achievements');
```

This was deliberately NOT fixed in the 2026-07-31 hardening PR: merging that PR
auto-deploys to Supabase, and blindly enabling RLS without a matching INSERT
policy would immediately break `recordGameSession` (every game-end write would
start failing) and empty out profile stats and history pages.

### 2. game_sessions rows are client-written, so achievements can still be farmed

Migration 025 stopped the browser from naming achievement keys — badges are now
derived server-side from `game_sessions` + `conquered_planes`. But the rows in
`game_sessions` are still inserted by the client, so a determined user can
fabricate plausible game history (long duration, 5 players, 30 rolls) and earn
badges from it. The guards in `grant_session_achievements` raise the bar; they
do not close the hole.

## Solution

Do these together, in one migration, after verifying the live state:

1. `ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;` (no-op if
   already enabled).
2. Add the full policy set the app needs — verified against every call site in
   `src/lib/pods/queries.ts` and `src/lib/admin/queries.ts`:
   - SELECT: `host_user_id = auth.uid()` OR the caller appears in
     `players_snapshot` OR `get_my_role() IN ('owner','admin','mod')`.
   - INSERT: `host_user_id = auth.uid()`.
   - No UPDATE/DELETE for `authenticated` — game history should be append-only.
3. Deploy to a Supabase branch database first and exercise: end a game, view
   profile stats, view game history, view the admin dashboard. The failure mode
   here is silent empty lists, not errors, so check the data actually renders.
4. Separately, consider deriving `game_sessions` rows server-side from
   `active_game_sessions` at end-of-game so the history is trustworthy by
   construction. That is the real fix for badge farming.
