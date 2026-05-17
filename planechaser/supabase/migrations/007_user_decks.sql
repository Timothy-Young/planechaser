-- User-created planar decks
CREATE TABLE IF NOT EXISTS user_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL,
  plane_ids   TEXT[] NOT NULL DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_decks_user_id ON user_decks (user_id);

-- Ensure at most one default deck per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_decks_one_default
  ON user_decks (user_id) WHERE is_default = true;

-- RLS
ALTER TABLE user_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decks"
  ON user_decks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decks"
  ON user_decks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
  ON user_decks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
  ON user_decks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
