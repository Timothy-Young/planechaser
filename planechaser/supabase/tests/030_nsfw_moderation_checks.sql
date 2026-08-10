-- Verification script for migrations 030 and 031.
--
-- Run against a Supabase branch (never production) after applying both
-- migrations. Every block raises on failure, so a clean run means everything
-- below holds. Wrapped in a transaction that rolls back, so it leaves no data.
--
--   psql "$BRANCH_DATABASE_URL" -f supabase/tests/030_nsfw_moderation_checks.sql

BEGIN;

DO $$
DECLARE
  test_user  UUID;
  result     JSONB;
  banned     BOOLEAN;
  cooldown   TIMESTAMPTZ;
  strikes    INT;
BEGIN
  -- A profile row requires an auth.users row (profiles.id FKs to it).
  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'nsfw-test-' || gen_random_uuid() || '@example.test')
  RETURNING id INTO test_user;

  INSERT INTO public.profiles (id, display_name)
  VALUES (test_user, 'NSFW Test User')
  ON CONFLICT (id) DO NOTHING;

  -- ── 1. First violation: one strike, cooldown set, not banned ──────────────
  result := public.record_nsfw_violation(test_user, 'image');

  IF (result->>'active_count')::INT <> 1 THEN
    RAISE EXCEPTION 'Expected 1 active strike, got %', result->>'active_count';
  END IF;
  IF (result->>'banned')::BOOLEAN THEN
    RAISE EXCEPTION 'Banned after a single strike';
  END IF;

  SELECT custom_plane_cooldown_until INTO cooldown
  FROM public.profiles WHERE id = test_user;

  IF cooldown IS NULL OR cooldown <= now() THEN
    RAISE EXCEPTION 'Cooldown was not set forward, got %', cooldown;
  END IF;

  -- ── 2. Second violation: still not banned ─────────────────────────────────
  result := public.record_nsfw_violation(test_user, 'text (flavor_text)');
  IF (result->>'banned')::BOOLEAN THEN
    RAISE EXCEPTION 'Banned after two strikes';
  END IF;

  -- ── 3. Third violation: THE critical assertion ────────────────────────────
  -- protect_role_changes silently reverts is_banned when get_my_role() is NULL,
  -- which is exactly the service-role case. If the system_action GUC exemption
  -- in 030 is missing or wrong, this UPDATE no-ops with no error raised and the
  -- automatic ban never happens. Nothing else in the suite catches that.
  result := public.record_nsfw_violation(test_user, 'image and text (name)');

  IF (result->>'active_count')::INT <> 3 THEN
    RAISE EXCEPTION 'Expected 3 active strikes, got %', result->>'active_count';
  END IF;
  IF NOT (result->>'banned')::BOOLEAN THEN
    RAISE EXCEPTION 'RPC did not report a ban at three strikes';
  END IF;

  SELECT is_banned, strike_count INTO banned, strikes
  FROM public.profiles WHERE id = test_user;

  IF NOT banned THEN
    RAISE EXCEPTION 'is_banned was not persisted — the system_action GUC exemption in protect_role_changes is not working';
  END IF;
  IF strikes <> 3 THEN
    RAISE EXCEPTION 'strike_count out of sync with the ledger: %', strikes;
  END IF;

  -- ── 4. Strikes carry the right source and no admin ────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.user_strikes
    WHERE user_id = test_user AND (source <> 'auto_nsfw' OR admin_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Automatic strikes are mis-attributed';
  END IF;

  -- ── 5. The source/admin_id constraint actually holds ──────────────────────
  BEGIN
    INSERT INTO public.user_strikes (user_id, admin_id, reason, source)
    VALUES (test_user, NULL, 'should fail', 'admin');
    RAISE EXCEPTION 'An admin strike with a null admin_id was allowed';
  EXCEPTION WHEN check_violation THEN
    NULL; -- expected
  END;

  RAISE NOTICE 'record_nsfw_violation: all assertions passed';
END $$;

-- ── 6. Grants: no client-reachable role may write planes or call the RPC ────
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.custom_planes', 'INSERT') THEN
    RAISE EXCEPTION '031 did not revoke INSERT on custom_planes from authenticated';
  END IF;
  IF has_table_privilege('authenticated', 'public.custom_planes', 'UPDATE') THEN
    RAISE EXCEPTION '031 did not revoke UPDATE on custom_planes from authenticated';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.custom_planes', 'SELECT') THEN
    RAISE EXCEPTION 'SELECT on custom_planes was revoked — reads should still work';
  END IF;

  IF has_function_privilege('authenticated', 'public.record_nsfw_violation(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute record_nsfw_violation';
  END IF;
  IF has_function_privilege('anon', 'public.record_nsfw_violation(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute record_nsfw_violation';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.record_nsfw_violation(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute record_nsfw_violation';
  END IF;

  RAISE NOTICE 'grants: all assertions passed';
END $$;

-- ── 7. The quarantine bucket is private ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'custom-plane-images-pending') THEN
    RAISE EXCEPTION 'custom-plane-images-pending bucket is missing';
  END IF;
  IF (SELECT public FROM storage.buckets WHERE id = 'custom-plane-images-pending') THEN
    RAISE EXCEPTION 'The pending bucket is public — flagged images would be reachable by URL';
  END IF;

  RAISE NOTICE 'quarantine bucket: all assertions passed';
END $$;

ROLLBACK;
