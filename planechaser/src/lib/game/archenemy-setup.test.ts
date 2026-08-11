import { describe, expect, it } from 'vitest'

import {
  ARCHENEMY_LIFE,
  HERO_LIFE,
  archenemyFirstTurnOrder,
  buildArchenemyState,
  buildLifeTotals,
} from './archenemy-setup'
import type { Player } from './types'

const players: Player[] = [
  { id: 'a', display_name: 'Ari' },
  { id: 'b', display_name: 'Bex' },
  { id: 'c', display_name: 'Cy' },
]

const schemes = [
  { id: 's1', type_line: 'Ongoing Scheme' },
  { id: 's2', type_line: 'Scheme' },
  { id: 's3', type_line: 'Scheme' },
]

describe('buildArchenemyState', () => {
  it('returns null without a designated archenemy, so a broken game cannot start', () => {
    expect(
      buildArchenemyState({ players, designatedArchenemyId: null, schemes }),
    ).toBeNull()
  })

  it('returns null when there are no schemes', () => {
    expect(
      buildArchenemyState({ players, designatedArchenemyId: 'b', schemes: [] }),
    ).toBeNull()
  })

  it('names the archenemy from the roster', () => {
    const state = buildArchenemyState({ players, designatedArchenemyId: 'b', schemes })
    expect(state?.archenemyId).toBe('b')
    expect(state?.archenemyName).toBe('Bex')
  })

  it('falls back to a supplied name when the archenemy is not in the roster', () => {
    const state = buildArchenemyState({
      players,
      designatedArchenemyId: 'z',
      schemes,
      fallbackName: 'Distant Foe',
    })
    expect(state?.archenemyName).toBe('Distant Foe')
  })

  it('gives the archenemy the first turn', () => {
    const state = buildArchenemyState({ players, designatedArchenemyId: 'b', schemes })
    expect(state?.side).toBe('archenemy')
    expect(state?.turnNumber).toBe(1)
  })

  it('marks ongoing schemes', () => {
    const state = buildArchenemyState({ players, designatedArchenemyId: 'a', schemes })
    const ongoing = state?.schemeDeck.filter((s) => s.isOngoing) ?? []
    expect(ongoing).toHaveLength(1)
    expect(ongoing[0].id).toBe('s1')
  })

  it('filters to the selected scheme deck', () => {
    const state = buildArchenemyState({
      players,
      designatedArchenemyId: 'a',
      schemes,
      schemeDecks: [{ id: 'd1', scheme_ids: ['s2', 's3'] }],
      selectedSchemeDeckId: 'd1',
    })
    expect(state?.schemeDeck.map((s) => s.id).sort()).toEqual(['s2', 's3'])
  })

  it('falls back to the full pool when the selected deck matches nothing', () => {
    // An empty deck would otherwise start a game the archenemy can never act in.
    const state = buildArchenemyState({
      players,
      designatedArchenemyId: 'a',
      schemes,
      schemeDecks: [{ id: 'd1', scheme_ids: ['does-not-exist'] }],
      selectedSchemeDeckId: 'd1',
    })
    expect(state?.schemeDeck).toHaveLength(3)
  })

  it('ignores an unknown scheme deck id', () => {
    const state = buildArchenemyState({
      players,
      designatedArchenemyId: 'a',
      schemes,
      schemeDecks: [{ id: 'd1', scheme_ids: ['s2'] }],
      selectedSchemeDeckId: 'nope',
    })
    expect(state?.schemeDeck).toHaveLength(3)
  })
})

describe('buildLifeTotals', () => {
  it('gives the archenemy 40 and everyone else 20', () => {
    expect(buildLifeTotals(players, 'b')).toEqual({
      a: HERO_LIFE,
      b: ARCHENEMY_LIFE,
      c: HERO_LIFE,
    })
  })
})

describe('archenemyFirstTurnOrder', () => {
  it('moves the archenemy to the front', () => {
    expect(archenemyFirstTurnOrder(players, 'c')).toEqual(['c', 'a', 'b'])
  })

  it('leaves an already-first archenemy alone', () => {
    expect(archenemyFirstTurnOrder(players, 'a')).toEqual(['a', 'b', 'c'])
  })

  it('omits an archenemy who is not in the roster', () => {
    expect(archenemyFirstTurnOrder(players, 'z')).toEqual(['a', 'b', 'c'])
  })
})
