'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { formatCooldown, remainingCooldownMs } from '@/lib/moderation/decide'
import { useAppStore } from '@/store/app-store'

export interface ModerationStatus {
  /** True once the user has had a plane blocked; sticky for the account's life. */
  ackRequired: boolean
  /** ISO timestamp while a violation cooldown is running, else null. */
  cooldownUntil: string | null
  cooldownActive: boolean
  /** "4h 12m" — empty when no cooldown is running. */
  cooldownLabel: string
  isLoading: boolean
  refetch: () => void
}

async function fetchStatus(userId: string) {
  const { data, error } = await createClient()
    .from('profiles')
    .select('nsfw_ack_required, custom_plane_cooldown_until')
    .eq('id', userId)
    .single()

  if (error) throw error
  return {
    ackRequired: Boolean(data.nsfw_ack_required),
    cooldownUntil: (data.custom_plane_cooldown_until as string | null) ?? null,
  }
}

/** Re-renders once a minute while a cooldown is running so the label ticks down. */
function useMinuteTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [active])

  return now
}

export function useModerationStatus(): ModerationStatus {
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['moderation-status', user?.id],
    queryFn: () => fetchStatus(user!.id),
    enabled: !!user,
  })

  const cooldownUntil = data?.cooldownUntil ?? null
  const hasCandidate = !!cooldownUntil
  const now = useMinuteTick(hasCandidate)
  const remaining = cooldownUntil ? remainingCooldownMs(cooldownUntil, new Date(now)) : 0
  const cooldownActive = remaining > 0

  // Once the cooldown lapses, drop the cached row so the banner disappears
  // without the user having to reload.
  useEffect(() => {
    if (hasCandidate && !cooldownActive) {
      void queryClient.invalidateQueries({ queryKey: ['moderation-status'] })
    }
  }, [hasCandidate, cooldownActive, queryClient])

  return {
    ackRequired: data?.ackRequired ?? false,
    cooldownUntil,
    cooldownActive,
    cooldownLabel: cooldownActive && cooldownUntil ? formatCooldown(cooldownUntil, new Date(now)) : '',
    isLoading,
    refetch: () => {
      void refetch()
    },
  }
}
