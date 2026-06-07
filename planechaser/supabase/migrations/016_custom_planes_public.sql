-- Add is_public flag to custom_planes
-- When true, the plane is visible to all authenticated users (not just the creator)
ALTER TABLE custom_planes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Drop the existing SELECT policy (owner-only)
DROP POLICY IF EXISTS "Users can view own custom planes" ON custom_planes;

-- New SELECT policy: see your own planes OR any public planes
CREATE POLICY "Users can view own or public custom planes"
  ON custom_planes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);
