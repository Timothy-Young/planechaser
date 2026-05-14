import { createClient } from '@/lib/supabase/server'
import { fetchPlanechaseCorpus } from '@/lib/scryfall/client'
import type { PlaneCorpusCard } from '@/lib/scryfall/types'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: cached } = await supabase
      .from('card_cache')
      .select('raw_json, cached_at')
      .eq('card_type', 'planes')
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at as string).getTime()
      if (age < CACHE_TTL_MS) {
        return Response.json(cached.raw_json as PlaneCorpusCard[])
      }
    }

    const planes = await fetchPlanechaseCorpus()

    await supabase.from('card_cache').upsert({
      card_type: 'planes',
      raw_json: planes,
      cached_at: new Date().toISOString(),
    })

    return Response.json(planes)
  } catch {
    return Response.json({ error: 'Scryfall unavailable' }, { status: 503 })
  }
}
