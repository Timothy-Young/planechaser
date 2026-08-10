---
quick_id: 260809-tam
description: Write design spec for targeted admin messages (user/pod inbox)
date: 2026-08-09
status: complete
---

# Summary — 260809-tam

Wrote `docs/superpowers/specs/2026-08-09-targeted-admin-messages-design.md`.
Documentation only; no schema or application code changed.

## What the spec covers

Admin sends a message to specific users or to every member of a pod. Delivery is
a per-user inbox with server-side read state, not the existing announcement
banner. One-way — users reply through the existing `/feedback` and `/support`
routes. Admin replies to feedback are delivered into the same inbox, which fixes
`feedback.admin_reply` being written but never displayed.

Data model is `admin_messages` (body once, soft-deletable) plus
`admin_message_recipients` (one receipt per user, carrying `read_at`), fanned out
at send time by a `SECURITY DEFINER` RPC so the operation is atomic.

## Findings that shaped the design

- **`system_announcements` has no `CREATE TABLE` migration in the repo.**
  Migrations `018` and `019` alter its policies and the table is live in the
  hosted database with rows, but a fresh database built from the repo would fail
  on `018`. The spec adds `028_baseline_system_announcements.sql` to close this
  before `029` lands. Pre-existing drift, unrelated to the feature.
- **RLS recursion risk.** The chosen policy shape is deliberately non-recursive:
  `admin_message_recipients` compares `user_id` to `auth.uid()` and never reads
  `admin_messages`. Admin checks reuse `get_my_role()`, the helper introduced in
  `019_fix_rls_recursion.sql`.
- **`bottom-nav.tsx` already carries seven items** and breaks at 375px with an
  eighth, so the unread indicator goes on the existing Profile item rather than a
  new top-level Messages entry.

## Next step

Implementation is a separate task: migrations `028` and `029`, the two RPCs, the
`src/lib/messages/` data layer, `/messages` page, and the extracted admin
`messages-tab.tsx`. See §11 of the spec for the full file list.
