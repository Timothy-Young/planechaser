import { describe, expect, it } from 'vitest'

import {
  addSlot,
  canStart,
  fillSlot,
  fromPodMembers,
  guestSlot,
  isRostered,
  removeSlot,
  renameSlot,
  reorder,
  seedSolo,
  toPlayers,
  type RosterSlot,
} from './roster'
import type { PodMember } from '@/lib/pods/types'

function podMember(userId: string, displayName?: string): PodMember {
  return {
    pod_id: 'pod-1',
    user_id: userId,
    role: 'member',
    joined_at: '2026-08-01T00:00:00.000Z',
    profile: displayName ? { display_name: displayName } : undefined,
  }
}

const JON: RosterSlot = { id: 'u-jon', display_name: 'Jon Jones', source: 'friend' }

describe('fromPodMembers', () => {
  it('keeps membership order and names', () => {
    expect(fromPodMembers([podMember('u-1', 'Jon Jones'), podMember('u-2', 'Will Turner')])).toEqual([
      { id: 'u-1', display_name: 'Jon Jones', source: 'pod' },
      { id: 'u-2', display_name: 'Will Turner', source: 'pod' },
    ])
  })

  it('falls back to a placeholder when a member has no profile', () => {
    expect(fromPodMembers([podMember('u-3')])[0].display_name).toBe('Player')
  })
})

describe('seedSolo', () => {
  it('puts the signed-in user first so their own turns attribute to them', () => {
    const roster = seedSolo({ id: 'u-me', display_name: 'Tim' }, 3)

    expect(roster[0]).toEqual({ id: 'u-me', display_name: 'Tim', source: 'self' })
    expect(roster.slice(1)).toEqual([
      { id: 'guest-2', display_name: 'Player 2', source: 'guest' },
      { id: 'guest-3', display_name: 'Player 3', source: 'guest' },
    ])
  })

  it('is all guests when signed out', () => {
    expect(seedSolo(null, 2)).toEqual([
      { id: 'guest-1', display_name: 'Player 1', source: 'guest' },
      { id: 'guest-2', display_name: 'Player 2', source: 'guest' },
    ])
  })
})

describe('addSlot', () => {
  it('appends', () => {
    expect(addSlot([], JON)).toEqual([JON])
  })

  // Same person twice would split their turns across two rows and two life
  // totals — and a pod member offered again through the friends list is the
  // most likely way to do it by accident.
  it('refuses a duplicate id', () => {
    expect(addSlot([JON], { ...JON, display_name: 'Jon again' })).toEqual([JON])
  })
})

describe('guestSlot', () => {
  it('numbers past the highest guest already present, not the roster length', () => {
    const roster = [guestSlot([]), guestSlot([guestSlot([])])]
    expect(roster.map((s) => s.id)).toEqual(['guest-1', 'guest-2'])

    // Removing the first must not make the next addition collide with guest-2.
    expect(guestSlot(roster.slice(1)).id).toBe('guest-3')
  })
})

describe('removeSlot', () => {
  it('drops only the named slot', () => {
    const roster = [JON, guestSlot([])]
    expect(removeSlot(roster, JON.id)).toEqual([roster[1]])
  })
})

describe('renameSlot', () => {
  it('renames a guest', () => {
    const guest = guestSlot([])
    expect(renameSlot([guest], guest.id, 'Matthew')[0].display_name).toBe('Matthew')
  })

  // Pod, friend, and self names come from their own profiles.
  it.each(['pod', 'friend', 'self'] as const)('leaves a %s slot alone', (source) => {
    const slot: RosterSlot = { id: 'u-1', display_name: 'Jon Jones', source }
    expect(renameSlot([slot], slot.id, 'Renamed')[0].display_name).toBe('Jon Jones')
  })
})

describe('fillSlot', () => {
  it('swaps in place so the play order survives', () => {
    const roster = [guestSlot([]), guestSlot([guestSlot([])]), JON]
    const filled = fillSlot(roster, 'guest-2', { id: 'u-will', display_name: 'Will Turner', source: 'friend' })

    expect(filled.map((s) => s.id)).toEqual(['guest-1', 'u-will', 'u-jon'])
  })

  it('refuses to fill with someone already rostered', () => {
    const roster = [JON, guestSlot([])]
    expect(fillSlot(roster, 'guest-1', JON)).toEqual(roster)
  })
})

describe('reorder', () => {
  const roster = [
    { id: 'a', display_name: 'A', source: 'guest' as const },
    { id: 'b', display_name: 'B', source: 'guest' as const },
    { id: 'c', display_name: 'C', source: 'guest' as const },
  ]

  it('moves a slot', () => {
    expect(reorder(roster, 2, 0).map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('ignores an out-of-range move rather than dropping anyone', () => {
    expect(reorder(roster, 0, 5)).toEqual(roster)
    expect(reorder(roster, -1, 1)).toEqual(roster)
  })
})

describe('isRostered', () => {
  it('reports membership by id', () => {
    expect(isRostered([JON], 'u-jon')).toBe(true)
    expect(isRostered([JON], 'u-will')).toBe(false)
  })
})

describe('toPlayers', () => {
  it('drops the source, which is a setup concern', () => {
    expect(toPlayers([JON])).toEqual([{ id: 'u-jon', display_name: 'Jon Jones' }])
  })

  it('names an unnamed guest by its position', () => {
    const blank = { ...guestSlot([]), display_name: '   ' }
    expect(toPlayers([JON, blank])[1].display_name).toBe('Player 2')
  })
})

describe('canStart', () => {
  const two = [JON, { id: 'u-will', display_name: 'Will Turner', source: 'friend' as const }]

  it('allows a solo Planechase game', () => {
    expect(canStart([JON], 'planechase', null)).toBe(true)
    expect(canStart([], 'planechase', null)).toBe(false)
  })

  it.each(['archenemy', 'both'] as const)('requires two players and a designation for %s', (mode) => {
    expect(canStart(two, mode, null)).toBe(false)
    expect(canStart([JON], mode, 'u-jon')).toBe(false)
    expect(canStart(two, mode, 'u-jon')).toBe(true)
  })

  it('refuses a designation that is not on the roster', () => {
    expect(canStart(two, 'archenemy', 'u-nobody')).toBe(false)
  })
})
