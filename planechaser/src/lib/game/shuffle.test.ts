import { shuffleDeck } from './shuffle'

describe('shuffleDeck', () => {
  it('returns an array of the same length', () => {
    expect(shuffleDeck([1, 2, 3, 4, 5])).toHaveLength(5)
  })

  it('contains all original elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleDeck(input)
    expect(result.sort()).toEqual([...input].sort())
  })

  it('handles empty array', () => {
    expect(shuffleDeck([])).toEqual([])
  })

  it('handles single element', () => {
    expect(shuffleDeck([1])).toEqual([1])
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5]
    const copy = [...input]
    shuffleDeck(input)
    expect(input).toEqual(copy)
  })

  it('produces a non-trivial distribution over many trials', () => {
    const counts = [0, 0, 0, 0, 0]
    for (let i = 0; i < 1000; i++) {
      const result = shuffleDeck([1, 2, 3, 4, 5])
      counts[result[0] - 1]++
    }
    // Each value should appear in position 0 at least once
    counts.forEach((count) => expect(count).toBeGreaterThan(0))
  })
})
