# NSFW Moderation for Custom Planes — Design

**Date:** 2026-08-10
**Status:** Approved, ready for planning
**Scope:** Custom plane creation and editing

## Problem

Custom planes accept a user-supplied image and five free-text fields, then publish them
to a shared pod device and — when `is_public` is set — to every player in the app. Nothing
currently inspects that content. A single offensive plane is visible to a whole table of
players, including the pod owner who did not create it.

We need automated screening for pornography, gore, and profanity at the point of creation,
backed by a penalty ladder that escalates for users who deliberately bypass the first
warning.

## Constraints

- **No paid or external services.** All detection runs inside the application, offline.
  Open-source libraries only.
- **No self-hosted model training.** Use published pre-trained models as-is.
- The existing custom plane flow is client-side: the browser uploads to Supabase Storage,
  then inserts the row through PostgREST. Any check that runs only in the browser is
  bypassable by calling PostgREST directly, which would make the cooldown and strike
  penalties decorative.
- Must remain usable on a 375px phone screen.

## Detection capability, honestly stated

| Category | Library | Coverage |
| --- | --- | --- |
| Pornography (images) | `nsfwjs` (MobileNetV2) | Good. Returns `Porn`, `Hentai`, `Sexy`, `Neutral`, `Drawing` scores. |
| Profanity and slurs (text) | `obscenity` | Good. Handles leetspeak, spacing, and character substitution. |
| Gore (text) | `obscenity` + custom wordlist | Partial. Keyword-level only. |
| Gore (images) | — | **Not covered.** |

`nsfwjs` has no violence or gore class, and no credible free offline JavaScript gore model
exists. Gore imagery is therefore out of scope for this iteration and remains the domain of
the existing admin strike and ban tooling. This is a deliberate, accepted gap — not an
oversight to be patched later with a paid API without a separate decision.

## Architecture

### New modules

| Path | Purpose |
| --- | --- |
| `src/lib/moderation/image.ts` | Loads `nsfwjs` against the WASM TensorFlow.js backend. Module-scoped singleton model. Uses `sharp` to decode and resize input to a 224×224 RGB tensor. |
| `src/lib/moderation/text.ts` | `obscenity` English dataset plus a project gore and slur wordlist. |
| `src/lib/moderation/decide.ts` | Pure functions: score-to-verdict mapping, and `decideOutcome(profileState, verdict)` implementing the state machine. |
| `src/lib/moderation/index.ts` | `moderate({ imageBytes?, fields })` returning a verdict. |
| `src/lib/supabase/admin.ts` | Service-role Supabase client. Server-only; first of its kind in this repo. |
| `src/app/api/custom-planes/route.ts` | `POST` (create) and `PATCH` (edit). The only write path to `custom_planes`. |
| `public/models/nsfwjs/` | Vendored MobileNetV2 model weights, roughly 4MB, committed to the repo. |

### Runtime decisions

- `export const runtime = 'nodejs'`. Both TensorFlow.js and `sharp` require Node; neither
  runs on the edge runtime.
- Use `@tensorflow/tfjs` with `@tensorflow/tfjs-backend-wasm`, **not** `@tensorflow/tfjs-node`.
  The native addon is roughly 150MB and competes with Vercel's 250MB unzipped function limit.
  The WASM backend installs as plain JavaScript and classifies in roughly 300–600ms once warm.
- The model and backend are cached in module scope. Cold start pays roughly 1.5s once per
  lambda instance.
- The model is loaded from the vendored local files, never fetched from `nsfwjs.com` at
  runtime. A third-party fetch in the critical create path would be both a latency risk and
  an availability dependency.
- `sharp` is already present as a Next.js image-optimization dependency, so image decoding
  adds no new install.

### Data flow, create

1. Client validates MIME type and file size, then uploads the image to
   `custom-plane-images-pending/<user_id>/<uuid>` — a **private** bucket.
2. Client `POST`s a small JSON body to `/api/custom-planes`: the pending object path, the
   five text fields, `is_public`, and `acknowledged`.
3. Route authenticates the caller via `@supabase/ssr` and evaluates preconditions in order:
   banned, cooldown active, acknowledgment required but missing, plane cap reached.
