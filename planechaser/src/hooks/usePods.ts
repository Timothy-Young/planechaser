'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserPods,
  createPod,
  joinPodByCode,
  leavePod,
  getPodMembers,
  getPodLeaderboard,
  conquerPlane,
  getUserConquests,
  getUserStats,
  stealConqueredPlane,
} from '@/lib/pods/queries'
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
    mutationFn: (name: string) => createPod(name, user!.id),
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

export function useConquerPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      userId: string
      podId: string
      plane: { id: string; name: string; image_uri: string }
      gameSessionId?: string
    }) => conquerPlane(params.userId, params.podId, params.plane, params.gameSessionId),
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
