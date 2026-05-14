import { createClient } from '@/lib/supabase/server'
import { fetchSchemeCorpus } from '@/lib/scryfall/client'
import type { PlaneCorpusCard } from '@/lib/scryfall/types'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: cached } = await supabase
      .from('card_cache')
      .select('raw_json, cached_at')
      .eq('card_type', 'schemes')
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at as string).getTime()
      if (age < CACHE_TTL_MS) {
        return Response.json(cached.raw_json as PlaneCorpusCard[])
      }
    }

    const schemes = await fetchSchemeCorpus()

    await supabase.from('card_cache').upsert({
      card_type: 'schemes',
      raw_json: schemes,
      cached_at: new Date().toISOString(),
    })

    return Response.json(schemes)
  } catch {
    return Response.json({ error: 'Scryfall unavailable' }, { status: 503 })
  }
}
