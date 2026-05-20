'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserPods,
  createPod,
  joinPodByCode,
  leavePod,
  updatePod,
  getPodMembers,
  getPodLeaderboard,
  conquerPlane,
  getUserConquests,
  getUserStats,
  stealConqueredPlane,
  deleteConqueredPlane,
  updateLastArchenemy,
  recordGameSession,
  getGameSessions,
  getGameSession,
  getPlaneVisitHistory,
  getUserProfile,
  updateUserProfile,
  removePodMember,
  deletePod,
  regenerateInviteCode,
  searchProfiles,
  findProfileByFriendCode,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getFriendRequests,
  getFriends,
  getUserFriendCode,
} from '@/lib/pods/queries'
import type { TurnRecord } from '@/lib/game/types'
import { useAppStore } from '@/store/app-store'

export function useUserPods() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['pods', user?.id],
    queryFn: () => getUserPods(user!.id),
    enabled: !!user,
  })
}

export function usePodMembers(podId: string | undefined) {
  return useQuery({
    queryKey: ['pod-members', podId],
    queryFn: () => getPodMembers(podId!),
    enabled: !!podId,
  })
}

export function usePodLeaderboard(podId: string | undefined, threshold: number) {
  return useQuery({
    queryKey: ['pod-leaderboard', podId],
    queryFn: () => getPodLeaderboard(podId!, threshold),
    enabled: !!podId,
    refetchInterval: 30_000,
  })
}

export function useUserConquests(podId?: string) {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['conquests', user?.id, podId],
    queryFn: () => getUserConquests(user!.id, podId),
    enabled: !!user,
  })
}

export function useUserStats() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => getUserStats(user!.id),
    enabled: !!user,
  })
}

export function useCreatePod() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; maxPlayers?: number }) =>
      createPod(params.name, user!.id, params.maxPlayers),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

export function useJoinPod() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => joinPodByCode(inviteCode, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

export function useLeavePod() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (podId: string) => leavePod(podId, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

export function useUpdatePod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { podId: string; updates: { name?: string; archenemy_threshold?: number; max_players?: number } }) =>
      updatePod(params.podId, params.updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
    },
  })
}

export function useConquerPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      userId: string
      podId: string
      plane: { id: string; name: string; image_uri: string }
      gameSessionId?: string
      conqueredFromUserId?: string
    }) => conquerPlane(params.userId, params.podId, params.plane, params.gameSessionId, params.conqueredFromUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conquests'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}

export function useStealPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { conquestId: string; newOwnerId: string; podId: string }) =>
      stealConqueredPlane(params.conquestId, params.newOwnerId, params.podId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conquests'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}

export function useDeleteConqueredPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conquestId: string) => deleteConqueredPlane(conquestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conquests'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}

export function useUpdateLastArchenemy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { podId: string; userId: string }) =>
      updateLastArchenemy(params.podId, params.userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] })
    },
  })
}

export function useRecordGameSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      hostUserId: string
      planesVisited: string[]
      dieRollHistory: { result: string; timestamp: number }[]
      isArchenemy: boolean
      podId?: string
      turnLog?: TurnRecord[]
      players?: { id: string; display_name: string }[]
    }) => recordGameSession(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-stats'] })
      qc.invalidateQueries({ queryKey: ['visit-history'] })
      qc.invalidateQueries({ queryKey: ['game-sessions'] })
    },
  })
}

export function useGameSessions() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['game-sessions', user?.id],
    queryFn: () => getGameSessions(user!.id),
    enabled: !!user,
  })
}

export function useGameSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['game-session', sessionId],
    queryFn: () => getGameSession(sessionId!),
    enabled: !!sessionId,
  })
}

export function usePlaneVisitHistory() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['visit-history', user?.id],
    queryFn: () => getPlaneVisitHistory(user!.id),
    enabled: !!user,
  })
}

export function useUserProfile() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { display_name?: string; avatar_url?: string }) =>
      updateUserProfile(user!.id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// --- Pod Management ---

export function useRemovePodMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { podId: string; userId: string }) =>
      removePodMember(params.podId, params.userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pod-members'] })
      qc.invalidateQueries({ queryKey: ['pod-leaderboard'] })
    },
  })
}

export function useDeletePod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (podId: string) => deletePod(podId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

export function useRegenerateInviteCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (podId: string) => regenerateInviteCode(podId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

// --- Friends ---

export function useFriends() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => getFriends(user!.id),
    enabled: !!user,
  })
}

export function useFriendRequests() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: () => getFriendRequests(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })
}

export function useFriendCode() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['friend-code', user?.id],
    queryFn: () => getUserFriendCode(user!.id),
    enabled: !!user,
  })
}

export function useSendFriendRequest() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (toUserId: string) => sendFriendRequest(user!.id, toUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friend-requests'] }),
  })
}

export function useRespondToFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { requestId: string; status: 'accepted' | 'declined' }) =>
      respondToFriendRequest(params.requestId, params.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => removeFriend(requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useSearchProfiles() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (query: string) => searchProfiles(query, user!.id),
  })
}

export function useFindByFriendCode() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (code: string) => findProfileByFriendCode(code, user!.id),
  })
}
