---
quick_id: 260809-tmi
description: Implement targeted admin messages (inbox, send RPC, admin tab)
date: 2026-08-09
status: complete
---

# Summary — 260809-tmi

Targeted admin messages are built and the migrations are applied to the hosted
project.

## What shipped

- **028** baselines `system_announcements`. The hosted database had a migration
  named `system_announcements` in its own history that was never committed here,
  so the repo could not rebuild the table that 018 and 019 go on to alter.
- **029** adds `admin_messages` + `admin_message_recipients`, their RLS,
  `send_admin_message`, `mark_messages_read`, and two `app_limits` rows.
- `/messages` inbox with server-side read state; unread badge on the Profile nav
  item and on the Messages row inside the profile page.
- Admin **Messages** tab: compose to selected users or a whole pod, sent list
  with read progress, soft delete. Audited as `message_sent` / `message_deleted`.
- Replying to feedback now delivers the reply to the author's inbox, so
  `feedback.admin_reply` is finally visible to the person who wrote the feedback.

## Verified

Type-check clean, production build succeeds, 129 Vitest tests pass (12 new).

Database behavior was exercised against the hosted project inside transactions
that roll themselves back: fan-out counts, duplicate collapsing, pod snapshot,
`PC012` on an empty audience, idempotent read marking, recipient vs
non-recipient visibility, `PC010` for a regular user's send attempt, inability to
mark another user's receipt, and soft-delete hiding. `admin_messages`,
`admin_message_recipients`, and the message audit rows are all still empty, so
nothing from testing persisted.

The Supabase security advisor flags both new functions under
`authenticated_security_definer_function_executable`. That is the intended shape
and matches `get_my_role`, `get_user_session_ids`, and
`grant_session_achievements`: each function authorizes internally rather than
relying on the caller's grants.

## Not verified

The signed-in UI was not exercised in a browser — that needs an admin account
login, which this session cannot perform. The PostgREST embed shape used by the
inbox query (`admin_messages` → `profiles(display_name)`) is the one piece
covered by neither the SQL tests nor the build.
