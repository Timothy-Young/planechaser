-- 034: Global UI theme
--
-- The UI theme used to be a per-browser preference kept in localStorage, which
-- meant the owner's admin picker only ever restyled the owner's own device.
-- This migration moves it to a single app-wide setting.
--
-- Shape: one row, forever. `app_settings` is a singleton config table (id is
-- pinned to 1 by a CHECK), so there is no "which row?" question anywhere in the
-- app and no way to accidentally end up with two competing settings rows.
--
-- Security: everyone reads (the marketing page renders logged out, so `anon`
-- needs SELECT), nobody writes directly. There is deliberately no INSERT,
-- UPDATE or DELETE policy on the table — the only write path is the
-- SECURITY DEFINER function below, which enforces owner-only and records the
-- change in the audit log. A missing policy is a stronger guarantee than a
-- restrictive one, because there is nothing to get the predicate wrong in.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ui_theme text NOT NULL DEFAULT 'eternities',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT TO anon, authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- set_global_ui_theme — the only write path.
--
-- The theme id list below is the security boundary. It is duplicated in
-- src/lib/theme/themes.ts, which drives the UI; themes.test.ts parses this file
-- and fails if the two lists ever disagree. Validating here rather than
-- trusting the client means a crafted request cannot park the app on a
-- data-theme value that has no CSS behind it, which would render the entire
-- site unstyled for every user at once.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_global_ui_theme(p_theme text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() <> 'owner' THEN
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
