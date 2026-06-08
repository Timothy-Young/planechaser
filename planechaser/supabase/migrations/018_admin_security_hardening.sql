-- ============================================================
-- SECURITY HARDENING: Admin Role Protection & RLS Tightening
-- ============================================================

-- 1. CRITICAL: Prevent role escalation via trigger
-- Enforces role hierarchy at the database level:
-- - Regular users/mods cannot change role, is_banned, strike_count, etc.
-- - Only owner can assign owner/admin roles
-- - Admins cannot modify other admin/owner profiles
-- - Nobody can change the owner's role except the owner
CREATE OR REPLACE FUNCTION protect_role_changes()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

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

DROP TRIGGER IF EXISTS trg_protect_role_changes ON profiles;
CREATE TRIGGER trg_protect_role_changes
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_role_changes();

-- 2. FIX: Audit log policies - use authenticated role, verify admin_id matches caller
DROP POLICY IF EXISTS "Admins can insert audit log" ON admin_audit_log;
CREATE POLICY "Admins can insert audit log"
  ON admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- 3. FIX: Announcement policies - authenticated only, filter active for regular users
DROP POLICY IF EXISTS "Anyone can view active announcements" ON system_announcements;
CREATE POLICY "Authenticated users can view active announcements"
  ON system_announcements FOR SELECT TO authenticated
  USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admins can view all announcements"
  ON system_announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can create announcements" ON system_announcements;
CREATE POLICY "Admins can create announcements"
  ON system_announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update announcements" ON system_announcements;
CREATE POLICY "Admins can update announcements"
  ON system_announcements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete announcements" ON system_announcements;
CREATE POLICY "Admins can delete announcements"
  ON system_announcements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- 4. Input length constraints
ALTER TABLE system_announcements
  DROP CONSTRAINT IF EXISTS announcements_message_length,
  ADD CONSTRAINT announcements_message_length CHECK (char_length(message) <= 500);

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_message_length,
  ADD CONSTRAINT feedback_message_length CHECK (char_length(message) <= 2000);

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_reply_length,
  ADD CONSTRAINT feedback_reply_length CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 2000);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_ban_reason_length,
  ADD CONSTRAINT profiles_ban_reason_length CHECK (ban_reason IS NULL OR char_length(ban_reason) <= 500);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length,
  ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 50);
