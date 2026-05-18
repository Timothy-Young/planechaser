import { createClient } from '@/lib/supabase/client'
import type { Pod, PodMember, ConqueredPlane, LeaderboardEntry } from './types'
import type { TurnRecord } from '@/lib/game/types'

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
    .select('*')
    .eq('pod_id', podId)

  if (error) throw error

  const userIds = (data ?? []).map((row: Record<string, unknown>) => row.user_id as string)

  const { data: profiles } = await supabase()
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [
      p.id as string,
      { display_name: p.display_name as string, avatar_url: p.avatar_url as string | null },
    ])
  )

  return (data ?? []).map((row) => ({
    ...(row as unknown as PodMember),
    profile: profileMap.get(row.user_id as string) ?? { display_name: 'Unknown', avatar_url: null },
  }))
}

// --- Conquest ---

export async function conquerPlane(
  userId: string,
  podId: string,
  plane: { id: string; name: string; image_uri: string },
  gameSessionId?: string,
  conqueredFromUserId?: string,
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
      conquered_from_user_id: conqueredFromUserId ?? null,
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

  const conquests = (data ?? []) as ConqueredPlane[]

  // Look up display names for provenance (non-null conquered_from_user_id)
  const fromUserIds = [
    ...new Set(
      conquests
        .map((c) => c.conquered_from_user_id)
        .filter((id): id is string => id !== null)
    ),
  ]

  if (fromUserIds.length === 0) return conquests

  const { data: profiles } = await supabase()
    .from('profiles')
    .select('id, display_name')
    .in('id', fromUserIds)

  const nameMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p.display_name as string])
  )

  return conquests.map((c) => ({
    ...c,
    conquered_from_name: c.conquered_from_user_id
      ? (nameMap.get(c.conquered_from_user_id) ?? 'Unknown')
      : undefined,
  }))
}

// --- Leaderboard ---

export async function getPodLeaderboard(podId: string, threshold: number): Promise<LeaderboardEntry[]> {
  const { data: members, error: membersError } = await supabase()
    .from('pod_members')
    .select('user_id')
    .eq('pod_id', podId)

  if (membersError) throw membersError

  const userIds = (members ?? []).map((m: Record<string, unknown>) => m.user_id as string)

  const { data: profiles } = await supabase()
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p.display_name as string])
  )

  const { data: conquests, error: conquestsError } = await supabase()
    .from('conquered_planes')
    .select('user_id')
    .eq('pod_id', podId)

  if (conquestsError) throw conquestsError

  const counts = new Map<string, number>()
  for (const c of conquests ?? []) {
    counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + 1)
  }

  return userIds
    .map((userId) => {
      const count = counts.get(userId) ?? 0
      return {
        user_id: userId,
        display_name: profileMap.get(userId) ?? 'Unknown',
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
      conquered_from_user_id: original.user_id,
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
  turnLog?: TurnRecord[]
  players?: { id: string; display_name: string }[]
}) {
  const { error } = await supabase()
    .from('game_sessions')
    .insert({
      host_user_id: params.hostUserId,
      planes_visited: params.planesVisited,
      die_roll_history: params.dieRollHistory,
      win_condition: params.isArchenemy ? 'archenemy' : 'normal',
      pod_id: params.podId ?? null,
      turn_log: params.turnLog ?? [],
      players_snapshot: params.players ?? [],
    })

  if (error) throw error
}

export async function getGameSessions(userId: string) {
  const { data, error } = await supabase()
    .from('game_sessions')
    .select('id, started_at, ended_at, win_condition, planes_visited, die_roll_history, players_snapshot, pod_id')
    .eq('host_user_id', userId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getGameSession(sessionId: string) {
  const { data, error } = await supabase()
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
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

// --- Profile ---

export interface UserProfile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as UserProfile
}

export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await supabase()
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}