4. Route downloads the pending object with the service-role client and runs the image and
   text scans in parallel.
5. **Pass:** copy the object to the public `custom-plane-images` bucket, delete the pending
   object, insert the `custom_planes` row with the service-role client, return `201`.
6. **Fail:** delete the pending object, insert nothing, return `422` describing which
   surfaces were flagged.

The quarantine bucket exists because Vercel caps serverless request bodies at 4.5MB while
the form accepts 5MB images (`src/app/custom-planes/new/page.tsx:10`). Uploading to storage
first and having the server fetch the bytes sidesteps the body limit entirely, and
guarantees that flagged imagery never receives a public URL.

Editing follows the same path through `PATCH`. Without it, a user could create a clean plane
and then edit prohibited content into it, bypassing the entire system.

Private planes are scanned exactly like public ones. A "private" plane is still displayed to
an entire pod on a shared device, and excluding them would allow content to be laundered by
creating privately and flipping to public later.

### Enforcement lockdown

A migration revokes `INSERT` and `UPDATE` on `custom_planes` from the `authenticated` role
and drops the two corresponding client write policies from `014_custom_planes.sql`. The
service-role client bypasses RLS, so the route continues to work. This revoke is what makes
the cooldown and strike penalties meaningful rather than advisory.

The existing `enforce_custom_plane_limit` trigger (`026_abuse_limits.sql`) stays in place as
a backstop, but note its `auth.uid() IS NULL` early return means it now **skips** for
service-role inserts. The route must therefore enforce the plane cap itself.

## Detection thresholds

Images are blocked when any of the following holds:

- `Porn >= 0.70`
- `Hentai >= 0.70`
- `Sexy >= 0.85`

`Hentai` fires readily on stylized and illustrated human figures, and MTG-style card art is
exactly that, so the thresholds are set to tolerate suggestive fantasy art. Some explicit
stylized art will pass at 0.70. That is the accepted trade against strike-banning a user
over armor-clad character art.

Thresholds live in the existing `app_limits` table so they can be retuned from the admin
dashboard without a migration or a redeploy. That column is `INT`, so they are stored as
basis points.

The route reads these values through the service-role client, which bypasses RLS, rather
than through `get_app_limit`. That function has `EXECUTE` revoked from every client-reachable
role (`026_abuse_limits.sql:201`) and is reachable only from inside `SECURITY DEFINER`
triggers and the new RPC.

## Schema changes

### `profiles`

| Column | Type | Meaning |
| --- | --- | --- |
| `nsfw_ack_required` | `BOOLEAN NOT NULL DEFAULT false` | Set `true` on the first violation. Sticky — never automatically cleared. |
| `custom_plane_cooldown_until` | `TIMESTAMPTZ` | Null normally. Set to `now() + nsfw_cooldown_hours` on a post-acknowledgment violation. |

The acknowledgment flag is sticky for the life of the account, which means the free warning
is granted **once per account, ever** — not once per session and not once per plane. Any
non-sticky variant is trivially farmed: reload the page, and every violation is forever the
"first" one, so no strike ever lands.

### `app_limits` additions

```
nsfw_porn_threshold_bp    7000
nsfw_hentai_threshold_bp  7000
nsfw_sexy_threshold_bp    8500
nsfw_cooldown_hours          5
```

### `user_strikes`

- `admin_id` becomes nullable.
- Add `source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'auto_nsfw'))`.
- Add `CHECK ((source = 'admin') = (admin_id IS NOT NULL))`.
- Existing rows backfill to `'admin'` through the column default.

Automated strikes are rows in the existing ledger rather than a parallel counter, so the
"three strikes" the user is told about is the same number the admin dashboard shows.

`src/lib/admin/queries.ts:406` joins `profiles!user_strikes_admin_id_fkey` to render the
issuing admin. A null `admin_id` produces a null join, so the admin strike list must render
**"System"** rather than a blank issuer. This requires a small edit in `src/app/admin/page.tsx`.

### RPC `record_nsfw_violation(p_user_id UUID, p_detail TEXT)`

`SECURITY DEFINER`. `EXECUTE` granted to `service_role` only and revoked from `PUBLIC`,
`anon`, and `authenticated`. Performs the following in a single transaction:

