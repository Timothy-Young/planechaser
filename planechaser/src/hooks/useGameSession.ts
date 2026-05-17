'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  createGameSession,
  joinGameSession,
  getSessionPlayers,
  updateSessionTurnOrder,
  startSession,
  syncGameState,
  endSession,
  getActiveSessionForUser,
} from '@/lib/game/session-queries'
import { subscribeToSession, subscribeToSessionPlayers } from '@/lib/game/session-sync'
import { useAppStore } from '@/store/app-store'
import type { GameState } from '@/lib/game/types'
import type { GameSession, GameType } from '@/lib/game/session-types'

export function useSessionPlayers(sessionId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['session-players', sessionId],
    queryFn: () => getSessionPlayers(sessionId!),
    enabled: !!sessionId,
    refetchInterval: false,
  })

  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSessionPlayers(sessionId, () => {
      queryClient.invalidateQueries({ queryKey: ['session-players', sessionId] })
    })
    return unsub
  }, [sessionId, queryClient])

  return query
}

export function useCreateSession() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (params: { podId?: string; gameType?: GameType }) =>
      createGameSession({
        hostUserId: user!.id,
        podId: params.podId,
        gameType: params.gameType,
      }),
  })
}

export function useJoinSession() {
  const user = useAppStore((s) => s.user)
  return useMutation({
    mutationFn: (sessionCode: string) =>
      joinGameSession({ sessionCode, userId: user!.id }),
  })
}

export function useStartSession() {
  return useMutation({
    mutationFn: (params: { sessionId: string; initialState: GameState; firstPlayerId: string }) =>
      startSession(params.sessionId, params.initialState, params.firstPlayerId),
  })
}

export function useSyncGameState() {
  return useMutation({
    mutationFn: (params: { sessionId: string; state: GameState; currentTurnUserId: string }) =>
      syncGameState(params.sessionId, params.state, params.currentTurnUserId),
  })
}

export function useEndSession() {
  return useMutation({
    mutationFn: (sessionId: string) => endSession(sessionId),
  })
}

export function useUpdateTurnOrder() {
  return useMutation({
    mutationFn: (params: { sessionId: string; turnOrder: string[] }) =>
      updateSessionTurnOrder(params.sessionId, params.turnOrder),
  })
}

export function useActiveSession() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['active-session', user?.id],
    queryFn: () => getActiveSessionForUser(user!.id),
    enabled: !!user,
  })
}

export function useSessionSubscription(
  sessionId: string | undefined,
  onUpdate: (session: GameSession) => void
) {
  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSession(sessionId, onUpdate)
    return unsub
  }, [sessionId, onUpdate])
}
