export interface EffectClassification {
  chaos_effect_type: 'standard' | 'reveal_and_chaos' | 'reveal_and_choose' | 'scry_top' | 'phenomenon' | 'force_planeswalk' | 'spatial_merge' | 'planeswalk_no_leave'
  chaos_effect_config: Record<string, unknown> | null
}

export type ChaosEffectType = EffectClassification['chaos_effect_type']

export function classifyCardEffect(typeLine: string, oracleText: string): EffectClassification {
  if (typeLine.toLowerCase().includes('phenomenon')) {
    if (/reveal cards.*until you reveal two plane cards/i.test(oracleText)
      || /simultaneously planeswalk to both/i.test(oracleText)) {
      return { chaos_effect_type: 'spatial_merge', chaos_effect_config: null }
    }
    return { chaos_effect_type: 'phenomenon', chaos_effect_config: null }
  }

  const chaosSection = extractChaosSection(oracleText)
  if (!chaosSection) {
    return { chaos_effect_type: 'standard', chaos_effect_config: null }
  }

  // "reveal the top three cards of your planar deck" + "chaos abilities triggers"
  const revealChaosMatch = chaosSection.match(/reveal the top (\w+) cards? of your planar deck.*?\{?chaos\}? abilit/i)
  if (revealChaosMatch) {
    const count = wordToNumber(revealChaosMatch[1])
    return {
      chaos_effect_type: 'reveal_and_chaos',
      chaos_effect_config: { revealCount: count, triggerChaos: true },
    }
  }

  // "reveal the top card of your planar deck. You may put it on the bottom"
  if (/reveal the top card of your planar deck.*?may put it on the bottom/i.test(chaosSection)) {
    return {
      chaos_effect_type: 'scry_top',
      chaos_effect_config: { count: 1, optional: true },
    }
  }

  // "Planeswalk to it, except don't planeswalk away from any plane" (Norn's Seedcore)
  if (/planeswalk to it, except don.t planeswalk away/i.test(chaosSection)) {
    return { chaos_effect_type: 'planeswalk_no_leave', chaos_effect_config: null }
  }

  // "Then planeswalk to a new plane" or "planeswalk away from" in chaos text
  if (/then planeswalk|planeswalk to a new plane|planeswalk away from/i.test(chaosSection)) {
    return {
      chaos_effect_type: 'force_planeswalk',
      chaos_effect_config: null,
    }
  }

  return { chaos_effect_type: 'standard', chaos_effect_config: null }
}

function extractChaosSection(oracleText: string): string | null {
  const lines = oracleText.split('\n')
  // Prefer the actual chaos ability line ("Whenever chaos ensues, ..." or
  // "Whenever you roll {CHAOS}, ...") over lines that merely mention chaos,
  // e.g. entry triggers like "When you planeswalk here, chaos ensues."
  const abilityLine = lines.find(
    (l) => /^\s*(whenever|when) chaos ensues/i.test(l) || /\{CHAOS\}/i.test(l)
  )
  if (abilityLine) return abilityLine
  return lines.find((l) => /chaos/i.test(l)) ?? null
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

function wordToNumber(word: string): number {
  return WORD_NUMBERS[word.toLowerCase()] ?? (parseInt(word, 10) || 1)
}
