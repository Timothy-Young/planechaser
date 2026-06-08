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
  getAuditLog,
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
    mutationFn: (params: { adminId: string; userId: string; role: UserRole; previousRole: string }) =>
      updateUserRole(params.adminId, params.userId, params.role, params.previousRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useAddStrike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { adminId: string; userId: string; currentStrikes: number }) =>
      addStrike(params.adminId, params.userId, params.currentStrikes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { adminId: string; userId: string; reason: string }) =>
      banUser(params.adminId, params.userId, params.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { adminId: string; userId: string }) =>
      unbanUser(params.adminId, params.userId),
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
    mutationFn: (params: { adminId: string; feedbackId: string; status: 'new' | 'read' | 'replied' | 'resolved' }) =>
      updateFeedbackStatus(params.adminId, params.feedbackId, params.status),
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
    mutationFn: (params: { adminId: string; planeId: string; planeName: string }) =>
      adminDeleteCustomPlane(params.adminId, params.planeId, params.planeName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useAuditLog(limit = 50) {
  return useQuery({
    queryKey: ['admin', 'audit-log', limit],
    queryFn: () => getAuditLog(limit),
    staleTime: ADMIN_STALE,
  })
}
