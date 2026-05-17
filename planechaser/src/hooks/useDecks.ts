'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  createDefaultDeck,
} from '@/lib/decks/queries'
import { useAppStore } from '@/store/app-store'

export function useUserDecks() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => getUserDecks(user!.id),
    enabled: !!user,
  })
}

export function useDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => getDeck(deckId!),
    enabled: !!deckId,
  })
}

export function useCreateDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; planeIds: string[] }) =>
      createDeck(user!.id, params.name, params.planeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  })
}

export function useUpdateDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { deckId: string; updates: { name?: string; plane_ids?: string[] } }) =>
      updateDeck(params.deckId, params.updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['decks'] })
      qc.invalidateQueries({ queryKey: ['deck', vars.deckId] })
    },
  })
}

export function useDeleteDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  })
}

export function useCreateDefaultDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allPlaneIds: string[]) => createDefaultDeck(user!.id, allPlaneIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  })
}
