-- card_cache: stores Scryfall API responses to avoid repeat fetches
CREATE TABLE IF NOT EXISTS card_cache (
  card_type TEXT        PRIMARY KEY,
  raw_json  JSONB       NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles: extends auth.users with display names
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT        NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- game_sessions: one row per completed game
CREATE TABLE IF NOT EXISTS game_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id     UUID        NOT NULL REFERENCES auth.users,
  players          JSONB       NOT NULL DEFAULT '[]',
  planes_visited   JSONB       NOT NULL DEFAULT '[]',
  die_roll_history JSONB       NOT NULL DEFAULT '[]',
  winner_user_id   UUID        REFERENCES auth.users,
  win_condition    TEXT        NOT NULL DEFAULT 'none',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
