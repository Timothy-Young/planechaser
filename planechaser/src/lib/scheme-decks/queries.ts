import { createClient } from '@/lib/supabase/client'
import type { UserSchemeDeck } from './types'

function supabase() {
  return createClient()
}

export async function getUserSchemeDecks(userId: string): Promise<UserSchemeDeck[]> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as UserSchemeDeck[]
}

export async function getSchemeDeck(deckId: string): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function createSchemeDeck(
  userId: string,
  name: string,
  schemeIds: string[],
  isDefault = false,
): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .insert({ user_id: userId, name, scheme_ids: schemeIds, is_default: isDefault })
    .select()
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function updateSchemeDeck(
  deckId: string,
  updates: { name?: string; scheme_ids?: string[] },
): Promise<UserSchemeDeck> {
  const { data, error } = await supabase()
    .from('user_scheme_decks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .select()
    .single()

  if (error) throw error
  return data as UserSchemeDeck
}

export async function deleteSchemeDeck(deckId: string): Promise<void> {
  const { error } = await supabase()
    .from('user_scheme_decks')
    .delete()
    .eq('id', deckId)

  if (error) throw error
}

export async function createDefaultSchemeDeck(
  userId: string,
  allSchemeIds: string[],
): Promise<UserSchemeDeck> {
  const shuffled = [...allSchemeIds].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 20)
  return createSchemeDeck(userId, 'Default Scheme Deck', selected, true)
}
