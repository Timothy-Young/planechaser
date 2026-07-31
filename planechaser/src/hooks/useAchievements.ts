'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserAchievements, grantSessionAchievements } from '@/lib/achievements/queries'
import { useAppStore } from '@/store/app-store'

export function useUserAchievements() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => getUserAchievements(user!.id),
    enabled: !!user,
  })
}

/**
 * Evaluates and grants achievements for a completed game. Takes a session id,
 * not a list of keys — the server decides what was earned.
 */
export function useGrantSessionAchievements() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => grantSessionAchievements(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}
