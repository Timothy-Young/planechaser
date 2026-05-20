-- Add max_players to pods (default 4, Commander standard)
ALTER TABLE pods ADD COLUMN IF NOT EXISTS max_players INT NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 2 AND 8);

-- Add friend_code to profiles for friend-adding by code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- Backfill friend_code for existing profiles
UPDATE profiles SET friend_code = substr(md5(random()::text || id::text), 1, 8) WHERE friend_code IS NULL;

ALTER TABLE profiles ALTER COLUMN friend_code SET NOT NULL;

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests (from_user_id, status);

-- RLS for friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests"
  ON friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them"
  ON friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own requests"
  ON friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Allow pod owners to remove members (new RLS policy)
DROP POLICY IF EXISTS "Users can leave pods" ON pod_members;

CREATE POLICY "Users can leave pods or owners can remove members"
  ON pod_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Allow pod owners to delete pods
CREATE POLICY "Pod owners can delete their pods"
  ON pods FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
