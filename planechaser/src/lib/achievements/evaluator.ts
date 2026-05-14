import type { ACHIEVEMENTS } from './definitions'

type AchievementKey = (typeof ACHIEVEMENTS)[number]['key']

interface UserStats {
  planes_conquered: number
  games_played: number
  total_rolls: number
  planeswalk_rolls: number
  total_planes_visited: number
  archenemy_games: number
}

interface SessionContext {
  planesVisited: number
  dieRolls: number
  chaosRolls: number
  planeswalkRolls: number
  playerCount: number
  isArchenemy: boolean
}

export function evaluateAchievements(
  stats: UserStats,
  session: SessionContext,
  alreadyEarned: Set<string>,
): string[] {
  const newlyEarned: string[] = []

  function check(key: string, condition: boolean) {
    if (!alreadyEarned.has(key) && condition) {
      newlyEarned.push(key)
    }
  }

  // Plane visit milestones (cumulative)
  check('first_steps', stats.total_planes_visited >= 1)
  check('wanderer', stats.total_planes_visited >= 10)
  check('planeswalker', stats.total_planes_visited >= 50)
  check('multiverse_tourist', stats.total_planes_visited >= 100)

  // Game milestones (cumulative)
  check('rookie', stats.games_played >= 1)
  check('veteran', stats.games_played >= 10)
  check('commander', stats.games_played >= 25)
  check('legendary', stats.games_played >= 50)

  // Die roll milestones (cumulative)
  check('lucky_roll', stats.total_rolls >= 10)
  check('dice_master', stats.total_rolls >= 100)
  check('chaos_agent', session.chaosRolls >= 1 && stats.total_rolls >= 10)
  check('planeswalk_pro', stats.planeswalk_rolls >= 10)

  // Conquest milestones (cumulative)
  check('first_conquest', stats.planes_conquered >= 1)
  check('conqueror', stats.planes_conquered >= 5)
  check('dominator', stats.planes_conquered >= 15)
  check('overlord', stats.planes_conquered >= 25)

  // Archenemy milestones (cumulative)
  check('villain_origin', stats.archenemy_games >= 1)
  check('supervillain', stats.archenemy_games >= 5)

  // Session-specific achievements
  check('full_house', session.playerCount >= 5)
  check('marathon', session.planesVisited >= 20)
  check('speed_run', session.dieRolls > 0 && session.dieRolls < 5)
  check('ten_streak', session.dieRolls >= 10)

  // Re-check chaos_agent with cumulative chaos count from stats
  // We compute cumulative chaos in the stats query, but for now use session data
  // The chaos_agent badge triggers when you've triggered chaos 10+ times total
  // Since we don't track cumulative chaos in stats yet, use a simpler check

  return newlyEarned
}
