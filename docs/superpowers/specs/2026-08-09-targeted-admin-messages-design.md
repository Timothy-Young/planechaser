# Targeted Admin Messages

## Goal

Let an admin send a message to specific users or to every member of a pod, in
addition to the existing site-wide announcement banner. Messages land in a
per-user inbox with server-side read state, so a message survives a page refresh,
follows the user across devices, and can be counted as unread. The same inbox
becomes the delivery surface for admin replies to feedback, which are written to
`feedback.admin_reply` today but are never shown to the user who submitted them.

## Scope

### In scope

| ID | Requirement |
|----|-------------|
| TM-01 | Admin can send a message to one or more explicitly chosen users |
| TM-02 | Admin can send a message to every member of a pod, resolved at send time |
| TM-03 | Recipients read messages in a persistent inbox with server-side read state |
| TM-04 | Unread count is visible from the app's primary navigation |
| TM-05 | Admin replies to feedback are delivered into the recipient's inbox |
| TM-06 | Admin can see per-message delivery and read counts, and soft-delete a message |
| TM-07 | Send is a single transactional operation — no partial fan-out |
| TM-08 | Recipient count and body length are capped by tunable limits |
| TM-09 | Send and delete are recorded in the admin audit log |
| TM-10 | Repo migrations can rebuild `system_announcements` from scratch |

### Out of scope

| ID | Requirement | Reason |
|----|-------------|--------|
| TM-X1 | Replies from user to admin | One-way by decision; `/feedback` and `/support` already cover the other direction |
| TM-X2 | Threaded conversations | Follows from TM-X1 |
| TM-X3 | Realtime push of new messages | Polling on navigation is sufficient at current scale |
| TM-X4 | Email or push-notification delivery | In-app only for this iteration |
| TM-X5 | Scheduled or recurring sends | No demand yet |
| TM-X6 | Global announcements moving into the inbox | The banner already works; fanning every broadcast to N rows buys nothing |

## 1. Existing state and why it needs to change

The only admin-to-user channel today is `system_announcements`, rendered by
`AnnouncementBanner` (`planechaser/src/components/announcement-banner.tsx`),
mounted globally at `planechaser/src/components/providers.tsx:65`. It has three
properties that make it unsuitable for targeted messages:

- **No audience.** The table has `message`, `type`, `is_active`, `expires_at`,
  `created_by`. Every authenticated user sees every active row.
- **No server-side read state.** Dismissal is written to `localStorage` under
  `planechaser-dismissed-announcements`. A dismissal on a phone does not carry to
  a laptop, and nothing can compute an unread count.
- **No history.** Once dismissed or expired, the message is gone from the user's
  view entirely.

Two adjacent facts shape the design:

- **Migration drift.** No migration in `planechaser/supabase/migrations/` creates
  `system_announcements`. Migrations `018` and `019` alter its policies, and the
  table exists in the hosted database with live rows, but a fresh database built
  from the repo would fail on `018`. This is pre-existing and unrelated to the
  feature, but any work in this area should not build on a table the repo cannot
  create.
- **Invisible feedback replies.** `feedback.admin_reply`, `admin_reply_at`, and
  `admin_reply_by` were added in `017_admin_roles_and_strikes.sql`. The columns
  are written from the admin feedback tab, but nothing under
  `planechaser/src/app/feedback/` reads them. An inbox gives those replies a
  destination for the cost of one call at reply time.

## 2. Approach

Three data models were considered.

**Flat fan-out** — one `user_messages` row per recipient with the body copied
into each. Simplest possible RLS and queries, no join. Rejected because a pod
send duplicates the body per member, edits and deletes touch N rows, and read
statistics require grouping by a synthetic batch id.

**Audience resolved at read** — the message stores an audience spec and
membership is resolved on every read, so users who join a pod later still see
older messages. Rejected because the read policy needs a `pod_members` subquery
in RLS, which is the pattern that required
`019_fix_rls_recursion.sql`. The risk is not worth the late-joiner behavior,
which is arguably wrong anyway: a message sent to a pod describes that pod as it
was when the message was sent.

**Message plus receipts (chosen)** — the body lives once in `admin_messages`;
`admin_message_recipients` holds one lightweight row per recipient, fanned out at
send time. The recipient policy is a bare `user_id = auth.uid()` with no
subquery. Edits and soft-deletes touch a single row. Read counts come free from
aggregating receipts. The cost is one join on the read path.

## 3. Schema

### 3.1 Baseline migration — `028_baseline_system_announcements.sql`

Dump the live DDL for `system_announcements` from the hosted database and commit
an idempotent `CREATE TABLE IF NOT EXISTS` that matches it exactly, including
column types, defaults, the `announcements_message_length` constraint from `018`,
and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Policies stay where they are in
`018` and `019`.

The generated DDL must be diffed against the live table before committing —
a mismatch here silently diverges local and hosted schemas. No behavior change on
the hosted database; the migration is a no-op there.

### 3.2 Feature migration — `029_admin_messages.sql`

