-- 033: Multiplayer session game configuration + host-added players (2026-08-10)
--
-- Two problems this addresses.
--
-- 1. Configuration was lost between setup and the lobby. active_game_sessions
--    already carried game_type, but setup never passed it and the lobby
--    hardcoded 'planechase', so creating a multiplayer game from an Archenemy
--    setup silently produced a Planechase game. There was also nowhere to keep
--    the chosen scheme deck or the designated archenemy.
--
-- 2. A host could not add players directly. game_session_players only allowed
--    inserting your own row, so the sole no-pod route was sharing a join code.
--    Playing with specific people meant creating a pod first.

-- ============================================================
-- 1. 'both' is a real game type.
--    Setup has offered Planechase / Archenemy / Both since the standalone
--    archenemy work, but the column only ever accepted two of the three.
-- ============================================================
ALTER TABLE public.active_game_sessions
  DROP CONSTRAINT IF EXISTS active_game_sessions_game_type_check;
ALTER TABLE public.active_game_sessions
  ADD CONSTRAINT active_game_sessions_game_type_check
  CHECK (game_type IN ('planechase', 'archenemy', 'both'));

-- ============================================================
-- 2. Carry the rest of the setup configuration.
--
--    archenemy_user_id is deliberately nullable and set later: the host picks
--    the archenemy in the lobby, once real players have actually joined. It
--    cannot be chosen at setup time, when the roster is still placeholders.
-- ============================================================
ALTER TABLE public.active_game_sessions
  ADD COLUMN IF NOT EXISTS scheme_deck_id UUID
    REFERENCES public.user_scheme_decks(id) ON DELETE SET NULL;

ALTER TABLE public.active_game_sessions
  ADD COLUMN IF NOT EXISTS archenemy_user_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Let the host add players directly, no pod and no join code.
--
--    Shaped after the pod_members policy from 012 ("Users can join pods or
--    owners can add members"): either you are adding yourself, or you own the
--    thing being joined.
--
--    Narrower than the pod version in one way — restricted to sessions still
--    in 'lobby' status, so nobody can be dropped into a game already running.
--    Anyone added can still remove themselves; the existing DELETE policy
--    (user_id = auth.uid()) is untouched.
-- ============================================================
DROP POLICY IF EXISTS "Users can join sessions" ON public.game_session_players;
CREATE POLICY "Users can join sessions or hosts can add players"
  ON public.game_session_players FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.active_game_sessions s
      WHERE s.id = game_session_players.session_id
        AND s.host_user_id = auth.uid()
        AND s.status = 'lobby'
    )
  );

-- Symmetric removal: a host who adds the wrong person must be able to undo it.
DROP POLICY IF EXISTS "Hosts can remove players from their lobby" ON public.game_session_players;
CREATE POLICY "Hosts can remove players from their lobby"
  ON public.game_session_players FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.active_game_sessions s
      WHERE s.id = game_session_players.session_id
        AND s.host_user_id = auth.uid()
        AND s.status = 'lobby'
    )
  );

-- ============================================================
-- 4. Index backing the host lookups above.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_active_game_sessions_host_status
  ON public.active_game_sessions (host_user_id, status);