1. Insert a strike with `source = 'auto_nsfw'`, `admin_id = NULL`, and a reason naming what
   tripped.
2. Recount active (non-revoked) strikes and write the total to `profiles.strike_count`.
3. Set `custom_plane_cooldown_until = now() + nsfw_cooldown_hours`.
4. If the active count is at least 3, set `is_banned`, `banned_at`, and
   `ban_reason = 'Automatic ban: 3 active strikes'`.
5. Insert an audit-log row attributed to the system.

Returns `{ active_count, banned, cooldown_until }`.

Steps 2 through 4 intentionally mirror the existing admin path in
`src/lib/admin/queries.ts:438` so both routes to a ban behave identically.

### Required trigger exemption

`protect_role_changes` (`019_fix_rls_recursion.sql:146`) **silently reverts** `is_banned`,
`strike_count`, and `banned_at` whenever `get_my_role()` returns NULL. For a service-role
connection `auth.uid()` is NULL, so `get_my_role()` is NULL, so a plain service-role
`UPDATE profiles` would no-op without raising an error.

The fix is one additional exemption in that trigger: allow the change when
`current_setting('planechaser.system_action', true) = 'on'`. The RPC sets this with
`SET LOCAL`, so it expires with the transaction and cannot leak. No client-reachable role
can invoke the RPC, so no client can set it.

Without this exemption, automatic bans fail silently while every other part of the system
appears to work.

## State machine

Evaluated server-side, in this order. The first matching row wins.

| Precondition | Scan verdict | Outcome |
| --- | --- | --- |
| `is_banned` | not run | `403`. Nothing is scanned. |
| Cooldown active | not run | `429` with remaining time. No new strike. |
| `nsfw_ack_required` and checkbox absent | not run | `400`. No penalty. The UI prevents this; the check guards direct API callers. |
| Plane cap reached | not run | `409`. |
| `nsfw_ack_required` false | clean | Plane created. |
| `nsfw_ack_required` false | flagged | **Warning.** No row. Pending image deleted. Set `nsfw_ack_required = true`. Response names the flagged surfaces. |
| `nsfw_ack_required` true, checkbox checked | clean | Plane created. Flag remains set. |
| `nsfw_ack_required` true, checkbox checked | flagged | **Violation.** No row. Pending image deleted. Call `record_nsfw_violation`: one strike, five-hour cooldown, ban at three. |

The plane is never created and then deleted. It is never inserted in the first place, and
flagged image bytes never reach the public bucket.

## Client behavior

### New state

`src/app/custom-planes/new/page.tsx` and `src/app/custom-planes/[id]/edit/page.tsx` gain
`moderationNotice` and `ackChecked`. Acknowledgment-required and cooldown status come from a
new `useModerationStatus()` hook that reads the user's own profile row; existing RLS already
permits self-select.

The submit handler replaces the current upload-then-insert pair
(`src/app/custom-planes/new/page.tsx:70`) with upload-to-pending, then `POST`, then branch on
status.

### Rejection payload

```ts
type ModerationRejection = {
  error: 'nsfw_detected'
  stage: 'warning' | 'violation'
  image_flagged: boolean
  text_fields: ('name' | 'type_line' | 'oracle_text' | 'chaos_text' | 'flavor_text')[]
  ack_required: boolean
  cooldown_until?: string
  strikes?: { active: number; max: number }
  banned?: boolean
}
```

The payload deliberately excludes both the matched word and the raw `nsfwjs` scores.
Returning either turns the endpoint into a free oracle for tuning evasion against the exact
thresholds. Naming the affected field gives an honest user everything they need.

### Reset behavior

- A flagged image is always cleared from the form, and the pending object is deleted.
- Only the **flagged** text fields are cleared, and the message names them.

Clearing only the flagged fields is a deliberate softening of the original "reset the form"
requirement. A single flagged word in flavor text destroying a fully composed card is the
kind of friction that makes people abandon the feature, and the penalty ladder already
handles deliberate abuse.

### Messages

**Warning** (amber, `role="alert"`):

> **Content blocked — plane not created**
> Your card art was flagged as adult content and has been removed.
> These fields were flagged and cleared: **Flavor Text**.
> From now on you'll need to confirm each plane is safe for work before creating it.

