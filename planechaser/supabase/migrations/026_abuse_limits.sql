-- 026: Abuse limits (2026-08-07)
-- Feedback rate limiting + custom plane creation cap.
--
-- Enforced with BEFORE INSERT triggers rather than client-side checks: the
-- client-side checks are UX only, and a caller hitting PostgREST directly
-- bypasses them entirely.
--
-- Violations raise distinct SQLSTATEs so the client can tell them apart:
--   PC001 — feedback cooldown not elapsed
--   PC002 — feedback daily cap reached
--   PC003 — custom plane cap reached

-- ============================================================
-- 1. app_limits: tunable limits, changeable without a migration.
--    Shaped to grow a `tier` column when payment tiers land.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_limits (
  key TEXT PRIMARY KEY,
  value INT NOT NULL CHECK (value >= 0),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_limits (key, value, description) VALUES
  ('feedback_cooldown_seconds', 120, 'Minimum seconds between feedback submissions per user'),
  ('feedback_daily_max',         20, 'Maximum feedback submissions per user per rolling 24 hours'),
  ('custom_planes_max',          25, 'Maximum custom planes a non-staff user may own')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_limits ENABLE ROW LEVEL SECURITY;

-- Clients read the limits so the UI can show "12 of 25 used" and pre-empt errors.
DROP POLICY IF EXISTS "Authenticated users can view limits" ON public.app_limits;
CREATE POLICY "Authenticated users can view limits"
  ON public.app_limits FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update limits" ON public.app_limits;
CREATE POLICY "Admins can update limits"
  ON public.app_limits FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Admins can insert limits" ON public.app_limits;
CREATE POLICY "Admins can insert limits"
  ON public.app_limits FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Admins can delete limits" ON public.app_limits;
CREATE POLICY "Admins can delete limits"
  ON public.app_limits FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('owner', 'admin'));

-- ============================================================
-- 2. get_app_limit: read a limit with a compiled-in fallback.
--    SECURITY DEFINER so trigger functions never depend on the
--    caller's RLS visibility of app_limits.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_app_limit(p_key TEXT, p_default INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.app_limits WHERE key = p_key),
    p_default
  );
$$;

-- ============================================================
-- 3. Feedback rate limit: cooldown + rolling daily cap.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_feedback_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown_seconds INT;
  daily_max        INT;
  last_at          TIMESTAMPTZ;
  recent_count     INT;
  wait_seconds     INT;
BEGIN
  -- No JWT: service_role or direct SQL. Trusted context, nothing to limit.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Staff are exempt.
  IF public.get_my_role() IN ('owner', 'admin', 'mod') THEN
    RETURN NEW;
  END IF;

  cooldown_seconds := public.get_app_limit('feedback_cooldown_seconds', 120);
  daily_max        := public.get_app_limit('feedback_daily_max', 20);

  SELECT max(created_at) INTO last_at
  FROM public.feedback
  WHERE user_id = NEW.user_id;

  IF last_at IS NOT NULL
     AND last_at > now() - make_interval(secs => cooldown_seconds) THEN
    wait_seconds := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (last_at + make_interval(secs => cooldown_seconds)) - now()))::INT
    );
    RAISE EXCEPTION
      'Please wait % more second(s) before sending more feedback.', wait_seconds
      USING ERRCODE = 'PC001';
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.feedback
  WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '24 hours';

  IF recent_count >= daily_max THEN
    RAISE EXCEPTION
      'Daily feedback limit reached (% per 24 hours). Please try again later.', daily_max
      USING ERRCODE = 'PC002';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_feedback_rate_limit_trigger ON public.feedback;
CREATE TRIGGER enforce_feedback_rate_limit_trigger
  BEFORE INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_feedback_rate_limit();

-- ============================================================
-- 4. Custom plane creation cap.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_custom_plane_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_planes  INT;
  owned_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.get_my_role() IN ('owner', 'admin', 'mod') THEN
    RETURN NEW;
  END IF;

  max_planes := public.get_app_limit('custom_planes_max', 25);

  SELECT count(*) INTO owned_count
  FROM public.custom_planes
  WHERE user_id = NEW.user_id;

  IF owned_count >= max_planes THEN
    RAISE EXCEPTION
      'Custom plane limit reached (% of %). Delete an existing plane to make room.',
      owned_count, max_planes
      USING ERRCODE = 'PC003';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_custom_plane_limit_trigger ON public.custom_planes;
CREATE TRIGGER enforce_custom_plane_limit_trigger
  BEFORE INSERT ON public.custom_planes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_custom_plane_limit();

-- ============================================================
-- 5. Indexes backing the counting queries above.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_feedback_user_created
  ON public.feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_planes_user
  ON public.custom_planes (user_id);

-- ============================================================
-- 6. Execution grants (mirrors 024).
--    Trigger functions need no caller EXECUTE — Postgres does not check it
--    for the invoking user when a trigger fires.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enforce_feedback_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_custom_plane_limit() FROM PUBLIC, anon, authenticated;

-- get_app_limit is only ever called from inside the SECURITY DEFINER triggers
-- above, where permission checks run as the function owner. Clients read the
-- numbers through the app_limits SELECT policy instead, so no role needs
-- EXECUTE — leaving it granted would expose a needless /rest/v1/rpc endpoint.
REVOKE EXECUTE ON FUNCTION public.get_app_limit(TEXT, INT) FROM PUBLIC, anon, authenticated;
