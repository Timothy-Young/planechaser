'use client'

import { useQuery } from '@tanstack/react-query'
import type { PlaneCorpusCard } from '@/lib/scryfall/types'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export function usePlaneCorpus() {
  return useQuery<PlaneCorpusCard[]>({
    queryKey: ['plane-corpus'],
    queryFn: async () => {
      const res = await fetch('/api/scryfall/planes')
      if (!res.ok) throw new Error('Scryfall unavailable')
      return res.json()
    },
    staleTime: THIRTY_DAYS,
    gcTime: THIRTY_DAYS,
    retry: 2,
  })
}
