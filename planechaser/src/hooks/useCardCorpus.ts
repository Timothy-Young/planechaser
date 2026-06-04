'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PlaneCard, SchemeCard } from '@/lib/game/types'
import type { ChaosEffectType } from '@/lib/cards/effect-classifier'
import { useCustomPlanes } from '@/hooks/useCustomPlanes'
import type { CustomPlane } from '@/lib/custom-planes/types'
import { getImageUrl } from '@/lib/custom-planes/storage'

export interface CardApiRow {
  id: string
  name: string
  type_line: string
  card_type: 'plane' | 'phenomenon' | 'scheme'
  oracle_text: string
  flavor_text: string | null
  set_code: string
  set_name: string
  image_uris: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  chaos_effect_type: ChaosEffectType
  chaos_effect_config: Record<string, unknown> | null
  is_ongoing: boolean
}

function toPlaneCard(row: CardApiRow): PlaneCard {
  return {
    id: row.id,
    name: row.name,
    type_line: row.type_line,
    card_type: row.card_type as 'plane' | 'phenomenon',
    oracle_text: row.oracle_text,
    flavor_text: row.flavor_text ?? undefined,
    image_uris: row.image_uris,
    set_name: row.set_name,
    set: row.set_code,
    chaos_effect_type: row.chaos_effect_type,
    chaos_effect_config: row.chaos_effect_config,
  }
}

function toSchemeCard(row: CardApiRow): SchemeCard {
  return {
    id: row.id,
    name: row.name,
    type_line: row.type_line,
    oracle_text: row.oracle_text,
    flavor_text: row.flavor_text ?? undefined,
    image_uris: row.image_uris,
    set_name: row.set_name,
    set: row.set_code,
    isOngoing: row.is_ongoing,
  }
}

const ONE_HOUR = 60 * 60 * 1000

export function usePlaneCorpus() {
  return useQuery<PlaneCard[]>({
    queryKey: ['card-corpus', 'planes'],
    queryFn: async () => {
      const res = await fetch('/api/cards?type=planes')
      if (!res.ok) throw new Error('Cards unavailable')
      const rows: CardApiRow[] = await res.json()
      return rows.map(toPlaneCard)
    },
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR,
    retry: 2,
  })
}

export function useSchemeCorpus() {
  return useQuery<SchemeCard[]>({
    queryKey: ['card-corpus', 'schemes'],
    queryFn: async () => {
      const res = await fetch('/api/cards?type=schemes')
      if (!res.ok) throw new Error('Cards unavailable')
      const rows: CardApiRow[] = await res.json()
      return rows.map(toSchemeCard)
    },
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR,
    retry: 2,
  })
}

function customToPlaneCard(custom: CustomPlane): PlaneCard {
  const oracleText = custom.chaos_text
    ? `${custom.oracle_text}\n\nWhenever you roll {CHAOS}, ${custom.chaos_text}`
    : custom.oracle_text

  const imageUrl = custom.image_path
    ? getImageUrl(custom.image_path)
    : ''

  return {
    id: `custom-${custom.id}`,
    name: custom.name,
    type_line: custom.type_line,
    card_type: 'plane',
    oracle_text: oracleText,
    flavor_text: custom.flavor_text ?? undefined,
    image_uris: {
      normal: imageUrl,
      large: imageUrl,
      art_crop: imageUrl,
      border_crop: imageUrl,
      small: imageUrl,
      png: imageUrl,
    },
    set_name: 'Custom',
    set: 'custom',
    chaos_effect_type: 'standard',
    chaos_effect_config: null,
  }
}

export function useFullPlaneCorpus() {
  const { data: scryfall, isLoading: scryfallLoading } = usePlaneCorpus()
  const { data: custom, isLoading: customLoading } = useCustomPlanes()

  const merged = useMemo(() => {
    if (!scryfall) return undefined
    const customCards = (custom ?? []).map(customToPlaneCard)
    return [...scryfall, ...customCards]
  }, [scryfall, custom])

  return {
    data: merged,
    isLoading: scryfallLoading || customLoading,
  }
}
