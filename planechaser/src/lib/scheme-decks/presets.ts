export interface SchemePreset {
  name: string
  description: string
  filter: (scheme: { oracle_text: string; is_ongoing: boolean }) => boolean
  targetSize: number
}

export const SCHEME_PRESETS: SchemePreset[] = [
  {
    name: 'Aggressive',
    description: 'Heavy on one-shot damage and disruption',
    filter: (s) => !s.is_ongoing,
    targetSize: 20,
  },
  {
    name: 'Balanced',
    description: 'Mix of ongoing and one-shot schemes',
    filter: () => true,
    targetSize: 20,
  },
  {
    name: 'Chaos',
    description: 'Maximum randomness and board-shaking effects',
    filter: (s) => {
      const text = s.oracle_text.toLowerCase()
      return text.includes('random') || text.includes('each') || text.includes('all') || s.is_ongoing
    },
    targetSize: 20,
  },
]

export function buildPresetDeck(
  presetName: string,
  allSchemes: { id: string; oracle_text: string; is_ongoing: boolean }[],
): string[] {
  const preset = SCHEME_PRESETS.find((p) => p.name === presetName)
  if (!preset) return []

  const matching = allSchemes.filter(preset.filter)
  const shuffled = [...matching].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, preset.targetSize)

  if (selected.length < preset.targetSize) {
    const selectedIds = new Set(selected.map((s) => s.id))
    const remaining = allSchemes.filter((s) => !selectedIds.has(s.id))
    const extra = [...remaining].sort(() => Math.random() - 0.5)
    selected.push(...extra.slice(0, preset.targetSize - selected.length))
  }

  return selected.map((s) => s.id)
}
