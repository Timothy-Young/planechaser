-- Add turn_log JSONB to game_sessions for detailed turn-by-turn history
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS turn_log JSONB DEFAULT '[]'::jsonb;

-- Add players_snapshot to preserve player info at time of game
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS players_snapshot JSONB DEFAULT '[]'::jsonb;
