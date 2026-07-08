import { describe, it, expect } from 'vitest'
import { LIFE_PATTERNS, placePattern } from '~/utils/lifePatterns'
import { population, index } from '~/utils/gameOfLife'

describe('LIFE_PATTERNS', () => {
  it('every pattern has a name and at least one cell', () => {
    expect(LIFE_PATTERNS.length).toBeGreaterThan(3)
    for (const p of LIFE_PATTERNS) {
      expect(p.name).toBeTruthy()
      expect(p.cells.length).toBeGreaterThan(0)
    }
  })
})

describe('placePattern', () => {
  it('places every cell of a pattern that fits', () => {
    const glider = LIFE_PATTERNS.find((p) => p.name === 'glider')!
    const grid = placePattern(30, 30, glider.cells)
    expect(population(grid)).toBe(glider.cells.length)
  })

  it('centres the pattern on the board', () => {
    // a single cell at (0,0) lands in the middle of the grid
    const grid = placePattern(11, 11, [[0, 0]])
    expect(grid[index(11, 5, 5)]).toBe(1)
    expect(population(grid)).toBe(1)
  })

  it('drops cells that fall off a too-small board rather than throwing', () => {
    const gun = LIFE_PATTERNS.find((p) => p.name === 'gosper gun')!
    const grid = placePattern(6, 6, gun.cells)
    // some cells survive-or-none, but it must not overflow the buffer
    expect(population(grid)).toBeLessThanOrEqual(gun.cells.length)
  })
})
