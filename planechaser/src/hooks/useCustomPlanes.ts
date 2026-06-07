'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserCustomPlanes,
  getPublicCustomPlanes,
  getCustomPlane,
  createCustomPlane,
  updateCustomPlane,
  deleteCustomPlane,
} from '@/lib/custom-planes/queries'
import { uploadPlaneImage, deletePlaneImage } from '@/lib/custom-planes/storage'
import type { CustomPlaneInput } from '@/lib/custom-planes/types'
import { useAppStore } from '@/store/app-store'

export function useCustomPlanes() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['custom-planes', user?.id],
    queryFn: () => getUserCustomPlanes(user!.id),
    enabled: !!user,
  })
}

export function usePublicCustomPlanes() {
  return useQuery({
    queryKey: ['custom-planes', 'public'],
    queryFn: () => getPublicCustomPlanes(),
  })
}

export function useCustomPlane(id: string | undefined) {
  return useQuery({
    queryKey: ['custom-plane', id],
    queryFn: () => getCustomPlane(id!),
    enabled: !!id,
  })
}

export function useCreateCustomPlane() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomPlaneInput) =>
      createCustomPlane(user!.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useUpdateCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; input: Partial<CustomPlaneInput> }) =>
      updateCustomPlane(params.id, params.input),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['custom-plane', vars.id] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useDeleteCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; imagePath: string | null }) => {
      if (params.imagePath) {
        await deletePlaneImage(params.imagePath)
      }
      await deleteCustomPlane(params.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

export function useUploadPlaneImage() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (file: File) => uploadPlaneImage(user!.id, file),
  })
}
