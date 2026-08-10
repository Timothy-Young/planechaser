-- 031: Close direct client writes to custom_planes (2026-08-10)
--
-- DEPLOY ORDER MATTERS. Apply this only after the build containing
-- /api/custom-planes is live and has propagated to clients.
--
-- Any browser still running a bundle from before that release writes to
-- PostgREST directly. The moment this migration lands, those writes fail with a
-- raw RLS error the old bundle has no handling for. The route itself keeps
-- working because the service-role client bypasses RLS.
--
-- This is what makes the NSFW cooldown and strike ladder real rather than
-- advisory: without it, a caller can skip the scan entirely by inserting
-- through PostgREST, and the penalties only ever apply to people using the UI.

DROP POLICY IF EXISTS "Users can create custom planes" ON public.custom_planes;
DROP POLICY IF EXISTS "Users can update own custom planes" ON public.custom_planes;

REVOKE INSERT, UPDATE ON public.custom_planes FROM authenticated;

-- SELECT and DELETE stay with the client. Reads are unchanged, and deleting a
-- plane you own needs no moderation.

-- ============================================================
-- Rollback
--
-- If the route has to be taken out of service, restoring direct writes is:
--
--   GRANT INSERT, UPDATE ON public.custom_planes TO authenticated;
--
--   CREATE POLICY "Users can create custom planes"
--     ON public.custom_planes FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = user_id);
--
--   CREATE POLICY "Users can update own custom planes"
--     ON public.custom_planes FOR UPDATE TO authenticated
--     USING (auth.uid() = user_id);
--
-- Note that doing so reopens the bypass described above.
-- ============================================================
