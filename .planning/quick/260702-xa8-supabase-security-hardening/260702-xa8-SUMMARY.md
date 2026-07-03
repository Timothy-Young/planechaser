---
status: complete
completed: 2026-07-03
---

# Quick Task 260702-xa8: Pre-launch Supabase security hardening — Summary

**One-liner:** Dropped 7 foreign tiktok-dashboard tables and fixed all actionable Supabase security advisor findings; advisors went from 29 findings (1 ERROR) to 3 accepted warnings.

## What was done

Migration `planechaser/supabase/migrations/024_security_hardening.sql`, applied to the live database via Supabase MCP (`security_hardening_prelaunch`):

1. **Dropped tiktok-dashboard tables** — `tiktok_accounts`, `videos`, `scripts`, `products`, `briefings`, `pipeline_runs`, `competitor_videos`. Verified before dropping: zero references anywhere in PlaneChaser code and **all tables empty (0 rows)**, so no backup was needed. These belonged to a separate tiktok-dashboard project and their `authenticated_all USING (true)` policies would have let any public signup read/write them.
2. **`admin_user_stats` view** → `security_invoker = true` + revoked anon SELECT. Admin dashboard unaffected (admins have read-all RLS policies on every underlying table via `get_my_role()`).
3. **`conquered_planes`** — replaced `WITH CHECK (true)` INSERT and two duplicate `USING (true)` DELETE policies with pod-membership-scoped policies. Deliberately NOT `auth.uid() = user_id`: the host records conquests for other players (shared device) and dethrone inserts rows for the new owner, so the check is "actor is in the pod AND credited player is in the pod".
4. **`card_cache`** — dropped INSERT/UPDATE policies (cache-poisoning vector). No live code writes this table (only historical research docs reference it); reads unchanged.
5. **search_path pinned** to `public` on `get_user_session_ids`, `handle_new_user`, `protect_role_changes`, `set_feedback_email`. Used `'public'` not `''` because `protect_role_changes` calls `get_my_role()` unqualified.
6. **EXECUTE lockdown** — trigger functions (`handle_new_user`, `protect_role_changes`, `set_feedback_email`) revoked from PUBLIC/anon/authenticated (triggers don't check caller EXECUTE). `get_my_role` + `get_user_session_ids` revoked from anon/PUBLIC but kept for authenticated — both are used inside RLS policy expressions.
7. **Storage** — dropped the broad `Anyone can view custom plane images` SELECT policy on `storage.objects`. The bucket is public so `getPublicUrl` object access is unaffected; this only removes the ability to enumerate/list all files. App never calls `.list()`.

## Verification

Re-ran `get_advisors(security)` after applying: **1 ERROR + 28 warnings → 3 warnings**, all accepted/known:
- `get_my_role` / `get_user_session_ids` executable by authenticated — intentional, required by RLS policies.
- Leaked-password protection disabled — **manual step for Tim** (Dashboard → Authentication → Passwords → enable "Leaked password protection").

## Known accepted edge

- `admin_notes` RLS policies target the `public` role and call `get_my_role()`; with anon EXECUTE revoked, an anon query against `admin_notes` now errors instead of returning empty. The app never queries `admin_notes` unauthenticated, and an error still denies access.

## Possible follow-ups

- `card_cache` appears fully dead — could be dropped entirely in a future cleanup.
- Enable leaked-password protection in the dashboard (manual).
