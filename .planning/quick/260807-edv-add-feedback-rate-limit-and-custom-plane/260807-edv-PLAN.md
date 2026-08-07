---
quick_id: 260807-edv
description: Add feedback rate limit and custom plane creation cap
date: 2026-08-07
status: planned
---

# Quick Task 260807-edv: Abuse limits (feedback rate limit + custom plane cap)

## Goal

Stop feedback spam and unbounded custom-plane creation. Limits are enforced in
Postgres so a client bypassing the UI (direct PostgREST call) still hits them.

## Locked decisions

| Decision | Value | Source |
|---|---|---|
| Feedback cooldown | 120 seconds between submissions | user |
| Feedback daily cap | 20 per rolling 24h | user |
| Custom plane cap | 25 per user | user |
| Staff exemption | `owner`, `admin`, `mod` exempt from both | user ("admins unlimited"), extended to existing staff tier |
| Limit storage | `app_limits` keyed table (`key TEXT PK`, `value INT`) | user |
| Enforcement | `BEFORE INSERT` triggers, `SECURITY DEFINER` | user |
| Migration number | **026** — `025_server_side_achievements.sql` already exists on `origin/main` | discovered during planning |

## Tasks

### Task 1 — Migration `026_abuse_limits.sql`

**Files:** `planechaser/supabase/migrations/026_abuse_limits.sql`

- `app_limits` table (`key`, `value`, `description`, `updated_at`), seeded with
  `feedback_cooldown_seconds=120`, `feedback_daily_max=20`, `custom_planes_max=25`.
  RLS: `SELECT` for `authenticated` (client preflight needs the numbers),
  `INSERT/UPDATE/DELETE` for `owner`/`admin` only.
- `get_app_limit(p_key TEXT, p_default INT)` — `STABLE SECURITY DEFINER`,
  `search_path = public`, falls back to `p_default` when the row is missing.
- `enforce_feedback_rate_limit()` — `BEFORE INSERT ON feedback`. Skips when
  `auth.uid() IS NULL` (service_role/admin SQL) or the caller is staff.
  Raises `PC001` on cooldown violation (message includes seconds remaining),
  `PC002` on daily cap.
- `enforce_custom_plane_limit()` — `BEFORE INSERT ON custom_planes`. Same skips.
  Raises `PC003` with current/limit counts.
- Supporting indexes: `feedback (user_id, created_at DESC)`, `custom_planes (user_id)`.
- Follow migration 024 conventions: pinned `search_path`, `REVOKE EXECUTE` on
  trigger functions.

**Verify:** SQL parses; distinct SQLSTATEs per violation.
**Done:** Migration file exists and is idempotent (`IF NOT EXISTS` / `DROP ... IF EXISTS`).

### Task 2 — Client limit layer

**Files:** `planechaser/src/lib/limits/types.ts`, `planechaser/src/lib/limits/queries.ts`,
`planechaser/src/hooks/useLimits.ts`, `planechaser/src/lib/feedback/queries.ts`

- `LIMIT_KEYS` constants + `DEFAULT_LIMITS` fallback (used when the fetch fails,
  so the UI never blocks on a network hiccup).
- `getAppLimits()`, `getFeedbackUsage(userId)` (last submission + rolling-24h count),
  `getCustomPlaneCount(userId)`.
- `LimitError` class preserving the Postgres SQLSTATE, and `toLimitError()` mapping
  `PC001/PC002/PC003` to friendly copy.
- `submitFeedback` rethrows via `toLimitError` instead of flattening to `new Error`.
- Hooks: `useAppLimits()`, `useFeedbackLimit()`, `useCustomPlaneLimit()`.
  `useCustomPlaneLimit` reports `exempt` for staff (`userRole` from app store).

**Verify:** `npx tsc --noEmit` clean.
**Done:** Hooks compile and expose `atLimit` / `secondsRemaining`.

### Task 3 — UI wiring

**Files:** `planechaser/src/app/feedback/page.tsx`,
`planechaser/src/app/custom-planes/page.tsx`,
`planechaser/src/app/custom-planes/new/page.tsx`

- Feedback page: live cooldown countdown, submit disabled while cooling down or
  at the daily cap, server error surfaced verbatim if the preflight is stale.
- Custom planes list: `"12 of 25 planes used"` counter (hidden for staff),
  Create button disabled at the cap.
- New plane page: at-limit banner, save blocked before upload so no orphan image
  is written to storage.

**Verify:** `npm run build` (or `tsc --noEmit` + `next lint`).
**Done:** All three surfaces reflect limits; no orphan uploads at the cap.

## must_haves

**Truths**
- A second feedback insert within 120s of the previous one fails at the database.
- The 21st feedback insert in a rolling 24h window fails at the database.
- A 26th `custom_planes` insert fails at the database for a non-staff user.
- `owner`/`admin`/`mod` bypass all three checks.
- Changing a row in `app_limits` changes enforcement with no migration.

**Artifacts**
- `planechaser/supabase/migrations/026_abuse_limits.sql`
- `planechaser/src/lib/limits/queries.ts`
- `planechaser/src/hooks/useLimits.ts`

## Out of scope

- Applying the migration to the hosted Supabase project (user runs it).
- Payment tiers / per-tier limit rows (`app_limits` is shaped to accept them later).
