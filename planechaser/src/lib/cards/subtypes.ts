import type { PlaneCard } from '@/lib/game/types'

/**
 * Extract the subtype from a plane card's type_line.
 * E.g. "Plane — Dominaria" → "Dominaria"
 *      "Phenomenon" → null
 *      "Plane — Custom" → "Custom"
 */
export function extractSubtype(typeLine: string): string | null {
  // Handle "Plane — Subtype" (em dash) and "Plane - Subtype" (hyphen)
  const match = typeLine.match(/(?:Plane|pLAnE)\s*[—\-–]\s*(.+)/i)
  return match ? match[1].trim() : null
}

/**
 * Get all unique subtypes from a list of plane cards, sorted alphabetically.
 */
export function getUniqueSubtypes(cards: PlaneCard[]): string[] {
  const subtypes = new Set<string>()
  for (const card of cards) {
    const sub = extractSubtype(card.type_line)
    if (sub) subtypes.add(sub)
  }
  return [...subtypes].sort((a, b) => a.localeCompare(b))
}
