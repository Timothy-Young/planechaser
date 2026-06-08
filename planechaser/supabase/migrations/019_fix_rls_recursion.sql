-- ============================================================
-- FIX: Infinite recursion in RLS policies on profiles
-- ============================================================
-- Problem: Policies on `profiles` that subquery `profiles` cause
-- PostgreSQL error 42P17 "infinite recursion detected in policy
-- for relation 'profiles'". This cascades to ALL tables whose
-- policies also subquery `profiles` (system_announcements,
-- feedback, game_sessions, custom_planes, admin_audit_log).
--
-- Fix: Create a SECURITY DEFINER function that reads the caller's
-- role bypassing RLS, then replace every policy subquery with it.
-- ============================================================

-- 1. Helper function: reads caller's role, bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Fix self-referential policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin', 'mod')
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

-- 3. Fix feedback policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin', 'mod')
  );

DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

-- 4. Fix custom_planes policies
DROP POLICY IF EXISTS "Admins can view all custom planes" ON custom_planes;
CREATE POLICY "Admins can view all custom planes"
  ON custom_planes FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin', 'mod')
  );

DROP POLICY IF EXISTS "Admins can delete custom planes" ON custom_planes;
CREATE POLICY "Admins can delete custom planes"
  ON custom_planes FOR DELETE TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin', 'mod')
  );

-- 5. Fix system_announcements policies
DROP POLICY IF EXISTS "Authenticated users can view active announcements" ON system_announcements;
CREATE POLICY "Authenticated users can view active announcements"
  ON system_announcements FOR SELECT TO authenticated
  USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "Admins can view all announcements" ON system_announcements;
CREATE POLICY "Admins can view all announcements"
  ON system_announcements FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Admins can create announcements" ON system_announcements;
CREATE POLICY "Admins can create announcements"
  ON system_announcements FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Admins can update announcements" ON system_announcements;
CREATE POLICY "Admins can update announcements"
  ON system_announcements FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete announcements" ON system_announcements;
CREATE POLICY "Admins can delete announcements"
  ON system_announcements FOR DELETE TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

-- 6. Fix admin_audit_log policies
DROP POLICY IF EXISTS "Admins can insert audit log" ON admin_audit_log;
CREATE POLICY "Admins can insert audit log"
  ON admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND get_my_role() IN ('owner', 'admin', 'mod')
  );

DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin')
  );

-- 7. Fix game_sessions admin policy (if exists)
DROP POLICY IF EXISTS "Admins can view all game sessions" ON game_sessions;
CREATE POLICY "Admins can view all game sessions"
  ON game_sessions FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('owner', 'admin', 'mod')
  );

-- 8. Also update the protect_role_changes trigger to use the helper
CREATE OR REPLACE FUNCTION protect_role_changes()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Use get_my_role() which bypasses RLS
  caller_role := get_my_role();

  IF (OLD.role IS DISTINCT FROM NEW.role) OR
     (OLD.is_banned IS DISTINCT FROM NEW.is_banned) OR
     (OLD.strike_count IS DISTINCT FROM NEW.strike_count) OR
     (OLD.banned_at IS DISTINCT FROM NEW.banned_at) OR
     (OLD.ban_reason IS DISTINCT FROM NEW.ban_reason) THEN

    -- Regular users and mods: silently revert protected fields
    IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
      NEW.role := OLD.role;
      NEW.is_banned := OLD.is_banned;
      NEW.strike_count := OLD.strike_count;
      NEW.banned_at := OLD.banned_at;
      NEW.ban_reason := OLD.ban_reason;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
