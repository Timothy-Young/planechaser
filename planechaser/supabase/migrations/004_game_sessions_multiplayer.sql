-- Active multiplayer game sessions
CREATE TABLE IF NOT EXISTS active_game_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id               UUID REFERENCES pods,
  host_user_id         UUID NOT NULL REFERENCES auth.users,
  session_code         TEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'lobby'
                       CHECK (status IN ('lobby', 'active', 'ended')),
  game_type            TEXT NOT NULL DEFAULT 'planechase'
                       CHECK (game_type IN ('planechase', 'archenemy')),
  game_state           JSONB,
  turn_order           UUID[] NOT NULL DEFAULT '{}',
  current_turn_user_id UUID REFERENCES auth.users,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players joined to a session
CREATE TABLE IF NOT EXISTS game_session_players (
  session_id  UUID NOT NULL REFERENCES active_game_sessions ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deck_id     UUID,  -- for future Phase 7 (Archenemy per-player decks)
  PRIMARY KEY (session_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_code ON active_game_sessions (session_code);
CREATE INDEX IF NOT EXISTS idx_active_sessions_host ON active_game_sessions (host_user_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user ON game_session_players (user_id);

-- RLS: active_game_sessions
ALTER TABLE active_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions viewable by participants"
  ON active_game_sessions FOR SELECT TO authenticated
  USING (
    host_user_id = auth.uid()
    OR id IN (SELECT session_id FROM game_session_players WHERE user_id = auth.uid())
  );

CREATE POLICY "Host can create sessions"
  ON active_game_sessions FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can update own sessions"
  ON active_game_sessions FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid());

CREATE POLICY "Host can delete own sessions"
  ON active_game_sessions FOR DELETE TO authenticated
  USING (host_user_id = auth.uid());

-- RLS: game_session_players
ALTER TABLE game_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session players viewable by session participants"
  ON game_session_players FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM active_game_sessions
      WHERE host_user_id = auth.uid()
    )
    OR session_id IN (
      SELECT session_id FROM game_session_players
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions"
  ON game_session_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave sessions"
  ON game_session_players FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable Realtime on active_game_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE active_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_session_players;
