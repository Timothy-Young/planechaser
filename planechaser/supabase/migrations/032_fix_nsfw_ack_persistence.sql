-- 032: Make the sticky NSFW acknowledgment flag actually persist (2026-08-10)
--
-- Bug this fixes
-- --------------
-- 030 added nsfw_ack_required and custom_plane_cooldown_until to the protected
-- column set in protect_role_changes, so that a user could not clear their own
-- penalty by updating their own profile row. That part was correct.
--
-- What it missed: the API route's warning path sets nsfw_ack_required with a
-- plain service-role UPDATE. For a service-role connection auth.uid() is NULL,
-- so get_my_role() is NULL, so the trigger takes its "regular user" branch and
-- SILENTLY REVERTS the write. No error is raised.
--
-- Effect in production: the flag never persisted, every submission was treated
-- as a first offence, the violation rung was unreachable, and no strike or
-- cooldown could ever be issued. The whole penalty ladder was inert.
--
-- The fix mirrors record_nsfw_violation: go through a SECURITY DEFINER function
-- that sets the planechaser.system_action GUC with SET LOCAL, rather than
-- writing the column directly.

CREATE OR REPLACE FUNCTION public.set_nsfw_ack_required(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  updated BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'set_nsfw_ack_required requires a user id';
  END IF;

  -- Stand protect_role_changes down for this transaction only. Scoped to this
  -- one column: the function cannot touch role, bans, or strike counts.
  PERFORM set_config('planechaser.system_action', 'on', true);

  UPDATE public.profiles
  SET nsfw_ack_required = true
  WHERE id = p_user_id;

  SELECT nsfw_ack_required INTO updated
  FROM public.profiles
  WHERE id = p_user_id;

  -- Fail loudly rather than repeat the original bug, where a reverted write
  -- looked exactly like a successful one.
  IF NOT COALESCE(updated, false) THEN
    RAISE EXCEPTION 'set_nsfw_ack_required did not persist for user %', p_user_id;
  END IF;

  RETURN true;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.set_nsfw_ack_required(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_nsfw_ack_required(UUID) TO service_role;
