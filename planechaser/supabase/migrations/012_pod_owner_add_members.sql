-- Allow pod owners to add members directly (not just self-join)
DROP POLICY IF EXISTS "Users can join pods" ON pod_members;

CREATE POLICY "Users can join pods or owners can add members"
  ON pod_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );
