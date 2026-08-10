import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ArchenemyBoard } from './archenemy-board'
import type { ArchenemyState, InMotionScheme, SchemeCard } from '@/lib/game/types'

function makeScheme(id: string, isOngoing = false): SchemeCard {
  return {
    id,
    name: `Scheme ${id}`,
    type_line: isOngoing ? 'Ongoing Scheme' : 'Scheme',
    oracle_text: 'Do something villainous.',
    image_uris: {
      normal: `https://example.com/${id}.jpg`,
      large: `https://example.com/${id}.jpg`,
      art_crop: `https://example.com/${id}.jpg`,
      border_crop: `https://example.com/${id}.jpg`,
      small: `https://example.com/${id}.jpg`,
      png: `https://example.com/${id}.png`,
    },
    set_name: 'Archenemy',
    set: 'arc',
    isOngoing,
  }
}

function inMotion(id: string, isOngoing = false): InMotionScheme {
  return { instanceId: `i-${id}`, card: makeScheme(id, isOngoing), setInMotionAt: 1000 }
}

function makeArchenemy(overrides: Partial<ArchenemyState> = {}): ArchenemyState {
  return {
    archenemyId: 'p1',
    archenemyName: 'Alice',
    schemeDeck: [makeScheme('deck-1'), makeScheme('deck-2')],
    schemesInMotion: [],
    schemesPlayed: 0,
    side: 'archenemy',
    turnNumber: 1,
    ...overrides,
  }
}

const PLAYERS = [
  { id: 'p1', display_name: 'Alice' },
  { id: 'p2', display_name: 'Bob' },
  { id: 'p3', display_name: 'Charlie' },
]

function renderBoard(archenemy: ArchenemyState, overrides: Partial<Parameters<typeof ArchenemyBoard>[0]> = {}) {
  const handlers = {
    onSetSchemeInMotion: vi.fn(),
    onDismissScheme: vi.fn(),
    onEndArchenemyTurn: vi.fn(),
    onAdjustLife: vi.fn(),
    onSetLife: vi.fn(),
    onEliminatePlayer: vi.fn(),
    onRestorePlayer: vi.fn(),
  }

  render(
    <ArchenemyBoard
      archenemy={archenemy}
      players={PLAYERS}
      life={{ p1: 40, p2: 20, p3: 20 }}
      eliminatedPlayerIds={[]}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('ArchenemyBoard', () => {
  it('shows whose turn it is and how much scheme deck is left', () => {
    renderBoard(makeArchenemy({ side: 'archenemy', turnNumber: 3, schemesPlayed: 4 }))

    expect(screen.getByText("Alice's Turn")).toBeTruthy()
    expect(screen.getByText(/Turn 3 · 2 schemes left · 4 set in motion/)).toBeTruthy()
  })

  it('labels the turn button for the side that is passing', () => {
    renderBoard(makeArchenemy({ side: 'team' }))

    expect(screen.getByText("Heroes' Turn")).toBeTruthy()
    expect(screen.getByRole('button', { name: "End Heroes' Turn" })).toBeTruthy()
  })

  it('keeps every scheme in motion on the board at once', () => {
    // The case that matters: a long game leaves several ongoing schemes
    // running simultaneously, and none of them may be dropped.
    const schemes = [
      inMotion('a', true),
      inMotion('b', true),
      inMotion('c', true),
      inMotion('d', false),
      inMotion('e', true),
    ]
    renderBoard(makeArchenemy({ schemesInMotion: schemes }))

    for (const scheme of schemes) {
      // The featured card carries its name as the card image's alt text; the
      // compact rows carry it as a label beside the thumbnail.
      const byAlt = screen.queryAllByAltText(scheme.card.name)
      const byText = screen.queryAllByText(scheme.card.name)
      expect(byAlt.length + byText.length).toBeGreaterThan(0)
    }
  })

  it('offers Abandon for ongoing schemes and Resolve for one-shots', () => {
    renderBoard(makeArchenemy({ schemesInMotion: [inMotion('ongoing', true)] }))
    expect(screen.getByText('Abandon scheme')).toBeTruthy()

    screen.getByText('Schemes in Motion') // sanity: the section rendered
  })

  it('resolves a one-shot scheme by its instance id', () => {
    const handlers = renderBoard(makeArchenemy({ schemesInMotion: [inMotion('oneshot', false)] }))

    fireEvent.click(screen.getByText('Resolve scheme'))
    expect(handlers.onDismissScheme).toHaveBeenCalledWith('i-oneshot')
  })

  it('clears a scheme from the middle of the stack, not just the newest', () => {
    const handlers = renderBoard(
      makeArchenemy({
        schemesInMotion: [inMotion('newest', true), inMotion('middle', true), inMotion('oldest', true)],
      }),
    )

    // Rows below the featured card expand on tap, then expose their control.
    const row = screen.getByRole('button', { name: /Scheme middle/ })
    fireEvent.click(row)
    const controls = screen.getAllByText('Abandon scheme')
    // The featured newest card owns the first control; the expanded row the second.
    fireEvent.click(controls[controls.length - 1])

    expect(handlers.onDismissScheme).toHaveBeenCalledWith('i-middle')
  })

  it('disables setting a scheme in motion when the deck is empty', () => {
    renderBoard(makeArchenemy({ schemeDeck: [], schemesInMotion: [inMotion('a', true)] }))

    const button = screen.getByRole('button', { name: 'Set Scheme in Motion' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(/All schemes are in motion/)).toBeTruthy()
  })

  it('adjusts one player\'s life', () => {
    const handlers = renderBoard(makeArchenemy())

    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    const pad = screen.getByRole('button', { name: '-5' })
    fireEvent.click(pad)

    expect(handlers.onAdjustLife).toHaveBeenCalledWith('p2', -5)
  })

  it('offers elimination only once a player is at zero, and never does it automatically', () => {
    const handlers = renderBoard(makeArchenemy(), { life: { p1: 40, p2: 0, p3: 20 } })

    expect(handlers.onEliminatePlayer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminate' }))

    expect(handlers.onEliminatePlayer).toHaveBeenCalledWith('p2')
  })

  it('suggests an outcome when a side is wiped out but leaves the call to the host', () => {
    renderBoard(makeArchenemy(), { eliminatedPlayerIds: ['p2', 'p3'] })

    const banner = screen.getByText(/Alice wins — every hero is eliminated/)
    expect(within(banner).getByText(/End the game when you are ready/)).toBeTruthy()
  })
})
