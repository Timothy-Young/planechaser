-- 035: Fix the owner guard on set_global_ui_theme
--
-- 034 wrote the check as `get_my_role() <> 'owner'`. get_my_role() returns NULL
-- when auth.uid() is NULL, and `NULL <> 'owner'` is NULL rather than TRUE, so
-- the IF body never ran and the guard silently passed. EXECUTE is revoked from
-- anon, so this was not reachable anonymously — but any authenticated caller
-- with no matching profiles row (deleted, or not yet created) would have gone
-- straight through and restyled the app for everybody.
--
-- IS DISTINCT FROM is the NULL-safe comparison: it returns TRUE when the left
-- side is NULL, so an unknown role is now treated as "not the owner" instead of
-- as "unknown, carry on".
--
-- Every other SECURITY DEFINER function that consults get_my_role() uses
-- `IN (...)` or `= 'owner'`, both of which fail closed on NULL. This mistake
-- was specific to the negated form.

CREATE OR REPLACE FUNCTION public.set_global_ui_theme(p_theme text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the owner can change the global theme';
  END IF;

  IF p_theme NOT IN (
    'atlas', 'eternities', 'azorius', 'dimir', 'rakdos', 'gruul', 'selesnya'
  ) THEN
    RAISE EXCEPTION 'Unknown theme: %', p_theme;
  END IF;

  UPDATE public.app_settings
  SET ui_theme = p_theme,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'global_theme_changed',
    'app_settings',
    '1',
    jsonb_build_object('theme', p_theme)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_global_ui_theme(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_global_ui_theme(text) TO authenticated;
