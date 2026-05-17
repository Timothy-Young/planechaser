import { fetchPlaneCards, fetchSchemeCards } from '@/lib/cards/queries'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'planes'

  try {
    if (type === 'schemes') {
      const cards = await fetchSchemeCards()
      return Response.json(cards)
    }

    const cards = await fetchPlaneCards()
    return Response.json(cards)
  } catch {
    return Response.json({ error: 'Database unavailable' }, { status: 503 })
  }
}
