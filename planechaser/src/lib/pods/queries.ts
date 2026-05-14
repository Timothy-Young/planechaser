import { createClient } from '@/lib/supabase/client'
import type { Pod, PodMember, ConqueredPlane, LeaderboardEntry } from './types'

function supabase() {
  return createClient()
}

// --- Pods ---

export async function createPod(name: string, userId: string): Promise<Pod> {
  const { data, error } = await supabase()
    .from('pods')
    .insert({ name, created_by: userId })
    .select()
    .single()

  if (error) throw error

  await supabase()
    .from('pod_members')
    .insert({ pod_id: data.id, user_id: userId, role: 'owner' })

  return data as Pod
}

export async function joinPodByCode(inviteCode: string, userId: string): Promise<Pod> {
  const { data: pod, error: findError } = await supabase()
    .from('pods')
    .select()
    .eq('invite_code', inviteCode)
    .single()

  if (findError || !pod) throw new Error('Pod not found')

  const { error: joinError } = await supabase()
    .from('pod_members')
    .insert({ pod_id: pod.id, user_id: userId, role: 'member' })

  if (joinError) {
    if (joinError.code === '23505') throw new Error('Already a member')
    throw joinError
  }

  return pod as Pod
}

export async function leavePod(podId: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from('pod_members')
    .delete()
    .eq('pod_id', podId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function getUserPods(userId: string): Promise<Pod[]> {
  const { data, error } = await supabase()
    .from('pod_members')
    .select('pod_id, pods(*)')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => row.pods as Pod)
}

export async function getPodMembers(podId: string): Promise<PodMember[]> {
  const { data, error } = await supabase()
    .from('pod_members')
    .select('*, profiles(display_name)')
    .eq('pod_id', podId)

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: row.profiles as { display_name: string } | undefined,
  })) as PodMember[]
}

// --- Conquest ---

export async function conquerPlane(
  userId: string,
  podId: string,
  plane: { id: string; name: string; image_uri: string },
  gameSessionId?: string,
): Promise<ConqueredPlane> {
  const { data, error } = await supabase()
    .from('conquered_planes')
    .insert({
      user_id: userId,
      pod_id: podId,
      plane_scryfall_id: plane.id,
      plane_name: plane.name,
      plane_image_uri: plane.image_uri,
      game_session_id: gameSessionId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ConqueredPlane
}

export async function getUserConquests(userId: string, podId?: string): Promise<ConqueredPlane[]> {
  let query = supabase()
    .from('conquered_planes')
    .select()
    .eq('user_id', userId)
    .order('conquered_at', { ascending: false })

  if (podId) query = query.eq('pod_id', podId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ConqueredPlane[]
}

// --- Leaderboard ---

export async function getPodLeaderboard(podId: string, threshold: number): Promise<LeaderboardEntry[]> {
  const { data: members, error: membersError } = await supabase()
    .from('pod_members')
    .select('user_id, profiles(display_name)')
    .eq('pod_id', podId)

  if (membersError) throw membersError

  const { data: conquests, error: conquestsError } = await supabase()
    .from('conquered_planes')
    .select('user_id')
    .eq('pod_id', podId)

  if (conquestsError) throw conquestsError

  const counts = new Map<string, number>()
  for (const c of conquests ?? []) {
    counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + 1)
  }

  return (members ?? [])
    .map((m: Record<string, unknown>) => {
      const count = counts.get(m.user_id as string) ?? 0
      const profile = m.profiles as { display_name: string } | null
      return {
        user_id: m.user_id as string,
        display_name: profile?.display_name ?? 'Unknown',
        conquered_count: count,
        is_archenemy: count >= threshold,
      }
    })
    .sort((a, b) => b.conquered_count - a.conquered_count)
}

// --- Dethrone ---

export async function stealConqueredPlane(
  conquestId: string,
  newOwnerId: string,
  podId: string,
): Promise<void> {
  const { data: original, error: fetchError } = await supabase()
    .from('conquered_planes')
    .select()
    .eq('id', conquestId)
    .single()

  if (fetchError || !original) throw new Error('Conquest not found')

  await supabase()
    .from('conquered_planes')
    .insert({
      user_id: newOwnerId,
      pod_id: podId,
      plane_scryfall_id: original.plane_scryfall_id,
      plane_name: original.plane_name,
      plane_image_uri: original.plane_image_uri,
      game_session_id: null,
    })

  await supabase()
    .from('conquered_planes')
    .delete()
    .eq('id', conquestId)
}

// --- Game Sessions ---

export async function recordGameSession(params: {
  hostUserId: string
  planesVisited: string[]
  dieRollHistory: { result: string; timestamp: number }[]
  isArchenemy: boolean
  podId?: string
}) {
  const { error } = await supabase()
    .from('game_sessions')
    .insert({
      host_user_id: params.hostUserId,
      planes_visited: params.planesVisited,
      die_roll_history: params.dieRollHistory,
      win_condition: params.isArchenemy ? 'archenemy' : 'normal',
      pod_id: params.podId ?? null,
    })

  if (error) throw error
}

// --- Stats ---

export async function getUserStats(userId: string) {
  const { data: conquests } = await supabase()
    .from('conquered_planes')
    .select('id')
    .eq('user_id', userId)

  const { data: sessions } = await supabase()
    .from('game_sessions')
    .select('die_roll_history, win_condition, planes_visited')
    .eq('host_user_id', userId)

  let totalRolls = 0
  let planeswalkRolls = 0
  let totalPlanesVisited = 0
  let archenemyGames = 0

  for (const s of sessions ?? []) {
    const history = s.die_roll_history as { result: string }[]
    totalRolls += history.length
    planeswalkRolls += history.filter((r) => r.result === 'planeswalk').length
    totalPlanesVisited += (s.planes_visited as string[]).length
    if (s.win_condition === 'archenemy') archenemyGames++
  }

  return {
    planes_conquered: conquests?.length ?? 0,
    games_played: sessions?.length ?? 0,
    total_rolls: totalRolls,
    planeswalk_rolls: planeswalkRolls,
    total_planes_visited: totalPlanesVisited,
    archenemy_games: archenemyGames,
  }
}

export async function getPlaneVisitHistory(userId: string) {
  const { data: sessions } = await supabase()
    .from('game_sessions')
    .select('planes_visited, started_at')
    .eq('host_user_id', userId)
    .order('started_at', { ascending: false })

  const visits: { planeName: string; sessionDate: string }[] = []
  for (const s of sessions ?? []) {
    const planes = s.planes_visited as string[]
    for (const name of planes) {
      visits.push({ planeName: name, sessionDate: s.started_at as string })
    }
  }
  return visits
}
