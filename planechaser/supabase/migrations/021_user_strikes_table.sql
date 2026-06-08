-- Individual strike records with reasons (replaces simple strike_count counter)
CREATE TABLE user_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_user_strikes_user_id ON user_strikes(user_id);
CREATE INDEX idx_user_strikes_active ON user_strikes(user_id) WHERE revoked_at IS NULL;

ALTER TABLE user_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view strikes"
  ON user_strikes FOR SELECT TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'mod'));

CREATE POLICY "Admins can insert strikes"
  ON user_strikes FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND get_my_role() IN ('owner', 'admin')
  );

CREATE POLICY "Admins can update strikes"
  ON user_strikes FOR UPDATE TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "Users can view own strikes"
  ON user_strikes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
