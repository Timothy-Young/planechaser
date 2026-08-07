'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAppLimits, getCustomPlaneCount, getFeedbackUsage } from '@/lib/limits/queries'
import { DEFAULT_LIMITS, LIMIT_EXEMPT_ROLES, type AppLimits } from '@/lib/limits/types'
import { useAppStore } from '@/store/app-store'

const LIMITS_STALE = 5 * 60_000

/** Limits change rarely — cache them well past a page view. */
export function useAppLimits() {
  return useQuery({
    queryKey: ['app-limits'],
    queryFn: getAppLimits,
    staleTime: LIMITS_STALE,
  })
}

function useIsLimitExempt(): boolean {
  const userRole = useAppStore((s) => s.userRole)
  return userRole !== null && (LIMIT_EXEMPT_ROLES as readonly string[]).includes(userRole)
}

/** Re-renders once a second while `active`, so countdowns tick down. */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  return now
}

export interface FeedbackLimitStatus {
  limits: AppLimits
  /** Seconds left on the cooldown; 0 when clear. */
  cooldownRemaining: number
  /** Submissions still allowed in the rolling 24h window. */
  dailyRemaining: number
  atDailyLimit: boolean
  /** True when a submission would be rejected right now. */
  blocked: boolean
  exempt: boolean
  isLoading: boolean
  refetch: () => void
}

/**
 * Client-side preflight for the feedback limits. Advisory only — the migration
 * 026 triggers are the real gate, and the page still surfaces their errors.
 */
export function useFeedbackLimit(): FeedbackLimitStatus {
  const user = useAppStore((s) => s.user)
  const exempt = useIsLimitExempt()
  const { data: limits, isLoading: limitsLoading } = useAppLimits()

  const {
    data: usage,
    isLoading: usageLoading,
    refetch,
  } = useQuery({
    queryKey: ['feedback-usage', user?.id],
    queryFn: () => getFeedbackUsage(user!.id),
    enabled: !!user && !exempt,
  })

  const effectiveLimits = limits ?? DEFAULT_LIMITS

  // Only tick while a cooldown could still be running.
  const hasCooldownCandidate = !exempt && !!usage?.lastSubmittedAt
  const now = useTick(hasCooldownCandidate)

  let cooldownRemaining = 0
  if (hasCooldownCandidate) {
    const elapsedMs = now - new Date(usage!.lastSubmittedAt!).getTime()
    const remainingMs = effectiveLimits.feedbackCooldownSeconds * 1000 - elapsedMs
    cooldownRemaining = remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0
  }

  const countLast24h = usage?.countLast24h ?? 0
  const dailyRemaining = Math.max(0, effectiveLimits.feedbackDailyMax - countLast24h)
  const atDailyLimit = !exempt && dailyRemaining === 0 && !!usage

  return {
    limits: effectiveLimits,
    cooldownRemaining: exempt ? 0 : cooldownRemaining,
    dailyRemaining,
    atDailyLimit,
    blocked: !exempt && (cooldownRemaining > 0 || atDailyLimit),
    exempt,
    isLoading: limitsLoading || usageLoading,
    refetch: () => {
      void refetch()
    },
  }
}

export interface CustomPlaneLimitStatus {
  count: number
  max: number
  remaining: number
  atLimit: boolean
  exempt: boolean
  isLoading: boolean
  /** False when signed out or exempt — nothing meaningful to display. */
  showUsage: boolean
}

/** Client-side preflight for the custom plane cap. Advisory only. */
export function useCustomPlaneLimit(): CustomPlaneLimitStatus {
  const user = useAppStore((s) => s.user)
  const exempt = useIsLimitExempt()
  const { data: limits, isLoading: limitsLoading } = useAppLimits()

  const { data: count, isLoading: countLoading } = useQuery({
    queryKey: ['custom-plane-count', user?.id],
    queryFn: () => getCustomPlaneCount(user!.id),
    enabled: !!user && !exempt,
  })

  const max = limits?.customPlanesMax ?? DEFAULT_LIMITS.customPlanesMax
  const owned = count ?? 0

  return {
    count: owned,
    max,
    remaining: Math.max(0, max - owned),
    atLimit: !exempt && count !== undefined && owned >= max,
    exempt,
    isLoading: limitsLoading || countLoading,
    showUsage: !!user && !exempt && count !== undefined,
  }
}