```sql
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT CHECK (subject IS NULL OR char_length(subject) <= 120),
  body         TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  kind         TEXT NOT NULL DEFAULT 'admin_message'
                 CHECK (kind IN ('admin_message', 'feedback_reply')),
  source_type  TEXT CHECK (source_type IS NULL OR source_type IN ('feedback')),
  source_id    UUID,
  audience     TEXT NOT NULL CHECK (audience IN ('users', 'pod')),
  pod_id       UUID REFERENCES public.pods ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES auth.users,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_message_recipients (
  message_id  UUID NOT NULL REFERENCES public.admin_messages ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS admin_message_recipients_user_unread_idx
  ON public.admin_message_recipients (user_id, read_at);
```

`audience` and `pod_id` are provenance for the admin view — they record how the
message was addressed. Delivery is determined solely by the receipt rows.
`pod_id` uses `ON DELETE SET NULL` so deleting a pod does not delete messages
already delivered to its members.

### 3.3 Row-level security

Both tables get `ENABLE ROW LEVEL SECURITY`. Admin checks reuse the existing
`public.get_my_role()` helper from `019_fix_rls_recursion.sql` rather than
subquerying `profiles` directly — that substitution is what fixed the recursion.

| Table | Operation | Policy |
|---|---|---|
| `admin_message_recipients` | SELECT | `user_id = auth.uid()` |
| `admin_message_recipients` | SELECT (admin) | `get_my_role() IN ('owner','admin','mod')` |
| `admin_message_recipients` | INSERT / UPDATE / DELETE | admin roles only |
| `admin_messages` | SELECT | `deleted_at IS NULL AND EXISTS (SELECT 1 FROM admin_message_recipients r WHERE r.message_id = id AND r.user_id = auth.uid())` |
| `admin_messages` | SELECT (admin) | `get_my_role() IN ('owner','admin','mod')` |
| `admin_messages` | INSERT / UPDATE / DELETE | admin roles only |

The `EXISTS` in the `admin_messages` read policy is not recursive: the
`admin_message_recipients` policy it triggers compares `user_id` to `auth.uid()`
and never references `admin_messages`. Adding any policy on
`admin_message_recipients` that reads `admin_messages` would create a cycle — do
not do it.

Clients never `UPDATE` `read_at` directly; the write path is the RPC in §4.2.

## 4. Server functions

### 4.1 `send_admin_message`

```sql
send_admin_message(
  p_subject   TEXT,
  p_body      TEXT,
  p_audience  TEXT,          -- 'users' | 'pod'
  p_user_ids  UUID[],        -- required when p_audience = 'users'
  p_pod_id    UUID,          -- required when p_audience = 'pod'
  p_kind      TEXT DEFAULT 'admin_message',
  p_source_id UUID DEFAULT NULL
) RETURNS TABLE (message_id UUID, recipient_count INT)
```

`SECURITY DEFINER`, `SET search_path = public`. Behavior:

1. Assert `get_my_role() IN ('owner','admin','mod')`; otherwise raise.
2. Validate `p_audience` and that the matching parameter is present and non-empty.
3. Resolve recipients — `p_user_ids` deduplicated for `'users'`, or
   `SELECT user_id FROM pod_members WHERE pod_id = p_pod_id` for `'pod'`.
4. Reject an empty recipient set, and reject a set larger than
   `get_app_limit('admin_message_recipient_max', 100)`.
5. Insert the `admin_messages` row and all `admin_message_recipients` rows in one
   statement pair inside the function's implicit transaction.
6. Return the new id and recipient count.

Fan-out on the server rather than the client keeps the operation atomic — a
client-side loop can fail halfway and leave a message delivered to some of its
intended recipients.

Body length is enforced twice: the `CHECK` constraint is the hard floor, and the
function compares against `get_app_limit('admin_message_body_max', 2000)` so the
soft limit is tunable without a migration. If the tunable is ever raised above
the constraint, the constraint wins and the insert fails loudly.

### 4.2 `mark_messages_read`

```sql
mark_messages_read(p_message_ids UUID[]) RETURNS INT
```

`SECURITY DEFINER`. Sets `read_at = now()` on receipts where
`user_id = auth.uid()`, `message_id = ANY(p_message_ids)`, and `read_at IS NULL`.
Returns the number of rows updated. Idempotent: re-marking a read message is a
no-op and does not move the timestamp.

## 5. Feedback replies

`replyToFeedback` in `planechaser/src/lib/admin/queries.ts` gains one call after
it updates the feedback row: `send_admin_message` with `p_kind =
'feedback_reply'`, `p_audience = 'users'`, `p_user_ids = [feedback.user_id]`,
`p_source_id = feedback.id`, and the reply text as the body.

This lives in TypeScript alongside the existing `logAuditAction` call rather than
in a database trigger, matching how the rest of the admin layer composes side
effects. A trigger would be harder to skip but would split the admin write path
across two languages.

If `feedback.user_id` is `NULL` — the column is `ON DELETE SET NULL`, so this
happens when the submitter's account is gone — the reply is stored and no message
is sent.

