import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlayerRoster } from './player-roster'
import type { RosterSlot } from '@/lib/game/roster'
import type { Friend } from '@/lib/pods/types'

function friend(userId: string, displayName: string): Friend {
  return {
    user_id: userId,
    display_name: displayName,
    avatar_url: null,
    friend_code: 'ABC123',
    request_id: `req-${userId}`,
  }
}

const GUEST: RosterSlot = { id: 'guest-2', display_name: 'Player 2', source: 'guest' }
const POD: RosterSlot = { id: 'u-jon', display_name: 'Jon Jones', source: 'pod' }

const FRIENDS = [friend('u-will', 'Will Turner'), friend('u-matt', 'Matthew')]

function renderRoster(overrides: Partial<React.ComponentProps<typeof PlayerRoster>> = {}) {
  const props = {
    roster: [POD, GUEST],
    archenemyMode: false,
    designatedArchenemyId: null,
    friends: FRIENDS,
    onDesignate: vi.fn(),
    onPickFriend: vi.fn(),
    onRename: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onAdd: vi.fn(() => 'guest-3'),
    onRandomize: vi.fn(),
    ...overrides,
  }
  render(<PlayerRoster {...props} />)
  return props
}

function openSlot(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Change player \\d+, ${name}`) }))
}

describe('PlayerRoster', () => {
  it('lists the table in play order and names who goes first', () => {
    renderRoster()
    expect(screen.getByText('Jon Jones')).toBeTruthy()
    expect(screen.getByText(/2 players · Jon Jones goes first/)).toBeTruthy()
  })

  it('shows the archenemy pill only in an archenemy game', () => {
    const { unmount } = render(
      <PlayerRoster
        roster={[POD, GUEST]}
        archenemyMode={false}
        designatedArchenemyId={null}
        friends={[]}
        onDesignate={vi.fn()}
        onPickFriend={vi.fn()}
        onRename={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onAdd={vi.fn(() => 'guest-3')}
        onRandomize={vi.fn()}
      />,
    )
    expect(screen.queryByText('Make archenemy')).toBeNull()
    unmount()

    renderRoster({ archenemyMode: true })
    expect(screen.getAllByText('Make archenemy')).toHaveLength(2)
  })

  it('opens the slot sheet when a name is tapped', () => {
    renderRoster()
    openSlot('Player 2')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Will Turner' })).toBeTruthy()
  })

  it('reports the picked friend against the slot that was open', () => {
    const props = renderRoster()
    openSlot('Player 2')
    fireEvent.click(screen.getByRole('button', { name: 'Will Turner' }))

    expect(props.onPickFriend).toHaveBeenCalledWith('guest-2', FRIENDS[0])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // The same person in two seats would split their turns and their life total.
  it('does not offer a friend who is already at the table', () => {
    renderRoster({ roster: [{ ...FRIENDS[0], id: 'u-will', display_name: 'Will Turner', source: 'friend' }, GUEST] })
    openSlot('Player 2')

    expect(screen.queryByRole('button', { name: 'Will Turner' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Matthew' })).toBeTruthy()
  })

  it('renames a guest from the typed name', () => {
    const props = renderRoster()
    openSlot('Player 2')
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Garrett' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(props.onRename).toHaveBeenCalledWith('guest-2', 'Garrett')
  })

  // A pod member's name belongs to their profile, and swapping one out in place
  // would quietly drop them from a pod game.
  it('offers a pod member removal only', () => {
    renderRoster()
    openSlot('Jon Jones')

    expect(screen.getByText(/name comes from their profile/i)).toBeTruthy()
    expect(screen.queryByLabelText('Player name')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Will Turner' })).toBeNull()
    expect(screen.getByRole('button', { name: /Remove from this game/ })).toBeTruthy()
  })

  it('removes the slot that was open', () => {
    const props = renderRoster()
    openSlot('Jon Jones')
    fireEvent.click(screen.getByRole('button', { name: /Remove from this game/ }))

    expect(props.onRemove).toHaveBeenCalledWith('u-jon')
  })

  it('points at the friends page when there is nobody to pick', () => {
    renderRoster({ friends: [] })
    openSlot('Player 2')
    expect(screen.getByRole('link', { name: /Add some/ })).toBeTruthy()
  })

  it('adds a player and opens the new slot straight away', () => {
    const props = renderRoster({ onAdd: vi.fn(() => 'guest-2') })
    fireEvent.click(screen.getByRole('button', { name: '+ Add player' }))

    expect(props.onAdd).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('moves a player up', () => {
    const props = renderRoster()
    fireEvent.click(screen.getByRole('button', { name: 'Move Player 2 up' }))
    expect(props.onMove).toHaveBeenCalledWith(1, 0)
  })
})
