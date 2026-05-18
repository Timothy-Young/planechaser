ALTER TABLE conquered_planes
  ADD COLUMN IF NOT EXISTS conquered_from_user_id UUID REFERENCES auth.users;

-- Relax INSERT policy so host can award planes to any player (host is authoritative)
DROP POLICY IF EXISTS "Users can conquer planes" ON conquered_planes;
CREATE POLICY "Authenticated users can record conquests"
  ON conquered_planes FOR INSERT TO authenticated WITH CHECK (true);

-- Add DELETE policy for steal/dethrone functionality
CREATE POLICY "Authenticated users can remove conquests"
  ON conquered_planes FOR DELETE TO authenticated USING (true);
