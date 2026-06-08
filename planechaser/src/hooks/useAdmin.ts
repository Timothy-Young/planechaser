'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppStats,
  getAdminUsers,
  updateUserRole,
  addStrike,
  banUser,
  unbanUser,
  getAdminFeedback,
  replyToFeedback,
  updateFeedbackStatus,
  getAdminCustomPlanes,
  adminDeleteCustomPlane,
} from '@/lib/admin/queries'
import type { UserRole } from '@/lib/admin/types'

const ADMIN_STALE = 30_000

export function useAppStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAppStats,
    staleTime: ADMIN_STALE,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
    staleTime: ADMIN_STALE,
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; role: UserRole }) =>
      updateUserRole(params.userId, params.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAddStrike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; currentStrikes: number }) =>
      addStrike(params.userId, params.currentStrikes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; reason: string }) =>
      banUser(params.userId, params.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAdminFeedback() {
  return useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: getAdminFeedback,
    staleTime: ADMIN_STALE,
  })
}

export function useReplyToFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { feedbackId: string; adminUserId: string; reply: string }) =>
      replyToFeedback(params.feedbackId, params.adminUserId, params.reply),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { feedbackId: string; status: 'new' | 'read' | 'replied' | 'resolved' }) =>
      updateFeedbackStatus(params.feedbackId, params.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}

export function useAdminCustomPlanes() {
  return useQuery({
    queryKey: ['admin', 'custom-planes'],
    queryFn: getAdminCustomPlanes,
    staleTime: ADMIN_STALE,
  })
}

export function useAdminDeleteCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planeId: string) => adminDeleteCustomPlane(planeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}
