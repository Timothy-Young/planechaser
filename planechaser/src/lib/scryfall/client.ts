import type { PlaneCorpusCard, ScryfallList } from './types'

const SCRYFALL_API = 'https://api.scryfall.com'
const USER_AGENT = 'PlaneChaser/1.0 codetimcode@gmail.com'
const PLANES_QUERY = `${SCRYFALL_API}/cards/search?q=t%3Aplane+is%3Aplanechase&order=name`
const SCHEMES_QUERY = `${SCRYFALL_API}/cards/search?q=t%3Ascheme&order=name`

export async function fetchPlanechaseCorpus(): Promise<PlaneCorpusCard[]> {
  const results: PlaneCorpusCard[] = []
  let url: string | undefined = PLANES_QUERY

  while (url) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) {
      throw new Error(`Scryfall API error: ${res.status} ${res.statusText}`)
    }

    const page: ScryfallList = await res.json()

    for (const card of page.data) {
      results.push({
        id: card.id,
        name: card.name,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        flavor_text: card.flavor_text,
        image_uris: card.image_uris,
        set_name: card.set_name,
        set: card.set,
      })
    }

    url = page.has_more ? page.next_page : undefined

    if (url) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return results
}

export async function fetchSchemeCorpus(): Promise<PlaneCorpusCard[]> {
  const results: PlaneCorpusCard[] = []
  let url: string | undefined = SCHEMES_QUERY

  while (url) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) {
      throw new Error(`Scryfall API error: ${res.status} ${res.statusText}`)
    }

    const page: ScryfallList = await res.json()

    for (const card of page.data) {
      results.push({
        id: card.id,
        name: card.name,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        flavor_text: card.flavor_text,
        image_uris: card.image_uris,
        set_name: card.set_name,
        set: card.set,
      })
    }

    url = page.has_more ? page.next_page : undefined

    if (url) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return results
}
