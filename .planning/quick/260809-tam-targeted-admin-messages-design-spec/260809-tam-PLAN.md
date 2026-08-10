---
quick_id: 260809-tam
description: Write design spec for targeted admin messages (user/pod inbox)
date: 2026-08-09
status: planned
---

# Quick Task 260809-tam: Targeted admin messages design spec

## Goal

Capture the approved design for admin-to-user and admin-to-pod messaging as a
committed spec. Documentation only — no schema, no application code.

## Locked decisions

| Decision | Value | Source |
|---|---|---|
| Delivery surface | Per-user message inbox with server-side read state | user |
| Direction | One-way (admin to user); no reply UI | user |
| Inbox contents | Targeted admin messages + admin replies to feedback | user |
| Data model | `admin_messages` + `admin_message_recipients`, fanned out at send | user |
| Global announcements | Stay banner-only, unchanged | user |
| Pod audience | Membership snapshot at send time, not resolved at read | design |
| Admin RLS helper | Reuse `get_my_role()` from `019_fix_rls_recursion.sql` | discovered — avoids the recursion class fixed in 019 |
| Migration drift | `system_announcements` has no `CREATE TABLE` in repo; needs a baseline migration (028) before 029 | discovered during design |
| Unread indicator | Dot on the existing Profile nav item — `bottom-nav.tsx` is full at 375px | discovered during design |

## Tasks

### Task 1 — Write the spec

**Files:** `docs/superpowers/specs/2026-08-09-targeted-admin-messages-design.md`

Sections: goal, in/out scope tables with requirement IDs, existing state and its
limits, approach with the two rejected data models, schema for both migrations,
RLS table with the non-recursion note, both server functions, feedback reply
integration, user surfaces, admin surfaces, limits, error handling, testing,
files touched.

**Verification:** Spec exists, contains no TBD or placeholder text, and every
file path and identifier it names is either an existing path in the repo or
explicitly marked as new.

## Out of scope

Implementation. The spec is the deliverable; migrations and code follow in a
separate planned task.
