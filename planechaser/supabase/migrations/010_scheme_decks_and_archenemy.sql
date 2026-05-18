-- User scheme decks (mirrors user_decks pattern)
CREATE TABLE IF NOT EXISTS user_scheme_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL,
  scheme_ids  TEXT[] NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scheme_decks_user_id ON user_scheme_decks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_scheme_decks_one_default
  ON user_scheme_decks(user_id) WHERE is_default = true;

ALTER TABLE user_scheme_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheme decks"
  ON user_scheme_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scheme decks"
  ON user_scheme_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheme decks"
  ON user_scheme_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheme decks"
  ON user_scheme_decks FOR DELETE USING (auth.uid() = user_id);

-- Back-to-back archenemy prevention
ALTER TABLE pods ADD COLUMN IF NOT EXISTS last_archenemy_user_id UUID REFERENCES auth.users;
