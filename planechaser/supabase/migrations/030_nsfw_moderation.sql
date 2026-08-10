-- 030: NSFW moderation for custom planes (2026-08-10)
--
-- Backing schema for server-authoritative NSFW screening of custom planes.
-- Design: planechaser/docs/superpowers/specs/2026-08-10-nsfw-moderation-design.md
--
-- This migration is behavior-neutral on its own. The API route (which uses it)
-- and migration 031 (which revokes direct client writes) ship separately.

-- ============================================================
-- 1. Moderation state on profiles.
--
--    nsfw_ack_required is sticky: set true on a user's first violation and
--    never automatically cleared. A per-session or per-plane flag would be
--    farmable — reload the page and every violation is forever the "first"
--    one, so no strike would ever land.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nsfw_ack_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_plane_cooldown_until TIMESTAMPTZ;

-- ============================================================
-- 2. Tunable limits (app_limits from 026).
--    Thresholds are basis points because app_limits.value is INT.
-- ============================================================
INSERT INTO public.app_limits (key, value, description) VALUES
  ('nsfw_porn_threshold_bp',   7000, 'nsfwjs Porn score at or above which an image is blocked, in basis points'),
  ('nsfw_hentai_threshold_bp', 7000, 'nsfwjs Hentai score at or above which an image is blocked, in basis points'),
  ('nsfw_sexy_threshold_bp',   8500, 'nsfwjs Sexy score at or above which an image is blocked, in basis points'),
  ('nsfw_cooldown_hours',         5, 'Hours a user is blocked from creating or editing custom planes after an NSFW violation')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. user_strikes gains a source, so automatic strikes share the ledger
--    with admin-issued ones and "three strikes" means one number.
-- ============================================================
ALTER TABLE public.user_strikes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE public.user_strikes
  DROP CONSTRAINT IF EXISTS user_strikes_source_check;
ALTER TABLE public.user_strikes
  ADD CONSTRAINT user_strikes_source_check
  CHECK (source IN ('admin', 'auto_nsfw'));

-- Automatic strikes have no issuing admin.
ALTER TABLE public.user_strikes ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE public.user_strikes
  DROP CONSTRAINT IF EXISTS user_strikes_admin_id_matches_source;
ALTER TABLE public.user_strikes
  ADD CONSTRAINT user_strikes_admin_id_matches_source
  CHECK ((source = 'admin') = (admin_id IS NOT NULL));

-- Same for the audit log: system actions are attributed to no admin.
ALTER TABLE public.admin_audit_log ALTER COLUMN admin_id DROP NOT NULL;

-- ============================================================
-- 4. protect_role_changes: protect the two new moderation columns, and add
--    a narrow escape hatch for system actions.
--
--    Two problems this solves:
--
--    (a) Without adding the new columns to the protected set, a user could
--        UPDATE their own profile row to clear nsfw_ack_required and
--        custom_plane_cooldown_until, erasing their own penalty.
--
--    (b) The existing function silently reverts protected fields whenever
--        get_my_role() is NULL. For a service-role connection auth.uid() is
--        NULL, so get_my_role() is NULL — meaning a service-role UPDATE that
--        sets is_banned would no-op with no error raised. The GUC below is
--        set with SET LOCAL inside record_nsfw_violation, so it expires with
--        the transaction, and it deliberately refuses to cover role changes.
--
--    Body is otherwise carried forward verbatim from 019. search_path is
--    restated because CREATE OR REPLACE drops the SET clause that 024 applied
--    via ALTER FUNCTION.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := get_my_role();

  -- System action escape hatch. Never covers role changes.
  IF current_setting('planechaser.system_action', true) = 'on'
     AND OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF (OLD.role IS DISTINCT FROM NEW.role) OR
     (OLD.is_banned IS DISTINCT FROM NEW.is_banned) OR
     (OLD.strike_count IS DISTINCT FROM NEW.strike_count) OR
     (OLD.banned_at IS DISTINCT FROM NEW.banned_at) OR
     (OLD.ban_reason IS DISTINCT FROM NEW.ban_reason) OR
     (OLD.nsfw_ack_required IS DISTINCT FROM NEW.nsfw_ack_required) OR
     (OLD.custom_plane_cooldown_until IS DISTINCT FROM NEW.custom_plane_cooldown_until) THEN

    -- Regular users and mods: silently revert protected fields
    IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
      NEW.role := OLD.role;
      NEW.is_banned := OLD.is_banned;
      NEW.strike_count := OLD.strike_count;
      NEW.banned_at := OLD.banned_at;
      NEW.ban_reason := OLD.ban_reason;
      NEW.nsfw_ack_required := OLD.nsfw_ack_required;
      NEW.custom_plane_cooldown_until := OLD.custom_plane_cooldown_until;
      RETURN NEW;
    END IF;

    -- Role change rules
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      IF NEW.role IN ('owner', 'admin') AND caller_role != 'owner' THEN
        RAISE EXCEPTION 'Only the owner can assign owner or admin roles';
      END IF;
      IF OLD.role = 'owner' AND auth.uid() != OLD.id THEN
        RAISE EXCEPTION 'Cannot modify the owner role';
      END IF;
      IF caller_role = 'admin' AND OLD.role IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Admins cannot modify other admin or owner roles';
      END IF;
    END IF;

    -- Ban/strike hierarchy enforcement
    IF (OLD.is_banned IS DISTINCT FROM NEW.is_banned) OR
       (OLD.strike_count IS DISTINCT FROM NEW.strike_count) THEN
      IF caller_role = 'admin' AND OLD.role IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Admins cannot ban or strike other admins or the owner';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_role_changes() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 5. record_nsfw_violation: one transaction for the whole penalty.
