-- Add role and moderation columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('owner', 'admin', 'mod', 'user'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strike_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Set Tim as owner
UPDATE profiles SET role = 'owner' WHERE id = '1db0fa5e-4e0e-47be-a9dc-65b7de5397a5';

-- Expand feedback table for admin replies and status tracking
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'read', 'replied', 'resolved'));
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_by UUID REFERENCES auth.users(id);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Backfill user_email from auth.users for existing feedback
UPDATE feedback f SET user_email = (
  SELECT u.email FROM auth.users u WHERE u.id = f.user_id
) WHERE f.user_email IS NULL AND f.user_id IS NOT NULL;

-- Also capture email on new feedback inserts (trigger)
CREATE OR REPLACE FUNCTION set_feedback_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO NEW.user_email FROM auth.users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_feedback_email ON feedback;
CREATE TRIGGER trg_set_feedback_email
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_email();

-- RLS: Admins/mods/owner can read ALL feedback
CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Admins/owner can update feedback (reply, status)
CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- RLS: Admins can read ALL profiles (for user management)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Owner/admin can update any profile (role changes, bans)
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin')
    )
  );

-- RLS: Admins can delete any custom plane (moderation)
CREATE POLICY "Admins can delete custom planes"
  ON custom_planes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Admins can view ALL custom planes (including private ones for moderation)
CREATE POLICY "Admins can view all custom planes"
  ON custom_planes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
