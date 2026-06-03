import { createClient } from '@/lib/supabase/client'

export interface MapConquest {
  plane_scryfall_id: string
  plane_name: string
  user_id: string
  display_name: string
}

export async function getPodAllConquests(podId: string): Promise<MapConquest[]> {
  const supabase = createClient()

  // Get all conquests for this pod
  const { data: conquests, error: conquestsError } = await supabase
    .from('conquered_planes')
    .select('plane_scryfall_id, plane_name, user_id')
    .eq('pod_id', podId)

  if (conquestsError) throw conquestsError
  if (!conquests || conquests.length === 0) return []

  // Get display names for all users who have conquests
  const userIds = [...new Set(conquests.map((c) => c.user_id as string))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [
      p.id as string,
      p.display_name as string,
    ])
  )

  return conquests.map((c) => ({
    plane_scryfall_id: c.plane_scryfall_id as string,
    plane_name: c.plane_name as string,
    user_id: c.user_id as string,
    display_name: nameMap.get(c.user_id as string) ?? 'Unknown',
  }))
}