The required checkbox then appears and remains for the life of the account:

> ☐ I confirm this plane contains no nudity, gore, or profanity.

**Violation** (red):

> **Plane not created — flagged again**
> You confirmed this plane was safe for work, but it was flagged for prohibited imagery.
> A strike has been added to your account (**2 of 3**). You can create planes again in **5 hours**.
> Think this is wrong? [Send feedback](/feedback)

**Third strike:** the response renders "That was your third strike. Your account has been
suspended," and the existing `src/components/banned-guard.tsx` takes over on the next
navigation.

**Cooldown banner** on page load reuses the at-limit banner pattern with the `Lock` icon
(`src/app/custom-planes/new/page.tsx:127`): "Plane creation paused — 4h 12m remaining." The
save button is disabled exactly as it is for `limit.atLimit`.

The feedback link is load-bearing. `revokeStrike` (`src/lib/admin/queries.ts:456`) recomputes
`strike_count` but does **not** clear `is_banned`; unbanning is a separate admin action. That
link is the only remediation path available to a user caught by a false positive, so it must
not be buried.

### Latency

Scanning adds roughly 0.5–2s warm and up to roughly 3s on a cold lambda. The save button
already renders a spinner; its label changes to "Checking content…" while the request is in
flight so the delay reads as intentional.

### Accessibility

The notice uses `role="alert"`. The acknowledgment control is a real `<input type="checkbox">`
with an associated label and a 44px touch target. All new UI fits a 375px viewport.

## Testing

### Unit (Vitest, no network)

- `text.ts` positive cases: profanity, slurs, gore keywords, and obfuscated variants
  (leetspeak, inserted spacing, character substitution).
- `text.ts` **false-positive guard suite**, all of which must pass clean: `Scunthorpe`,
  `assassin`, `Bloodghast`, `Slaughter the Strong`, `Hell's Caretaker`. Magic vocabulary is
  violent by default, and this suite is what keeps the feature usable.
- Threshold mapping: score fixtures to verdicts, including the exact boundaries at 0.70
  and 0.85.
- `decideOutcome(profileState, verdict)` as a pure function, table-driven across all eight
  state-machine rows.

### Integration

Route handler with the moderation module and admin client mocked:

- Every state-machine row returns the correct status code.
- The pending object is deleted on **every** rejection path.
- No `custom_planes` row exists after any rejection.

### Database (SQL, against a Supabase branch)

- A third `record_nsfw_violation` call actually sets `is_banned`. This is the test that
  catches a wrong or missing GUC exemption; without it the ban no-ops silently while every
  other test still passes.
- `authenticated` cannot `INSERT` into `custom_planes` after the revoke.
- `authenticated` cannot `EXECUTE` the RPC.

### Model

No tests of `nsfwjs` accuracy. One smoke test asserting the vendored model loads and returns
five class scores summing to approximately 1.

### End-to-end (Playwright, 375px viewport)

The existing happy-path plane creation continues to work through the new route.

## Rollout

Four independently deployable steps, in order:

1. **Migration 030** — profile columns, `app_limits` keys, `user_strikes.source`, the RPC,
   the trigger exemption, and the pending bucket. No behavior change.
2. **Moderation modules** — libraries, vendored model, admin client, and tests. No behavior
   change.
3. **Route handler and client rewire** — the feature goes live. Direct client writes are
   still open at this point.
4. **Migration 031** — revoke `INSERT` and `UPDATE` on `custom_planes` from `authenticated`.

Step 4 is the hazard. Ship it only after step 3 has fully propagated. Any browser still
running a cached pre-step-3 bundle loses the ability to create planes the moment 031 lands,
and surfaces a raw RLS error rather than a handled message.

### Pre-flight

Run `list_migrations` against the hosted database before writing migration 030. This repo
and the hosted schema have drifted in both directions before, and 030 assumes that 026's
`app_limits` table and `get_app_limit` function are actually applied.

## Out of scope

- Gore detection in images.
- Moderation of profile display names and pod names.
- Re-scanning on a private-to-public visibility flip. Redundant, since create and edit are
  both scanned.
- User-facing reporting of existing planes.
- Any paid or hosted moderation API.
