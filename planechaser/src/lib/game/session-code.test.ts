import { describe, it, expect } from 'vitest'
import { generateSessionCode, isValidSessionCode } from './session-code'

describe('generateSessionCode', () => {
  it('produces a 6-character code from valid charset', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
  })

  it('produces unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSessionCode()))
    expect(codes.size).toBe(100)
  })

  it('never generates confusing characters (0, O, 1, I)', () => {
    const codes = Array.from({ length: 200 }, () => generateSessionCode())
    const all = codes.join('')
    expect(all).not.toMatch(/[01OI]/)
  })
})

describe('isValidSessionCode', () => {
  it('accepts valid 6-char codes from the charset', () => {
    expect(isValidSessionCode('ABCDEF')).toBe(true)
    expect(isValidSessionCode('Z9X8Y7')).toBe(true)
    expect(isValidSessionCode('HJ2NP3')).toBe(true)
  })

  it('rejects codes with confusing characters', () => {
    expect(isValidSessionCode('ABC1DE')).toBe(false)
    expect(isValidSessionCode('A0CDEF')).toBe(false)
    expect(isValidSessionCode('OABCDE')).toBe(false)
    expect(isValidSessionCode('IABCDE')).toBe(false)
  })

  it('rejects invalid codes', () => {
    expect(isValidSessionCode('')).toBe(false)
    expect(isValidSessionCode('abc123')).toBe(false)
    expect(isValidSessionCode('AB34')).toBe(false)
    expect(isValidSessionCode('ABC-DE')).toBe(false)
    expect(isValidSessionCode('ABCDEFG')).toBe(false)
  })
})
