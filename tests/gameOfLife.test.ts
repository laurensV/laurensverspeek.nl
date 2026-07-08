import { describe, it, expect } from 'vitest'
import { createGrid, step, population, index } from '~/utils/gameOfLife'

// helper: set live cells by (x, y) on a cols×rows grid
const make = (cols: number, rows: number, cells: [number, number][]) => {
  const g = createGrid(cols, rows)
  for (const [x, y] of cells) g[index(cols, x, y)] = 1
  return g
}

describe('game of life step', () => {
  it('keeps a 2×2 block stable (still life)', () => {
    const cols = 5, rows = 5
    const block = make(cols, rows, [[1, 1], [2, 1], [1, 2], [2, 2]])
    const next = step(block, cols, rows)
    expect([...next]).toEqual([...block])
  })

  it('oscillates a blinker with period 2', () => {
    const cols = 5, rows = 5
    const horizontal = make(cols, rows, [[1, 2], [2, 2], [3, 2]])
    const vertical = make(cols, rows, [[2, 1], [2, 2], [2, 3]])
    const gen1 = step(horizontal, cols, rows)
    expect([...gen1]).toEqual([...vertical])
    const gen2 = step(gen1, cols, rows)
    expect([...gen2]).toEqual([...horizontal])
  })

  it('kills a lone cell (underpopulation)', () => {
    const cols = 3, rows = 3
    const lone = make(cols, rows, [[1, 1]])
    expect(population(step(lone, cols, rows))).toBe(0)
  })

  it('births a cell with exactly three neighbours', () => {
    const cols = 4, rows = 4
    // an L of three cells; the empty corner they surround should come alive
    const g = make(cols, rows, [[1, 1], [2, 1], [1, 2]])
    const next = step(g, cols, rows)
    expect(next[index(cols, 2, 2)]).toBe(1)
  })
})
