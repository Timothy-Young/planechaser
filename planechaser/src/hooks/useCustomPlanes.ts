'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserCustomPlanes,
  getPublicCustomPlanes,
  getCustomPlane,
  deleteCustomPlane,
} from '@/lib/custom-planes/queries'
import { deletePlaneImage } from '@/lib/custom-planes/storage'
import {
  requireUserId,
  submitNewPlane,
  submitPlaneUpdate,
  uploadPendingImage,
} from '@/lib/custom-planes/submit'
import type { CreatePlaneRequest, UpdatePlaneRequest } from '@/lib/moderation/contract'
import { useAppStore } from '@/store/app-store'

/**
 * Writes go through /api/custom-planes, never straight to PostgREST. The route
 * is where the NSFW scan and the penalty ladder live, and migration 031 revokes
 * the client's direct INSERT and UPDATE so this is the only path that works.
 */
export interface PlaneSubmission {
  file: File | null
  fields: Omit<CreatePlaneRequest, 'pending_image_path'>
}

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
    mutationFn: async ({ file, fields }: PlaneSubmission) => {
      const userId = await requireUserId(user?.id)
      const pending = file ? await uploadPendingImage(userId, file) : null
      return submitNewPlane({ ...fields, pending_image_path: pending })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['custom-plane-count'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
      qc.invalidateQueries({ queryKey: ['moderation-status'] })
    },
  })
}

export function useUpdateCustomPlane() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file,
      fields,
    }: {
      file: File | null
      fields: Omit<UpdatePlaneRequest, 'pending_image_path'>
    }) => {
      const userId = await requireUserId(user?.id)
      const pending = file ? await uploadPendingImage(userId, file) : null
      return submitPlaneUpdate({ ...fields, pending_image_path: pending })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['custom-planes'] })
      qc.invalidateQueries({ queryKey: ['custom-plane', vars.fields.id] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
      qc.invalidateQueries({ queryKey: ['moderation-status'] })
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
      qc.invalidateQueries({ queryKey: ['custom-plane-count'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}