--
--    Mirrors the admin path in src/lib/admin/queries.ts (addStrike) so both
--    routes to a ban behave identically, including the ban threshold of 3
--    and the ban_reason string the admin dashboard already displays.
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_nsfw_violation(
  p_user_id UUID,
  p_detail  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ban_threshold  CONSTANT INT := 3;
  cooldown_hours INT;
  active_count   INT;
  cooldown_until TIMESTAMPTZ;
  should_ban     BOOLEAN;
  strike_reason  TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'record_nsfw_violation requires a user id';
  END IF;

  strike_reason := left(
    'Automatic: NSFW content submitted after acknowledgment. ' ||
    COALESCE(NULLIF(btrim(p_detail), ''), 'No detail recorded.'),
    500
  );

  INSERT INTO public.user_strikes (user_id, admin_id, reason, source)
  VALUES (p_user_id, NULL, strike_reason, 'auto_nsfw');

  SELECT count(*) INTO active_count
  FROM public.user_strikes
  WHERE user_id = p_user_id AND revoked_at IS NULL;

  cooldown_hours := public.get_app_limit('nsfw_cooldown_hours', 5);
  cooldown_until := now() + make_interval(hours => cooldown_hours);
  should_ban     := active_count >= ban_threshold;

  -- Stand down protect_role_changes for this transaction only.
  PERFORM set_config('planechaser.system_action', 'on', true);

  UPDATE public.profiles
  SET strike_count                = active_count,
      custom_plane_cooldown_until = cooldown_until,
      is_banned  = CASE WHEN should_ban THEN true ELSE is_banned END,
      banned_at  = CASE WHEN should_ban AND NOT is_banned THEN now() ELSE banned_at END,
      ban_reason = CASE WHEN should_ban AND NOT is_banned
                        THEN 'Automatic ban: 3 active strikes'
                        ELSE ban_reason END
  WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (
    NULL,
    'auto_nsfw_strike',
    'user',
    p_user_id::text,
    jsonb_build_object(
      'active_count',   active_count,
      'auto_banned',    should_ban,
      'cooldown_until', cooldown_until,
      'detail',         left(COALESCE(p_detail, ''), 200)
    )
  );

  RETURN jsonb_build_object(
    'active_count',   active_count,
    'banned',         should_ban,
    'cooldown_until', cooldown_until
  );
END;
$$;

-- Only the service role may record a violation. The API route holds that key;
-- no client-reachable role can invoke this, which is also what keeps the
-- system_action GUC out of client hands.
REVOKE EXECUTE ON FUNCTION public.record_nsfw_violation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_nsfw_violation(UUID, TEXT) TO service_role;

-- ============================================================
-- 6. Quarantine bucket.
--
--    Private, unlike custom-plane-images. Clients upload here first; the API
--    route fetches the bytes server-side, scans them, and only copies to the
--    public bucket on a pass. Flagged bytes never receive a public URL.
--
--    This also sidesteps Vercel's 4.5MB serverless request body limit, which
--    the 5MB form upload limit would otherwise exceed.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-plane-images-pending',
  'custom-plane-images-pending',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload pending plane images" ON storage.objects;
CREATE POLICY "Users can upload pending plane images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'custom-plane-images-pending'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view own pending plane images" ON storage.objects;
CREATE POLICY "Users can view own pending plane images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'custom-plane-images-pending'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own pending plane images" ON storage.objects;
CREATE POLICY "Users can delete own pending plane images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'custom-plane-images-pending'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 7. Index backing the cooldown lookup path.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_strikes_source
  ON public.user_strikes (user_id, source) WHERE revoked_at IS NULL;
