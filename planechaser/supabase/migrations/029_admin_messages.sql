-- ============================================================
-- 029: Targeted admin messages.
--
-- Admins send a message to specific users or to every member of a pod. The body
-- is stored once in admin_messages; admin_message_recipients holds one receipt
-- per recipient carrying read_at. Fan-out happens at send time inside a
-- SECURITY DEFINER function so a send is atomic.
--
-- RLS note: the recipient policy is a bare user_id = auth.uid() with no
-- subquery, and admin checks go through get_my_role() (019). Do NOT add a policy
-- on admin_message_recipients that reads admin_messages — the admin_messages
-- read policy already reads admin_message_recipients, and the pair would recurse.
-- ============================================================

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT        CHECK (subject IS NULL OR char_length(subject) <= 120),
  body         TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  kind         TEXT        NOT NULL DEFAULT 'admin_message'
                 CHECK (kind IN ('admin_message', 'feedback_reply')),
  source_type  TEXT        CHECK (source_type IS NULL OR source_type IN ('feedback')),
  source_id    UUID,
  audience     TEXT        NOT NULL CHECK (audience IN ('users', 'pod')),
  -- Provenance for the admin view only. Delivery is decided solely by the
  -- receipt rows, so clearing this on pod deletion cannot orphan a delivery.
  pod_id       UUID        REFERENCES public.pods ON DELETE SET NULL,
  created_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_message_recipients (
  message_id  UUID NOT NULL REFERENCES public.admin_messages ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

-- Unread lookup for the badge, and the recipient's inbox listing.
CREATE INDEX IF NOT EXISTS admin_message_recipients_user_unread_idx
  ON public.admin_message_recipients (user_id, read_at);

-- Admin "sent" list ordering.
CREATE INDEX IF NOT EXISTS admin_messages_created_at_idx
  ON public.admin_messages (created_at DESC);

-- ============================================================
-- 2. Row-level security
-- ============================================================

ALTER TABLE public.admin_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_recipients ENABLE ROW LEVEL SECURITY;

-- --- admin_message_recipients ---
-- No subquery here. This is what keeps the pair non-recursive.
DROP POLICY IF EXISTS "Users can view own message receipts" ON public.admin_message_recipients;
CREATE POLICY "Users can view own message receipts"
  ON public.admin_message_recipients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all message receipts" ON public.admin_message_recipients;
CREATE POLICY "Admins can view all message receipts"
  ON public.admin_message_recipients FOR SELECT TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'));

DROP POLICY IF EXISTS "Admins can delete message receipts" ON public.admin_message_recipients;
CREATE POLICY "Admins can delete message receipts"
  ON public.admin_message_recipients FOR DELETE TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'));

-- No INSERT or UPDATE policy: receipts are written only by send_admin_message,
-- and read_at is written only by mark_messages_read. Both are SECURITY DEFINER.

-- --- admin_messages ---
DROP POLICY IF EXISTS "Recipients can view their messages" ON public.admin_messages;
CREATE POLICY "Recipients can view their messages"
  ON public.admin_messages FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_message_recipients r
      WHERE r.message_id = admin_messages.id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON public.admin_messages;
CREATE POLICY "Admins can view all messages"
  ON public.admin_messages FOR SELECT TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'));

DROP POLICY IF EXISTS "Admins can update messages" ON public.admin_messages;
CREATE POLICY "Admins can update messages"
  ON public.admin_messages FOR UPDATE TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'))
  WITH CHECK (get_my_role() IN ('owner', 'admin', 'mod'));

DROP POLICY IF EXISTS "Admins can delete messages" ON public.admin_messages;
CREATE POLICY "Admins can delete messages"
  ON public.admin_messages FOR DELETE TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'));

-- No INSERT policy: messages are created only through send_admin_message.

-- ============================================================
-- 3. Tunable limits
-- ============================================================

INSERT INTO public.app_limits (key, value, description) VALUES
  ('admin_message_recipient_max', 100,  'Maximum recipients resolved for a single admin message'),
  ('admin_message_body_max',      2000, 'Maximum admin message body length in characters')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. send_admin_message
--
-- Resolves the audience, enforces the caps, and writes the message plus every
-- receipt in one transaction. Fanning out on the client would risk a partial
-- delivery when the loop fails halfway.
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_admin_message(
  p_subject   TEXT,
  p_body      TEXT,
  p_audience  TEXT,
  p_user_ids  UUID[] DEFAULT NULL,
  p_pod_id    UUID   DEFAULT NULL,
  p_kind      TEXT   DEFAULT 'admin_message',
  p_source_id UUID   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role            TEXT;
  v_subject         TEXT;
  v_body            TEXT;
  v_body_max        INT;
  v_recipient_max   INT;
  v_recipients      UUID[];
  v_recipient_count INT;
  v_message_id      UUID;
BEGIN
  v_role := get_my_role();
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin', 'mod') THEN
    RAISE EXCEPTION 'Only staff can send messages' USING ERRCODE = 'PC010';
  END IF;

  IF p_kind NOT IN ('admin_message', 'feedback_reply') THEN
    RAISE EXCEPTION 'Unknown message kind: %', p_kind USING ERRCODE = 'PC011';
  END IF;

  -- Body: trim, then check against the tunable cap. The column CHECK is the
  -- hard ceiling; if the tunable is ever raised above it the insert fails loudly.
  v_body     := btrim(coalesce(p_body, ''));
  v_body_max := get_app_limit('admin_message_body_max', 2000);
  IF v_body = '' THEN
    RAISE EXCEPTION 'Message body cannot be empty' USING ERRCODE = 'PC014';
  END IF;
  IF char_length(v_body) > v_body_max THEN
    RAISE EXCEPTION 'Message body is % characters, limit is %',
      char_length(v_body), v_body_max USING ERRCODE = 'PC014';
  END IF;

  v_subject := nullif(btrim(coalesce(p_subject, '')), '');
  IF v_subject IS NOT NULL AND char_length(v_subject) > 120 THEN
    RAISE EXCEPTION 'Subject is longer than 120 characters' USING ERRCODE = 'PC014';
  END IF;

  -- Resolve the audience. Both branches filter through profiles, which dedupes
  -- and drops ids with no account rather than failing on a foreign key.
  IF p_audience = 'users' THEN
    IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Audience "users" requires at least one user id'
        USING ERRCODE = 'PC011';
    END IF;
    SELECT array_agg(p.id) INTO v_recipients
    FROM public.profiles p
    WHERE p.id = ANY(p_user_ids);

  ELSIF p_audience = 'pod' THEN
    IF p_pod_id IS NULL THEN
      RAISE EXCEPTION 'Audience "pod" requires a pod id' USING ERRCODE = 'PC011';
    END IF;
    -- Membership is snapshotted here on purpose: a message addressed to a pod
    -- describes that pod as it was when the message was sent. Someone who joins
    -- tomorrow does not receive it.
    SELECT array_agg(p.id) INTO v_recipients
    FROM public.pod_members m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.pod_id = p_pod_id;

  ELSE
    RAISE EXCEPTION 'Unknown audience: %', p_audience USING ERRCODE = 'PC011';
  END IF;

  v_recipient_count := coalesce(array_length(v_recipients, 1), 0);

  IF v_recipient_count = 0 THEN
    RAISE EXCEPTION 'Audience "%" resolved to no recipients', p_audience
      USING ERRCODE = 'PC012';
  END IF;

  v_recipient_max := get_app_limit('admin_message_recipient_max', 100);
  IF v_recipient_count > v_recipient_max THEN
    RAISE EXCEPTION 'Message would go to % recipients, limit is %',
      v_recipient_count, v_recipient_max USING ERRCODE = 'PC013';
  END IF;

  INSERT INTO public.admin_messages
    (subject, body, kind, source_type, source_id, audience, pod_id, created_by)
  VALUES (
    v_subject,
    v_body,
    p_kind,
    CASE WHEN p_kind = 'feedback_reply' THEN 'feedback' ELSE NULL END,
    p_source_id,
    p_audience,
    CASE WHEN p_audience = 'pod' THEN p_pod_id ELSE NULL END,
    auth.uid()
  )
  RETURNING id INTO v_message_id;

  INSERT INTO public.admin_message_recipients (message_id, user_id)
  SELECT v_message_id, u FROM unnest(v_recipients) AS u;

  RETURN jsonb_build_object(
    'message_id',      v_message_id,
    'recipient_count', v_recipient_count
  );
END;
$$;

-- ============================================================
-- 5. mark_messages_read
--
-- The only write path for read_at. Idempotent: a message already read is
-- skipped, so its original timestamp never moves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_message_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'PC010';
  END IF;

  IF p_message_ids IS NULL OR array_length(p_message_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.admin_message_recipients r
  SET read_at = now()
  WHERE r.user_id = auth.uid()
    AND r.message_id = ANY(p_message_ids)
    AND r.read_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- ============================================================
-- 6. Grants
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.send_admin_message(TEXT, TEXT, TEXT, UUID[], UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.send_admin_message(TEXT, TEXT, TEXT, UUID[], UUID, TEXT, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_messages_read(UUID[]) TO authenticated;
