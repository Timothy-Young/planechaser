import { createClient } from '@/lib/supabase/client'
import type { CustomPlane, CustomPlaneInput } from './types'

function supabase() {
  return createClient()
}

export async function getUserCustomPlanes(userId: string): Promise<CustomPlane[]> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CustomPlane[]
}

export async function getCustomPlane(id: string): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function createCustomPlane(
  userId: string,
  input: CustomPlaneInput,
): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .insert({
      user_id: userId,
      name: input.name,
      type_line: input.type_line ?? 'Plane — Custom',
      oracle_text: input.oracle_text,
      chaos_text: input.chaos_text,
      flavor_text: input.flavor_text ?? null,
      image_path: input.image_path ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function updateCustomPlane(
  id: string,
  input: Partial<CustomPlaneInput>,
): Promise<CustomPlane> {
  const { data, error } = await supabase()
    .from('custom_planes')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as CustomPlane
}

export async function deleteCustomPlane(id: string): Promise<void> {
  const { error } = await supabase()
    .from('custom_planes')
    .delete()
    .eq('id', id)

  if (error) throw error
}
