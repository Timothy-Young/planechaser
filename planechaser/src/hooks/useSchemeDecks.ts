'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserSchemeDecks,
  getSchemeDeck,
  createSchemeDeck,
  updateSchemeDeck,
  deleteSchemeDeck,
  createDefaultSchemeDeck,
} from '@/lib/scheme-decks/queries'
import { useAppStore } from '@/store/app-store'

export function useUserSchemeDecks() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ['scheme-decks', user?.id],
    queryFn: () => getUserSchemeDecks(user!.id),
    enabled: !!user,
  })
}

export function useSchemeDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['scheme-deck', deckId],
    queryFn: () => getSchemeDeck(deckId!),
    enabled: !!deckId,
  })
}

export function useCreateSchemeDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; schemeIds: string[] }) =>
      createSchemeDeck(user!.id, params.name, params.schemeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}

export function useUpdateSchemeDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { deckId: string; updates: { name?: string; scheme_ids?: string[] } }) =>
      updateSchemeDeck(params.deckId, params.updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['scheme-decks'] })
      qc.invalidateQueries({ queryKey: ['scheme-deck', vars.deckId] })
    },
  })
}

export function useDeleteSchemeDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deckId: string) => deleteSchemeDeck(deckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}

export function useCreateDefaultSchemeDeck() {
  const user = useAppStore((s) => s.user)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (allSchemeIds: string[]) => createDefaultSchemeDeck(user!.id, allSchemeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheme-decks'] }),
  })
}