## 6. User surfaces

**Data layer.** New files `planechaser/src/lib/messages/queries.ts` and
`planechaser/src/hooks/useMessages.ts`. These stay out of `src/lib/admin/` and
`src/hooks/useAdmin.ts`: those modules are admin-gated and already large, while
these reads run for every signed-in user.

Query functions: `getMyMessages()`, `getUnreadCount()`, `markMessagesRead(ids)`.
Query keys `['messages', 'list']` and `['messages', 'unread']`, `staleTime` 60s.
`markMessagesRead` invalidates both.

**Inbox page.** `planechaser/src/app/messages/page.tsx`. Unread messages first
and visually distinct, each expandable to the full body, marked read on expand.
A "mark all read" action. Feedback replies show the originating feedback message
as context. Empty state when there is nothing.

**Unread indicator.** `planechaser/src/components/bottom-nav.tsx` already carries
seven items and would break at 375px with an eighth. The unread dot goes on the
existing **Profile** item, with the entry point to `/messages` inside the profile
page. If a top-level Messages item is wanted later, it means dropping or nesting
an existing nav item — a separate decision.

**Announcement banner.** Unchanged.

## 7. Admin surfaces

**New file** `planechaser/src/components/admin/messages-tab.tsx`, imported by
`planechaser/src/app/admin/page.tsx` and wired into `AdminTab` as `'messages'`.
It is extracted rather than appended because `admin/page.tsx` is already ~2300
lines. Existing tabs stay where they are; this is not a refactor of that file.

**Compose.** Audience toggle (Users / Pod). Users mode: search `profiles` by
`display_name`, multi-select, selected users shown as removable chips. Pod mode:
pod select showing member count and a preview of member names. Optional subject,
required body with a live character count against the limit, send button showing
the resolved recipient count.

**Sent list.** Body preview, audience summary ("5 users" or pod name), read
progress ("3/5 read"), sent timestamp, soft-delete action. Read counts come from
aggregating `admin_message_recipients`.

**Audit.** `AuditAction` in `planechaser/src/lib/admin/types.ts` gains
`'message_sent'` and `'message_deleted'`; `target_type` gains `'message'`.
Details record audience, recipient count, and a body preview — matching the
`message_preview: message.slice(0, 50)` convention used by
`createAnnouncement`.

## 8. Limits

Added to `app_limits` (introduced in `026_abuse_limits.sql`) so they are tunable
without a migration:

| Key | Value | Meaning |
|---|---|---|
| `admin_message_recipient_max` | 100 | Maximum recipients resolved for a single send |
| `admin_message_body_max` | 2000 | Maximum body length, matching the existing feedback reply cap |

Read through the existing `get_app_limit(key, default)` helper.

## 9. Error handling

| Condition | Behavior |
|---|---|
| Non-admin calls `send_admin_message` | Function raises; RLS also blocks the insert |
| Empty recipient set | Raise with a message naming the audience |
| Recipient set over cap | Raise with the count and the limit |
| Body empty or over cap | Raise before insert; UI disables send and shows the counter |
| Pod deleted between compose and send | Pod resolves to zero members, treated as empty recipient set |
| Feedback author account deleted | Reply saved, no message sent, no error surfaced to the admin |
| Message soft-deleted while a user has it open | Next refetch drops it from the list |

## 10. Testing

Unit (Vitest):

- Recipient deduplication when the same user id appears twice in `p_user_ids`.
- Pod send resolves exactly the current `pod_members` set.
- A user who joins the pod after the send has no receipt.
- Non-admin send is rejected.
- Recipient cap and body cap both raise.
- Unread count reflects only the caller's unread receipts.
- `mark_messages_read` is idempotent and does not move an existing `read_at`.
- Replying to feedback creates exactly one message addressed to the author.
- Replying to feedback with a null `user_id` creates no message and does not throw.

Manual:

- Send to self, confirm the unread dot appears and the inbox renders the message.
- Read on one device, confirm the unread state is cleared on another.
- Send to a pod, confirm every current member receives it and non-members do not.
- Reply to a feedback item, confirm it appears in that user's inbox.

## 11. Files touched

**New**

- `planechaser/supabase/migrations/028_baseline_system_announcements.sql`
- `planechaser/supabase/migrations/029_admin_messages.sql`
- `planechaser/src/lib/messages/queries.ts`
- `planechaser/src/hooks/useMessages.ts`
- `planechaser/src/app/messages/page.tsx`
- `planechaser/src/components/admin/messages-tab.tsx`

**Modified**

- `planechaser/src/lib/admin/queries.ts` — send/list/delete message functions; `replyToFeedback` delivers a message
- `planechaser/src/lib/admin/types.ts` — `AdminMessage`, `AdminMessageRecipient`, new audit actions and target type
- `planechaser/src/hooks/useAdmin.ts` — hooks for the admin message tab
- `planechaser/src/app/admin/page.tsx` — `AdminTab` union, tab bar entry, render branch
- `planechaser/src/components/bottom-nav.tsx` — unread dot on the Profile item
