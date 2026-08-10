import { describe, expect, it } from 'vitest'

import { containsProfanity, scanText } from './text'

/**
 * Magic vocabulary is violent and anatomical by default. Every string here is
 * legitimate card or flavor text and MUST pass clean — this suite is what keeps
 * the feature from handing strikes to people writing ordinary planes.
 */
const MUST_PASS = [
  'Scunthorpe',
  'assassin',
  'Bloodghast',
  'Slaughter the Strong',
  "Hell's Caretaker",
  'Cockatrice',
  'Titania, Protector of Argoth',
  'Basilisk Collar',
  'Grave Titan',
  'Blood Artist',
  'Butcher of Malakir',
  'Carnage Tyrant',
  'Mutilate',
  'Sengir Vampire',
  'Massacre Wurm',
  'Bone Shredder',
  'Skullclamp',
  'Hellhole Rats',
  'Nicol Bolas, Planeswalker',
  'Serra Angel',
  'Shivan Dragon',
  'Counterspell',
  'Class action',
  'Analyze the battlefield',
  'The Shattered Vale',
  'Plane — Custom',
  'Whenever a player casts a spell, that player sacrifices a creature.',
  'Chaos — Each player draws a card and loses 1 life.',
  'A mass of tentacles erupts from the sea.',
  'The horizon burns with pitiless light.',
]

const MUST_FLAG = [
  'fuck this plane',
  'this is porn',
  'a whore appears',
  'rape',
  'pedophile',
  'child porn',
  'necrophilia',
]

const MUST_FLAG_OBFUSCATED = [
  'f u c k you',
  'fuuuuck',
  'sh1t',
]

describe('containsProfanity', () => {
  it.each(MUST_PASS)('passes legitimate card text: %s', (text) => {
    expect(containsProfanity(text)).toBe(false)
  })

  it.each(MUST_FLAG)('flags prohibited text: %s', (text) => {
    expect(containsProfanity(text)).toBe(true)
  })

  it.each(MUST_FLAG_OBFUSCATED)('flags obfuscated text: %s', (text) => {
    expect(containsProfanity(text)).toBe(true)
  })

  it('treats empty and whitespace-only input as clean', () => {
    expect(containsProfanity('')).toBe(false)
    expect(containsProfanity('   \n\t ')).toBe(false)
  })
})

describe('scanText', () => {
  it('returns an empty list when every field is clean', () => {
    expect(
      scanText({
        name: 'The Shattered Vale',
        type_line: 'Plane — Custom',
        oracle_text: 'Players cannot untap more than one land during their untap step.',
        chaos_text: 'Destroy target creature.',
        flavor_text: 'The horizon burns with pitiless light.',
      }),
    ).toEqual([])
  })

  it('names only the fields that tripped', () => {
    expect(
      scanText({
        name: 'The Shattered Vale',
        oracle_text: 'this is porn',
        flavor_text: 'fuck it',
      }),
    ).toEqual(['oracle_text', 'flavor_text'])
  })

  it('returns fields in TEXT_FIELDS order regardless of object key order', () => {
    expect(
      scanText({
        flavor_text: 'rape',
        name: 'whore',
      }),
    ).toEqual(['name', 'flavor_text'])
  })

  it('ignores absent, null, and undefined fields', () => {
    expect(scanText({ name: 'Clean Plane', flavor_text: null, chaos_text: undefined })).toEqual([])
  })
})
