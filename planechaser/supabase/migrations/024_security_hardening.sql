-- 024: Pre-launch security hardening (2026-07-03)
-- Addresses Supabase security advisor findings before public launch.

-- ============================================================
-- 1. Remove tiktok-dashboard tables that never belonged to PlaneChaser.
--    Verified: zero references in app code, all tables empty (0 rows).
-- ============================================================
DROP TABLE IF EXISTS public.competitor_videos CASCADE;
DROP TABLE IF EXISTS public.pipeline_runs CASCADE;
DROP TABLE IF EXISTS public.briefings CASCADE;
DROP TABLE IF EXISTS public.scripts CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.tiktok_accounts CASCADE;

-- ============================================================
-- 2. admin_user_stats: enforce querying user's RLS instead of creator's.
--    Admins keep full visibility via the "Admins can view all ..." policies
--    on profiles / game_sessions / conquered_planes / custom_planes / feedback.
-- ============================================================
ALTER VIEW public.admin_user_stats SET (security_invoker = true);
REVOKE SELECT ON public.admin_user_stats FROM anon;

-- ============================================================
-- 3. conquered_planes: scope writes to pod membership.
--    The acting user must belong to the pod, and (for INSERT) so must the
--    player being credited — the host records conquests for other players
--    on the shared device, so auth.uid() = user_id would break gameplay.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can record conquests" ON public.conquered_planes;
DROP POLICY IF EXISTS "Authenticated users can remove conquests" ON public.conquered_planes;
DROP POLICY IF EXISTS "Users can delete conquered planes (dethrone)" ON public.conquered_planes;

CREATE POLICY "Pod members can record conquests"
  ON public.conquered_planes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = conquered_planes.pod_id AND pm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = conquered_planes.pod_id AND pm.user_id = conquered_planes.user_id
    )
  );

CREATE POLICY "Pod members can remove conquests (dethrone)"
  ON public.conquered_planes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = conquered_planes.pod_id AND pm.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. card_cache: no live code writes it — remove open client write access.
--    Reads stay; server-side (service_role) bypasses RLS if ever needed.
-- ============================================================
DROP POLICY IF EXISTS "Card cache is writable by authenticated users" ON public.card_cache;
DROP POLICY IF EXISTS "Card cache is updatable by authenticated users" ON public.card_cache;

-- ============================================================
-- 5. Pin search_path on functions flagged as mutable.
--    'public' (not '') because protect_role_changes calls get_my_role()
--    unqualified; auth.users references are already schema-qualified.
-- ============================================================
ALTER FUNCTION public.get_user_session_ids(uuid) SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.protect_role_changes() SET search_path = 'public';
ALTER FUNCTION public.set_feedback_email() SET search_path = 'public';

-- ============================================================
-- 6. Lock down SECURITY DEFINER function execution.
--    Trigger functions never need caller EXECUTE (Postgres does not check
--    EXECUTE for the invoking user when a trigger fires).
--    get_my_role / get_user_session_ids are used inside RLS policies for
--    the authenticated role, so authenticated keeps EXECUTE.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_feedback_email() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_session_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_session_ids(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ============================================================
-- 7. Storage: public buckets serve objects without a SELECT policy;
--    the broad policy only enabled bucket listing. App uses getPublicUrl/
--    upload/remove only. Scoped INSERT/UPDATE/DELETE policies remain.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view custom plane images" ON storage.objects;
