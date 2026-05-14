'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserAchievements, grantAchievements } from '@/lib/achievements/queries'
import { useAppStore } from '@/store/app-store'

export function useUserAchievements() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => getUserAchievements(user!.id),
    enabled: !!user,
  })
}

export function useGrantAchievements() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; keys: string[] }) =>
      grantAchievements(params.userId, params.keys),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['achievements'] })
    },
  })
}
