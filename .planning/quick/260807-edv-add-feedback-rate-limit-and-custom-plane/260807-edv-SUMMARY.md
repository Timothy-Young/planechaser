---
quick_id: 260807-edv
description: Add feedback rate limit and custom plane creation cap
date: 2026-08-07
status: complete
branch: feat/abuse-limits
commits:
  - 24de5d5 feat(260807-edv): DB-enforced feedback rate limit and custom plane cap
  - bf40d77 feat(260807-edv): client limit layer with typed LimitError
  - 1f68080 feat(260807-edv): surface abuse limits in the feedback and plane UIs
  - 912438c fix(260807-edv): hide plane usage meter when signed out
---

# Quick Task 260807-edv — Summary

## What shipped

Abuse limits enforced in Postgres, surfaced in the UI.

| Limit | Value | SQLSTATE |
|---|---|---|
| Feedback cooldown | 120 s between submissions | `PC001` |
| Feedback daily cap | 20 per rolling 24 h | `PC002` |
| Custom planes | 25 per user | `PC003` |

`owner` / `admin` / `mod` are exempt from all three. Inserts with no JWT
(service_role, direct SQL) skip the checks entirely.

## Files

**New**
- `planechaser/supabase/migrations/026_abuse_limits.sql`
- `planechaser/src/lib/limits/{types,errors,queries}.ts`
- `planechaser/src/hooks/useLimits.ts`

**Modified**
- `planechaser/src/lib/feedback/queries.ts` — rethrows via `toLimitError`
- `planechaser/src/lib/custom-planes/queries.ts` — same, for `createCustomPlane`
- `planechaser/src/hooks/useCustomPlanes.ts` — invalidates `custom-plane-count`
- `planechaser/src/app/feedback/page.tsx` — live cooldown countdown, submit gating
- `planechaser/src/app/custom-planes/page.tsx` — "N of 25 planes used" meter
- `planechaser/src/app/custom-planes/new/page.tsx` — at-limit banner, pre-upload check

## Design notes

**Why triggers, not client checks.** The client checks are UX only. Anything
calling PostgREST directly with a valid JWT would sail past them, so the gate
lives in `BEFORE INSERT` triggers. The client layer exists to avoid making users
discover limits by hitting an error.

**Why `app_limits`.** Limits live in a keyed table read by
`get_app_limit(key, default)`, so tuning a number is an `UPDATE`, not a
migration. `DEFAULT_LIMITS` in the client mirrors the seeded values as a
fallback when the table can't be read — the UI degrades to permissive and the
triggers still hold the line.

**Distinct SQLSTATEs.** `PC001`/`PC002`/`PC003` let the client branch on a code
instead of pattern-matching message text. `LimitError` carries the code through
`supabase-js`, which otherwise flattens Postgres errors.

**Pre-upload cap check.** The create page checks the cap before uploading the
image. Checking after would leave orphaned files in the `custom-plane-images`
bucket every time a capped user tried again.

**Rolling 24 h, not calendar day.** A calendar-day reset lets a spammer burn the
cap twice around midnight; a rolling window doesn't.

## Verification

- `npx tsc --noEmit` — clean
- `npx eslint` on all changed files — clean
- `npm run build` — succeeds
- Dev server: `/feedback` and `/custom-planes` render, no console errors, and
  the client falls back to `DEFAULT_LIMITS` correctly with `app_limits` absent
  from the DB

**Not verified:** trigger behavior against a live database. Migration 026 has
not been applied — that's the user's call, and it needs an authenticated session
to exercise (`auth.uid()` is null in direct SQL, which the triggers skip by
design).

## Follow-ups

- Apply `026_abuse_limits.sql` to the hosted Supabase project.
- After payment tiers land, add a `tier` column to `app_limits` and key lookups
  by `(tier, key)`; the trigger's `get_app_limit` call is the only touch point.
- Consider an admin-dashboard editor for `app_limits` (RLS already permits
  owner/admin writes).
