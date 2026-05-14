-- user_achievements: tracks earned badges per user
CREATE TABLE IF NOT EXISTS user_achievements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  achievement_key TEXT        NOT NULL,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB       DEFAULT '{}',
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by authenticated users"
  ON user_achievements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can earn achievements"
  ON user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Also allow delete on conquered_planes for dethrone flow
CREATE POLICY "Users can delete conquered planes (dethrone)"
  ON conquered_planes FOR DELETE TO authenticated USING (true);
