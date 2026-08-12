'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import {
  formatCooldown,
  mergePenalty,
  remainingCooldownMs,
  type PenaltySnapshot,
} from '@/lib/moderation/decide'
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
  /**
   * Records a penalty the server just reported on a rejected submission.
   *
   * The profile query is the source of truth, but it only runs once the client
   * store has a user, and a refetch after a rejection can still lose the race
   * with the write. Seeding from the response means the banner and the disabled
   * button appear as soon as the submission comes back, whatever the query is
   * doing. Only ever tightens — see mergePenalty.
   */
  applyPenalty: (penalty: Partial<PenaltySnapshot>) => void
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

  const [seeded, setSeeded] = useState<PenaltySnapshot>({
    ackRequired: false,
    cooldownUntil: null,
  })

  const penalty = mergePenalty(data, seeded)
  const cooldownUntil = penalty.cooldownUntil
  const hasCandidate = !!cooldownUntil
  const now = useMinuteTick(hasCandidate)
  const remaining = cooldownUntil ? remainingCooldownMs(cooldownUntil, new Date(now)) : 0
  const cooldownActive = remaining > 0

  // Once the cooldown lapses, drop the cached row so the banner disappears
  // without the user having to reload. A spent seed is left in place rather
  // than cleared — it is already inert, and clearing it from here would only
  // add a cascading render.
  useEffect(() => {
    if (hasCandidate && !cooldownActive) {
      void queryClient.invalidateQueries({ queryKey: ['moderation-status'] })
    }
  }, [hasCandidate, cooldownActive, queryClient])

  const applyPenalty = useCallback((update: Partial<PenaltySnapshot>) => {
    setSeeded((prev) =>
      mergePenalty(prev, {
        ackRequired: update.ackRequired ?? false,
        cooldownUntil: update.cooldownUntil ?? null,
      }),
    )
  }, [])

  return {
    ackRequired: penalty.ackRequired,
    cooldownUntil,
    cooldownActive,
    cooldownLabel: cooldownActive && cooldownUntil ? formatCooldown(cooldownUntil, new Date(now)) : '',
    isLoading,
    refetch: () => {
      void refetch()
    },
    applyPenalty,
  }
}
