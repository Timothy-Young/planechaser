---
quick_id: 260810-evx
slug: nsfw-moderation
date: 2026-08-10
branch: feat/nsfw-moderation
status: in-progress
---

# NSFW moderation for custom planes

Implements the approved design spec at
`planechaser/docs/superpowers/specs/2026-08-10-nsfw-moderation-design.md`.

Server-authoritative screening of custom plane create and edit for pornography
(nsfwjs) and profanity/gore keywords (obscenity), with a penalty ladder: sticky
acknowledgment on first violation, then a strike plus a five-hour cooldown per
subsequent violation, and an automatic ban at three active strikes.

## Dependencies

| Package | Version |
| --- | --- |
| `nsfwjs` | 4.4.0 |
| `@tensorflow/tfjs` | 4.22.0 |
| `@tensorflow/tfjs-backend-wasm` | 4.22.0 |
| `obscenity` | 0.4.6 |

## Tasks

Each task is one atomic commit.

1. **deps** — install the four packages.

   Deviation from the spec: no vendoring into `public/models/nsfwjs/` is needed.
   `nsfwjs@4.4.0` ships all three models inside the package as base64-embedded
   bundles, so `load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] })`
   already runs fully offline with no runtime fetch — which is what the
   vendoring step existed to guarantee.

   Import from `nsfwjs/core` plus `nsfwjs/models/mobilenet_v2` rather than the
   package index. The index registers all three default models, which would drag
   the 29MB `inception_v3` bundle into the serverless function; the explicit
   import keeps it to `mobilenet_v2` at 3.5MB.
2. **migration 030** — `profiles.nsfw_ack_required` and
   `profiles.custom_plane_cooldown_until`; four `app_limits` keys;
   `user_strikes.source` with a nullable `admin_id`; the
   `record_nsfw_violation` RPC; the `protect_role_changes` GUC exemption; the
   private `custom-plane-images-pending` bucket and its storage policies.
3. **moderation modules** — `src/lib/moderation/{text,image,decide,index}.ts`
   plus unit tests, including the false-positive guard suite.
4. **admin client** — `src/lib/supabase/admin.ts`, server-only service-role client.
5. **API route** — `src/app/api/custom-planes/route.ts` with `POST` and `PATCH`,
   implementing the ordered state machine.
6. **client rewire** — `useModerationStatus` hook, and the create and edit pages
   posting to the route with warning, violation, and cooldown UI.
7. **admin UI** — render `"System"` as the issuer for `source = 'auto_nsfw'`
   strikes, which have a null `admin_id`.
8. **migration 031** — revoke client `INSERT`/`UPDATE` on `custom_planes`.
   Deploy only after task 6 has propagated.

## Out of scope

Gore imagery, display-name and pod-name moderation, private-to-public rescan,
user reporting, and any paid or hosted moderation API.
