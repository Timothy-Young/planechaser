import { describe, it, expect } from 'vitest'
import { toWireState, fromWireState } from './wire-state'
import type { GameState, PlaneCard, SchemeCard } from './types'

function makeCard(id: string, name: string): PlaneCard {
  return {
    id,
    name,
    type_line: 'Plane — Dominaria',
    card_type: 'plane',
    oracle_text: `Oracle text for ${name}. `.repeat(20),
    flavor_text: `Flavor for ${name}. `.repeat(10),
    image_uris: {
      normal: `https://cards.scryfall.io/normal/${id}.jpg`,
      large: `https://cards.scryfall.io/large/${id}.jpg`,
      art_crop: `https://cards.scryfall.io/art_crop/${id}.jpg`,
      border_crop: `https://cards.scryfall.io/border_crop/${id}.jpg`,
      small: `https://cards.scryfall.io/small/${id}.jpg`,
      png: `https://cards.scryfall.io/png/${id}.png`,
    },
    set_name: 'Planechase Anthology',
    set: 'pca',
    chaos_effect_type: 'standard',
    chaos_effect_config: null,
  }
}

function makeScheme(id: string): SchemeCard {
  return {
    id,
    name: `Scheme ${id}`,
    type_line: 'Scheme',
    oracle_text: 'Do something villainous. '.repeat(15),
    image_uris: makeCard(id, id).image_uris,
    set_name: 'Archenemy',
    set: 'arc',
    isOngoing: false,
  }
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const deck = Array.from({ length: 30 }, (_, i) => makeCard(`card-${i}`, `Plane ${i}`))
  const base: GameState = {
    id: 'game-1',
    config: { playerCount: 4, deckSize: 30 },
    deck,
    currentPlaneIndex: 3,
    secondPlaneIndex: null,
    dieState: 'idle',
    lastDieResult: null,
    rollCountThisTurn: 2,
    dieRollHistory: [{ result: 'blank', timestamp: 1 }],
    planesVisited: 4,
    startedAt: 1000,
    players: [
      { id: 'p1', display_name: 'Alice' },
      { id: 'p2', display_name: 'Bob' },
    ],
    turnOrder: ['p1', 'p2'],
    currentTurnIndex: 1,
    currentTurnRolls: [],
    turnStartPlaneIndex: 2,
    turnHistory: [],
    stateHistory: [],
    eliminatedPlayerIds: [],
    showChaosOverlay: false,
    revealState: null,
    phenomenonActive: false,
  }
  return { ...base, ...overrides }
}

describe('wire state projection', () => {
  it('keeps the current plane renderable through a round trip', () => {
    const state = makeState()
    const restored = fromWireState(toWireState(state))

    expect(restored).not.toBeNull()
    expect(restored!.deck[restored!.currentPlaneIndex].id).toBe('card-3')
    expect(restored!.deck[restored!.currentPlaneIndex].name).toBe('Plane 3')
    expect(restored!.deck[restored!.currentPlaneIndex].image_uris.border_crop).toContain(
      'card-3',
    )
  })

  it('carries both planes when two are occupied', () => {
    const state = makeState({ currentPlaneIndex: 5, secondPlaneIndex: 6 })
    const restored = fromWireState(toWireState(state))!

    expect(restored.secondPlaneIndex).toBe(1)
    expect(restored.deck[restored.currentPlaneIndex].id).toBe('card-5')
    expect(restored.deck[restored.secondPlaneIndex!].id).toBe('card-6')
  })

  it('preserves the turn fields spectators render', () => {
    const state = makeState()
    const restored = fromWireState(toWireState(state))!

    expect(restored.turnOrder).toEqual(['p1', 'p2'])
    expect(restored.currentTurnIndex).toBe(1)
    expect(restored.players.map((p) => p.display_name)).toEqual(['Alice', 'Bob'])
    expect(restored.planesVisited).toBe(4)
  })

  it('never syncs the undo buffer', () => {
    const withHistory = makeState()
    // Five snapshots, each holding its own copy of the 30-card deck.
    const snapshots = Array.from({ length: 5 }, () => {
      const { stateHistory: _omit, ...rest } = makeState()
      return rest
    })
    const state = makeState({ stateHistory: snapshots })

    const wire = toWireState(state)
    expect('stateHistory' in wire).toBe(false)
    expect(fromWireState(wire)!.stateHistory).toEqual([])

    // And the whole point: the payload must not grow with the undo buffer.
    const withoutHistory = JSON.stringify(toWireState(withHistory)).length
    const withHistoryLen = JSON.stringify(wire).length
    expect(withHistoryLen).toBe(withoutHistory)
  })

  it('cuts the payload by more than an order of magnitude', () => {
    const snapshots = Array.from({ length: 5 }, () => {
      const { stateHistory: _omit, ...rest } = makeState()
      return rest
    })
    const state = makeState({ stateHistory: snapshots })

    const before = JSON.stringify(state).length
    const after = JSON.stringify(toWireState(state)).length

    expect(after).toBeLessThan(before / 10)
  })

  it('keeps deck identity and length available', () => {
    const state = makeState()
    const wire = toWireState(state)

    expect(wire.deckCount).toBe(30)
    expect(wire.deckIds).toHaveLength(30)
    expect(wire.deckIds[3]).toBe('card-3')
  })

  it('slims the scheme deck but keeps ongoing schemes inline', () => {
    const ongoing = { ...makeScheme('s-ongoing'), isOngoing: true }
    const state = makeState({
      archenemy: {
        archenemyId: 'p1',
        archenemyName: 'Alice',
        schemeDeck: Array.from({ length: 20 }, (_, i) => makeScheme(`s-${i}`)),
        currentSchemeIndex: 3,
        activeSchemes: [ongoing],
        schemesPlayed: 3,
      },
    })

    const wire = toWireState(state)
    expect(wire.archenemy!.schemeDeckIds).toHaveLength(20)
    expect(wire.archenemy!.activeSchemes).toHaveLength(1)

    const restored = fromWireState(wire)!
    expect(restored.archenemy!.activeSchemes[0].id).toBe('s-ongoing')
    expect(restored.archenemy!.archenemyName).toBe('Alice')
    expect(restored.archenemy!.schemesPlayed).toBe(3)
  })

  it('still renders a legacy full-GameState payload', () => {
    // A game already in flight when this shipped: the row holds the old shape.
    const legacy = makeState({ currentPlaneIndex: 7 })
    const restored = fromWireState(JSON.parse(JSON.stringify(legacy)))

    expect(restored).not.toBeNull()
    expect(restored!.deck[restored!.currentPlaneIndex].id).toBe('card-7')
    expect(restored!.stateHistory).toEqual([])
  })

  it('survives an empty deck without throwing', () => {
    const state = makeState({ deck: [], currentPlaneIndex: 0 })
    const restored = fromWireState(toWireState(state))!

    expect(restored.deck).toEqual([])
    expect(restored.deck[restored.currentPlaneIndex]).toBeUndefined()
  })

  it('rejects junk instead of producing a broken state', () => {
    expect(fromWireState(null)).toBeNull()
    expect(fromWireState('nonsense')).toBeNull()
    expect(fromWireState({})).toBeNull()
  })

  it('inlines a private custom plane the spectator could not look up', () => {
    const custom = makeCard('custom-abc', 'My Homebrew Plane')
    const state = makeState({ deck: [custom], currentPlaneIndex: 0 })

    const restored = fromWireState(toWireState(state))!
    expect(restored.deck[restored.currentPlaneIndex].name).toBe('My Homebrew Plane')
  })
})
