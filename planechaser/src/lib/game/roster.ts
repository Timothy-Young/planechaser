import type { GameMode, Player } from './types'
import type { PodMember } from '@/lib/pods/types'

/**
 * Where a roster slot's identity came from, which is what decides whether the
 * name is the host's to edit and whether the id belongs to a real account.
 */
export type SlotSource = 'self' | 'pod' | 'friend' | 'guest'

export interface RosterSlot {
  /** Real user id for self, pod, and friend slots; `guest-N` otherwise. */
  id: string
  display_name: string
  source: SlotSource
}

/**
 * The table, in play order.
 *
 * One list replaces what used to be three separate ideas on the setup screen: a
 * player count, a checkbox list of pod members, and a set of editable local
 * names. Membership is participation — a pod member who is not playing tonight
 * is removed from the roster rather than unchecked, so the roster is always
 * exactly who is at the table.
 */
export type Roster = RosterSlot[]

const GUEST_PREFIX = 'guest-'

export function isRostered(roster: Roster, id: string): boolean {
  return roster.some((slot) => slot.id === id)
}

export function fromPodMembers(members: PodMember[]): Roster {
  return members.map((member) => ({
    id: member.user_id,
    display_name: member.profile?.display_name ?? 'Player',
    source: 'pod' as const,
  }))
}

/**
 * The starting roster with no pod: the signed-in user first, so their own turns
 * attribute to their account rather than to an anonymous slot, then guests.
 */
export function seedSolo(self: Player | null, count: number): Roster {
  const roster: Roster = self ? [{ ...self, source: 'self' }] : []
  while (roster.length < count) roster.push(guestSlot(roster))
  return roster
}

/**
 * A fresh guest slot, numbered past both the highest guest present and the
 * roster length.
 *
 * Past the highest guest because removing an early guest would otherwise hand
 * the next one a colliding id, and two slots sharing an id share a life total.
 * Past the length so the default name matches the row it lands on — appending
 * to a roster that already has a named player should read "Player 2", not
 * "Player 1" on the second row.
 */
export function guestSlot(roster: Roster): RosterSlot {
  const highestGuest = roster.reduce((max, slot) => {
    if (!slot.id.startsWith(GUEST_PREFIX)) return max
    const n = Number.parseInt(slot.id.slice(GUEST_PREFIX.length), 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 0)

  const next = Math.max(highestGuest, roster.length) + 1
  return { id: `${GUEST_PREFIX}${next}`, display_name: `Player ${next}`, source: 'guest' }
}

export function addSlot(roster: Roster, slot: RosterSlot): Roster {
  return isRostered(roster, slot.id) ? roster : [...roster, slot]
}

export function removeSlot(roster: Roster, id: string): Roster {
  return roster.filter((slot) => slot.id !== id)
}

/** Guest slots only — every other name comes from that account's profile. */
export function renameSlot(roster: Roster, id: string, name: string): Roster {
  return roster.map((slot) =>
    slot.id === id && slot.source === 'guest' ? { ...slot, display_name: name } : slot,
  )
}

/**
 * Replaces a slot in place, keeping its position, which is what filling a guest
 * slot from the friends list does. Refuses when the replacement is already on
 * the roster: the same person twice would split their turns and life total.
 */
export function fillSlot(roster: Roster, id: string, replacement: RosterSlot): Roster {
  if (replacement.id !== id && isRostered(roster, replacement.id)) return roster
  return roster.map((slot) => (slot.id === id ? replacement : slot))
}

export function reorder(roster: Roster, from: number, to: number): Roster {
  if (from < 0 || to < 0 || from >= roster.length || to >= roster.length) return roster
  const next = [...roster]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Game state carries players, not slots — the source is a setup concern. */
export function toPlayers(roster: Roster): Player[] {
  return roster.map((slot, index) => ({
    id: slot.id,
    display_name: slot.display_name.trim() || `Player ${index + 1}`,
  }))
}

/**
 * Planechase runs solo, so one player is enough. Archenemy tracks life per
 * player and needs someone to be the archenemy, so it needs two and a
 * designation that is actually at the table.
 */
export function canStart(
  roster: Roster,
  mode: GameMode,
  designatedArchenemyId: string | null,
): boolean {
  if (mode === 'archenemy' || mode === 'both') {
    return (
      roster.length >= 2 &&
      designatedArchenemyId !== null &&
      isRostered(roster, designatedArchenemyId)
    )
  }
  return roster.length >= 1
}
