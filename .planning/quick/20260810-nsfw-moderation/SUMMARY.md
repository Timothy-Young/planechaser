---
quick_id: 260810-evx
slug: nsfw-moderation
date: 2026-08-10
branch: feat/nsfw-moderation
status: complete
---

# NSFW moderation for custom planes — summary

Implements `planechaser/docs/superpowers/specs/2026-08-10-nsfw-moderation-design.md`.

## Commits

| Commit | Contents |
| --- | --- |
| `6366b47` | Design spec |
| `2798dfb` | Dependencies and this plan |
| `ee37a9f` | Migration 030 — schema, RPC, trigger exemption, quarantine bucket |
| `4b74fdd` | Moderation modules and unit tests |
| `8844df6` | API route, service-role client, request contract |
| `fe8d01f` | Client rewire — create page, edit page, hooks, admin UI |
| `e30cd3b` | Migration 031 and the SQL verification script |
| `ba5ff17` | Notice component tests |

## Verified

- 237 tests pass across 14 files, including 81 moderation unit tests, 14 route
  integration tests, and 10 notice component tests.
- `tsc --noEmit` clean; `eslint` clean on all new and changed files.
- `next build` exits 0 and registers `/api/custom-planes` as a dynamic route.
- The dev server serves `POST /api/custom-planes` with a correct 401 for an
  anonymous caller, which proves the route's TensorFlow, sharp, and nsfwjs
  imports load without an import-time crash.
- The create page renders unchanged for a signed-out visitor, with no console
  errors.

The pre-existing `ReferenceError: location is not defined` during static
generation was confirmed unrelated: the base commit `4a0e85f` emits it once as
well, and the failing chunk contains only Next.js internals.

## Not verified

- No end-to-end run of the penalty ladder. That needs migration 030 applied and
  `SUPABASE_SERVICE_ROLE_KEY` set, neither of which was done.
- `supabase/tests/030_nsfw_moderation_checks.sql` has not been executed. Its
  third-strike assertion is the one that catches a broken GUC exemption.

## Deviations from the spec

1. **No model vendoring.** `nsfwjs@4.4.0` ships all three models inside the npm
   package as base64 bundles, so `public/models/nsfwjs/` was unnecessary — the
   spec's goal of no runtime fetch is already met. Importing `nsfwjs/core` plus
   `nsfwjs/models/mobilenet_v2` rather than the package index keeps the 29MB
   `inception_v3` bundle out of the function; the index registers all three.

2. **Two text matchers instead of one.** Measured against a Magic-flavored
   corpus, obscenity's recommended transformers miss letters spaced apart
   ("f u c k you") and adding `skipNonAlphabetic` instead misses some plain hits
   ("a whore appears"). Both configurations scored zero false positives, so the
   union closes both gaps at no cost.

3. **The gore wordlist is narrower than "gore".** Single evocative nouns — gore,
   blood, carnage, slaughter, mutilate — are all real Magic card names and would
   reject ordinary flavor text constantly. The added terms are limited to
   exploitation and shock terms with no fantasy-flavor collision; obscenity's
   own dataset already covers sexual-violence terms and slurs.

4. **Two extra columns added to `protect_role_changes`.** Not in the spec, and
   required: without it a user could `UPDATE` their own profile row to clear
   `nsfw_ack_required` and `custom_plane_cooldown_until`, erasing their own
   penalty. The trigger previously guarded only role, ban, and strike fields.

5. **`admin_audit_log.admin_id` made nullable.** It was `NOT NULL`, so a
   system-attributed audit row was impossible. Same treatment as
   `user_strikes.admin_id`.

6. **Route enforces the plane cap itself.** The existing
   `enforce_custom_plane_limit` trigger early-returns when `auth.uid()` is NULL,
   which is the service-role case, so it no longer fires for these inserts.

7. **Spec correction.** The spec said revoking a strike would un-ban. It does
   not — `revokeStrike` recomputes `strike_count` but leaves `is_banned` set.
   The design was matched to existing behavior rather than changing it, which
   is why the feedback link in the violation notice matters.

## Remaining work for deployment

Ordered. Steps 3 and 4 must not be collapsed.

1. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel.
2. Apply migration 030. Behavior-neutral.
3. Deploy the application and let it propagate to clients.
4. Apply migration 031 only after step 3 has propagated. Any browser still on a
   pre-step-3 bundle loses plane creation the moment it lands, surfacing a raw
   RLS error.
5. Run `supabase/tests/030_nsfw_moderation_checks.sql` against a branch.
