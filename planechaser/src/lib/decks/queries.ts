import { createClient } from '@/lib/supabase/client'
import type { UserDeck } from './types'

function supabase() {
  return createClient()
}

export async function getUserDecks(userId: string): Promise<UserDeck[]> {
  const { data, error } = await supabase()
    .from('user_decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as UserDeck[]
}

export async function getDeck(deckId: string): Promise<UserDeck> {
  const { data, error } = await supabase()
    .from('user_decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error) throw error
  return data as UserDeck
}

export async function createDeck(
  userId: string,
  name: string,
  planeIds: string[],
  isDefault = false,
): Promise<UserDeck> {
  const { data, error } = await supabase()
    .from('user_decks')
    .insert({ user_id: userId, name, plane_ids: planeIds, is_default: isDefault })
    .select()
    .single()

  if (error) throw error
  return data as UserDeck
}

export async function updateDeck(
  deckId: string,
  updates: { name?: string; plane_ids?: string[] },
): Promise<UserDeck> {
  const { data, error } = await supabase()
    .from('user_decks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .select()
    .single()

  if (error) throw error
  return data as UserDeck
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase()
    .from('user_decks')
    .delete()
    .eq('id', deckId)

  if (error) throw error
}

export async function createDefaultDeck(
  userId: string,
  allPlaneIds: string[],
): Promise<UserDeck> {
  const shuffled = [...allPlaneIds].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 10)
  return createDeck(userId, 'Default Deck', selected, true)
}
