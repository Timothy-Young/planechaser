import { describe, it, expect } from 'vitest'
import { classifyCardEffect } from './effect-classifier'

describe('classifyCardEffect', () => {
  it('classifies standard plane with normal chaos', () => {
    const result = classifyCardEffect('Plane — Dominaria', 'Whenever you roll {CHAOS}, create a 4/4 Angel token.')
    expect(result).toEqual({ chaos_effect_type: 'standard', chaos_effect_config: null })
  })

  it('classifies Pools of Becoming as reveal_and_chaos', () => {
    const oracleText = "At the beginning of your end step, put the cards in your hand on the bottom of your library in any order, then draw that many cards.\nWhenever you roll {CHAOS}, reveal the top three cards of your planar deck. Each of the revealed cards' {CHAOS} abilities triggers. Then put the revealed cards on the bottom of your planar deck in any order."
    const result = classifyCardEffect('Plane — Bolas\'s Meditation Realm', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'reveal_and_chaos',
      chaos_effect_config: { revealCount: 3, triggerChaos: true },
    })
  })

  it('classifies Stairs to Infinity as scry_top', () => {
    const oracleText = "Players have no maximum hand size.\nWhenever you roll {CHAOS}, reveal the top card of your planar deck. You may put it on the bottom of your planar deck."
    const result = classifyCardEffect('Plane — Xerex', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'scry_top',
      chaos_effect_config: { count: 1, optional: true },
    })
  })

  it('classifies phenomenon cards', () => {
    const result = classifyCardEffect('Phenomenon', 'When you encounter Interplanar Tunnel, reveal cards from the top of your planar deck until you reveal five plane cards. Put a plane card from among them on top of your planar deck, then put the rest of the revealed cards on the bottom in a random order.')
    expect(result).toEqual({
      chaos_effect_type: 'phenomenon',
      chaos_effect_config: null,
    })
  })

  it('classifies Interplanar Tunnel phenomenon with reveal_and_choose detail', () => {
    const result = classifyCardEffect('Phenomenon', 'When you encounter Interplanar Tunnel, reveal cards from the top of your planar deck until you reveal five plane cards.')
    expect(result.chaos_effect_type).toBe('phenomenon')
  })

  it('classifies Grand Ossuary chaos as force_planeswalk', () => {
    const oracleText = "Whenever a creature dies, its controller distributes its power and toughness as +1/+1 counters among any number of creatures they control.\nWhenever you roll {CHAOS}, each player exiles all creatures they control and creates X 1/1 green Saproling creature tokens, where X is the total power of the creatures they exiled this way. Then planeswalk to a new plane."
    const result = classifyCardEffect('Plane — Ravnica', oracleText)
    expect(result).toEqual({
      chaos_effect_type: 'force_planeswalk',
      chaos_effect_config: null,
    })
  })

  it('classifies plane with no chaos text as standard', () => {
    const result = classifyCardEffect('Plane — Lorwyn', 'All creatures have haste.')
    expect(result).toEqual({ chaos_effect_type: 'standard', chaos_effect_config: null })
  })
})
