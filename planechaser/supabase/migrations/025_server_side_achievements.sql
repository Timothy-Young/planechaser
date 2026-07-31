-- 025: Move achievement granting server-side (2026-07-31)
--
-- Before this migration the browser evaluated every achievement criterion and
-- INSERTed the results directly; RLS only checked `auth.uid() = user_id`, so
-- any authenticated user could POST themselves the whole badge set including
-- planar_dominion ("Conquer all 185 planes").
--
-- ACHV-02 called for server-side evaluation with anti-exploit guards. This
-- migration implements that: a SECURITY DEFINER function re-derives every
-- input from game_sessions + conquered_planes, applies player-count and
-- session-length guards to the session-scoped badges, and inserts only the
-- keys the caller has actually earned. The client can no longer name a key.
--
-- SCOPE NOTE — this closes direct badge injection, not badge farming. Rows in
-- game_sessions are still written by the client, so a determined user could
-- fabricate plausible game history and earn badges from it. Making
-- game_sessions itself trustworthy (deriving it from active_game_sessions
-- server-side) is tracked separately in
-- .planning/todos/pending/2026-07-31-game-sessions-rls-and-trust.md.

-- ============================================================
-- 1. The evaluator.
--    This is now the single source of truth for achievement criteria; the old
--    client-side src/lib/achievements/evaluator.ts was deleted rather than
--    left to drift. src/lib/achievements/definitions.ts still owns the
--    user-facing name/description/icon for each key — when adding a badge,
--    add it in both places.
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_session_achievements(p_session_id uuid)
RETURNS TABLE (granted_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user            uuid := auth.uid();
  v_session         public.game_sessions%ROWTYPE;

  -- This session only
  v_s_planes        int;
  v_s_rolls         int;
  v_s_players       int;
  v_s_duration      interval;
  v_session_ok      boolean;

  -- Lifetime, recomputed from source tables
  v_conquered       int;
  v_games           int;
  v_rolls           int;
  v_planeswalks     int;
  v_chaos           int;
  v_planes_visited  int;
  v_archenemy_games int;

  v_candidates      text[] := '{}';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'grant_session_achievements: not authenticated';
  END IF;

  SELECT * INTO v_session FROM public.game_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_session_achievements: session % not found', p_session_id;
  END IF;

  -- The caller must actually have played in the session they are claiming.
  IF v_session.host_user_id <> v_user
     AND NOT (
       v_session.players_snapshot
       @> jsonb_build_array(jsonb_build_object('id', v_user::text))
     )
  THEN
    RAISE EXCEPTION 'grant_session_achievements: caller did not play in session %',
      p_session_id;
  END IF;

  -- ---------- session-scoped inputs ----------
  v_s_planes := CASE
    WHEN jsonb_typeof(v_session.planes_visited) = 'array'
    THEN jsonb_array_length(v_session.planes_visited) ELSE 0 END;

  v_s_rolls := CASE
    WHEN jsonb_typeof(v_session.die_roll_history) = 'array'
    THEN jsonb_array_length(v_session.die_roll_history) ELSE 0 END;

  v_s_players := CASE
    WHEN jsonb_typeof(v_session.players_snapshot) = 'array'
    THEN jsonb_array_length(v_session.players_snapshot) ELSE 0 END;

  v_s_duration := v_session.ended_at - v_session.started_at;

  -- Anti-exploit guard for the "special" badges, which are the only ones a
  -- single fabricated session could otherwise mint: a real game has at least
  -- two players and takes more than a few minutes.
  v_session_ok := (v_s_players >= 2 AND v_s_duration >= interval '3 minutes');

  -- ---------- lifetime inputs ----------
  SELECT count(*) INTO v_conquered
  FROM public.conquered_planes WHERE user_id = v_user;

  WITH mine AS (
    SELECT gs.*
    FROM public.game_sessions gs
    WHERE gs.host_user_id = v_user
       OR gs.players_snapshot
          @> jsonb_build_array(jsonb_build_object('id', v_user::text))
  ),
  my_rolls AS (
    SELECT r->>'result' AS result
    FROM mine
    CROSS JOIN LATERAL jsonb_array_elements(mine.die_roll_history) AS r
    WHERE jsonb_typeof(mine.die_roll_history) = 'array'
  )
  SELECT
    (SELECT count(*) FROM mine),
    (SELECT coalesce(sum(CASE
        WHEN jsonb_typeof(planes_visited) = 'array'
        THEN jsonb_array_length(planes_visited) ELSE 0 END), 0) FROM mine),
    (SELECT count(*) FROM mine WHERE win_condition = 'archenemy'),
    (SELECT count(*) FROM my_rolls),
    (SELECT count(*) FROM my_rolls WHERE result = 'planeswalk'),
    (SELECT count(*) FROM my_rolls WHERE result = 'chaos')
  INTO
    v_games, v_planes_visited, v_archenemy_games, v_rolls, v_planeswalks, v_chaos;

  -- ---------- criteria ----------
  -- Plane visit milestones
  IF v_planes_visited >= 1   THEN v_candidates := v_candidates || 'first_steps'::text; END IF;
  IF v_planes_visited >= 10  THEN v_candidates := v_candidates || 'wanderer'::text; END IF;
  IF v_planes_visited >= 50  THEN v_candidates := v_candidates || 'planeswalker'::text; END IF;
  IF v_planes_visited >= 100 THEN v_candidates := v_candidates || 'multiverse_tourist'::text; END IF;

  -- Game milestones
  IF v_games >= 1  THEN v_candidates := v_candidates || 'rookie'::text; END IF;
  IF v_games >= 10 THEN v_candidates := v_candidates || 'veteran'::text; END IF;
  IF v_games >= 25 THEN v_candidates := v_candidates || 'commander'::text; END IF;
  IF v_games >= 50 THEN v_candidates := v_candidates || 'legendary'::text; END IF;

  -- Die roll milestones.
  -- chaos_agent now matches its own description ("Trigger chaos 10 times").
  -- The old client check was `session.chaosRolls >= 1 && total_rolls >= 10`,
  -- which its own inline comment flagged as a stand-in because cumulative
  -- chaos wasn't tracked. It is computable here, so use it.
  IF v_rolls >= 10        THEN v_candidates := v_candidates || 'lucky_roll'::text; END IF;
  IF v_rolls >= 100       THEN v_candidates := v_candidates || 'dice_master'::text; END IF;
  IF v_chaos >= 10        THEN v_candidates := v_candidates || 'chaos_agent'::text; END IF;
  IF v_planeswalks >= 10  THEN v_candidates := v_candidates || 'planeswalk_pro'::text; END IF;

  -- Conquest milestones
  IF v_conquered >= 1   THEN v_candidates := v_candidates || 'first_conquest'::text; END IF;
  IF v_conquered >= 5   THEN v_candidates := v_candidates || 'conqueror'::text; END IF;
  IF v_conquered >= 15  THEN v_candidates := v_candidates || 'dominator'::text; END IF;
  IF v_conquered >= 25  THEN v_candidates := v_candidates || 'overlord'::text; END IF;
  IF v_conquered >= 185 THEN v_candidates := v_candidates || 'planar_dominion'::text; END IF;

  -- Archenemy milestones
  IF v_archenemy_games >= 1 THEN v_candidates := v_candidates || 'villain_origin'::text; END IF;
  IF v_archenemy_games >= 5 THEN v_candidates := v_candidates || 'supervillain'::text; END IF;

  -- Session-scoped badges, gated on the guard above
  IF v_session_ok THEN
    IF v_s_players >= 5                  THEN v_candidates := v_candidates || 'full_house'::text; END IF;
    IF v_s_planes >= 20                  THEN v_candidates := v_candidates || 'marathon'::text; END IF;
    IF v_s_rolls > 0 AND v_s_rolls < 5   THEN v_candidates := v_candidates || 'speed_run'::text; END IF;
    IF v_s_rolls >= 10                   THEN v_candidates := v_candidates || 'ten_streak'::text; END IF;
  END IF;

  -- ---------- grant ----------
  -- ON CONFLICT DO NOTHING means RETURNING yields only the genuinely new
  -- badges, which is exactly what the UI wants to celebrate.
  RETURN QUERY
  INSERT INTO public.user_achievements AS ua (user_id, achievement_key)
  SELECT v_user, k FROM unnest(v_candidates) AS k
  ON CONFLICT (user_id, achievement_key) DO NOTHING
  RETURNING ua.achievement_key;
END;
$$;

COMMENT ON FUNCTION public.grant_session_achievements(uuid) IS
  'Server-side achievement evaluation (ACHV-02). Recomputes all criteria from '
  'game_sessions + conquered_planes; the caller cannot name a badge key.';

-- ============================================================
-- 2. Remove direct client INSERT into user_achievements.
--    The function above is SECURITY DEFINER and so bypasses RLS; no policy is
--    needed to replace this one. SELECT stays open to authenticated users
--    because profiles display each other's badges.
-- ============================================================
DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

-- ============================================================
-- 3. Execution grants.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.grant_session_achievements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_session_achievements(uuid) TO authenticated;
