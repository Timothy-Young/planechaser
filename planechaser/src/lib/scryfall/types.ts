export interface ScryfallCard {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: {
    normal: string
    art_crop?: string
  }
  set_name: string
  set: string
}

export interface ScryfallList {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
  total_cards: number
}

export type PlaneCorpusCard = Pick<
  ScryfallCard,
  'id' | 'name' | 'type_line' | 'oracle_text' | 'flavor_text' | 'image_uris' | 'set_name' | 'set'
>
