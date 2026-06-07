import { createClient } from '@/lib/supabase/server'

export interface CardRow {
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
  chaos_effect_type: string
  chaos_effect_config: Record<string, unknown> | null
  is_ongoing: boolean
  border_color: string
}

export async function fetchPlaneCards(): Promise<CardRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .in('card_type', ['plane', 'phenomenon'])
    .order('name')

  if (error) throw new Error(`Failed to fetch plane cards: ${error.message}`)
  return data as CardRow[]
}

export async function fetchSchemeCards(): Promise<CardRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_type', 'scheme')
    .order('name')

  if (error) throw new Error(`Failed to fetch scheme cards: ${error.message}`)
  return data as CardRow[]
}
