import { describe, it, expect } from 'vitest'
import { generateSessionCode, isValidSessionCode } from './session-code'

describe('generateSessionCode', () => {
  it('produces a 6-character alphanumeric string', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('produces unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSessionCode()))
    expect(codes.size).toBe(100)
  })
})

describe('isValidSessionCode', () => {
  it('accepts valid 6-char uppercase alphanumeric', () => {
    expect(isValidSessionCode('ABC123')).toBe(true)
    expect(isValidSessionCode('Z9X8Y7')).toBe(true)
  })

  it('rejects invalid codes', () => {
    expect(isValidSessionCode('')).toBe(false)
    expect(isValidSessionCode('abc123')).toBe(false)
    expect(isValidSessionCode('AB12')).toBe(false)
    expect(isValidSessionCode('ABC-123')).toBe(false)
    expect(isValidSessionCode('ABCDEFG')).toBe(false)
  })
})
