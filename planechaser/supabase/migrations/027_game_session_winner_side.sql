-- Standalone Archenemy games record which side won.
--
-- `win_condition` cannot carry this. Migration 025's `grant_session_achievements`
-- counts rows where `win_condition = 'archenemy'` to mean "an Archenemy game was
-- played" when awarding villain_origin and supervillain. Overloading that column
-- with an outcome would silently break both badges.
--
-- Nullable and unconstrained by default: every game recorded before this, and
-- every Planechase game after it, simply has no winning side.

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS winner_side TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_sessions_winner_side_check'
  ) THEN
    ALTER TABLE game_sessions
      ADD CONSTRAINT game_sessions_winner_side_check
      CHECK (winner_side IS NULL OR winner_side IN ('archenemy', 'team'));
  END IF;
END $$;
