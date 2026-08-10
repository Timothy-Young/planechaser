---
quick_id: 260809-tmi
description: Implement targeted admin messages (inbox, send RPC, admin tab)
date: 2026-08-09
status: complete
---

# Quick Task 260809-tmi: Targeted admin messages implementation

Implements `docs/superpowers/specs/2026-08-09-targeted-admin-messages-design.md`.
Spec written under [260809-tam](../260809-tam-targeted-admin-messages-design-spec/260809-tam-PLAN.md).

## Goal

Admins can send a message to specific users or to every member of a pod.
Recipients read it in a per-user inbox with server-side read state. Admin replies
to feedback are delivered into that same inbox.

## Tasks

### Task 1 — Migrations

**Files:** `planechaser/supabase/migrations/028_baseline_system_announcements.sql`,
`planechaser/supabase/migrations/029_admin_messages.sql`

028 baselines `system_announcements`, which the hosted database had but the repo
could not create. 029 adds `admin_messages`, `admin_message_recipients`, RLS,
`send_admin_message`, `mark_messages_read`, and two `app_limits` rows.

### Task 2 — Recipient inbox

**Files:** `src/lib/messages/{types,inbox,queries}.ts`, `src/hooks/useMessages.ts`,
`src/app/messages/{layout,page}.tsx`, `src/components/bottom-nav.tsx`,
`src/app/profile/page.tsx`, `src/lib/limits/{types,queries}.ts`

### Task 3 — Admin surfaces

**Files:** `src/components/admin/messages-tab.tsx`, `src/lib/admin/{types,queries}.ts`,
`src/hooks/useAdmin.ts`, `src/app/admin/page.tsx`

Includes delivering feedback replies into the inbox.

## Deviations from the spec

| Spec said | Built | Why |
|---|---|---|
| FKs reference `auth.users` | FKs reference `profiles(id)` | `profiles.id` already cascades from `auth.users`, and referencing `profiles` lets PostgREST embed `display_name` for the sender and recipient views. Matches `system_announcements.created_by`. |
| Unread badge because an 8th nav item "breaks the layout" | Badge on Profile because the strip already scrolls | The nav is `overflow-x-auto`; an 8th item would not break it, it would push Support and Admin out of view. Same decision, accurate reason. |
| DB-level tests for fan-out and RLS | Pure-logic Vitest tests + transactional SQL verification | The repo has no database test harness; its Vitest suites cover pure logic only. DB behavior was verified against the hosted database inside transactions that roll back. |

## Verification

- `npx tsc --noEmit` clean; `npm run build` succeeds with `/messages` in the route list.
- `npx vitest run` — 129 tests pass, including 12 new ones for inbox ordering,
  unread counting, feedback-id collection, and multiline sanitizing.
- Migrations applied to the hosted project. Behavior verified in rolled-back
  transactions: fan-out to 2 explicit users, duplicate ids collapse to 1, pod
  audience resolves 3 members, unknown user id raises `PC012`, `mark_messages_read`
  returns 1 then 0, recipient sees the message, non-recipient sees neither message
  nor receipt, a regular user's send raises `PC010`, a regular user cannot mark
  another user's receipt, and a soft-deleted message disappears for its recipient.
  Post-test row counts confirm nothing persisted.
