import { createClient } from '@supabase/supabase-js'
import { classifyCardEffect } from '../src/lib/cards/effect-classifier'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_AGENT = 'PlaneChaser/1.0 codetimcode@gmail.com'

interface ScryfallCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris?: {
    normal: string
    large: string
    art_crop: string
    border_crop: string
    small: string
    png: string
  }
  set: string
  set_name: string
}

interface ScryfallList {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
  total_cards: number
}

async function fetchAllCards(query: string): Promise<ScryfallCard[]> {
  const results: ScryfallCard[] = []
  let url: string | undefined = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`

  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`Scryfall error: ${res.status}`)

    const page: ScryfallList = await res.json()

    for (const card of page.data) {
      if (card.image_uris) {
        results.push(card)
      }
    }

    url = page.has_more ? page.next_page : undefined
    if (url) await new Promise((r) => setTimeout(r, 100))
  }

  return results
}

function inferCardType(typeLine: string): 'plane' | 'phenomenon' | 'scheme' {
  const lower = typeLine.toLowerCase()
  if (lower.includes('phenomenon')) return 'phenomenon'
  if (lower.includes('scheme')) return 'scheme'
  return 'plane'
}

async function seed() {
  console.log('Fetching planes and phenomena from Scryfall...')
  const planesAndPhenomena = await fetchAllCards('t:plane OR t:phenomenon')
  console.log(`  Found ${planesAndPhenomena.length} plane/phenomenon cards`)

  console.log('Fetching schemes from Scryfall...')
  const schemes = await fetchAllCards('t:scheme')
  console.log(`  Found ${schemes.length} scheme cards`)

  const allCards = [...planesAndPhenomena, ...schemes]

  const rows = allCards.map((card) => {
    const cardType = inferCardType(card.type_line)
    const effect = classifyCardEffect(card.type_line, card.oracle_text)

    return {
      id: card.id,
      name: card.name,
      type_line: card.type_line,
      card_type: cardType,
      oracle_text: card.oracle_text ?? '',
      flavor_text: card.flavor_text ?? null,
      set_code: card.set,
      set_name: card.set_name,
      image_uris: card.image_uris,
      chaos_effect_type: effect.chaos_effect_type,
      chaos_effect_config: effect.chaos_effect_config,
      is_ongoing: cardType === 'scheme' && card.type_line.toLowerCase().includes('ongoing'),
      seeded_at: new Date().toISOString(),
    }
  })

  console.log(`Upserting ${rows.length} cards into database...`)

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await supabase.from('cards').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`Error upserting batch starting at ${i}:`, error)
      process.exit(1)
    }
    console.log(`  Upserted ${Math.min(i + 50, rows.length)}/${rows.length}`)
  }

  // Print summary by type
  const summary = rows.reduce((acc, r) => {
    acc[r.card_type] = (acc[r.card_type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const effectSummary = rows.reduce((acc, r) => {
    if (r.chaos_effect_type !== 'standard') {
      acc[r.chaos_effect_type] = (acc[r.chaos_effect_type] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  console.log('\nSeed complete!')
  console.log('Card types:', summary)
  console.log('Special effects:', effectSummary)
}

seed().catch(console.error)
