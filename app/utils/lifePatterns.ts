import { createGrid, index, type Grid } from '~/utils/gameOfLife'

// A small library of famous Game of Life patterns, as lists of live (x, y)
// cells. Shared by the /life page and the lvOS Life app.

export interface LifePattern { name: string, cells: [number, number][] }

// pulsar (period-3 oscillator) built from its four-fold symmetry
const pulsar = (): [number, number][] => {
  const arm = [2, 3, 4, 8, 9, 10]
  const out: [number, number][] = []
  for (const y of [0, 5, 7, 12]) for (const x of arm) out.push([x, y])
  for (const x of [0, 5, 7, 12]) for (const y of arm) out.push([x, y])
  return out
}

export const LIFE_PATTERNS: LifePattern[] = [
  { name: 'glider', cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
  { name: 'lwss', cells: [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]] },
  { name: 'pulsar', cells: pulsar() },
  {
    name: 'pentadecathlon',
    cells: [
      [2, 0], [7, 0],
      [0, 1], [1, 1], [3, 1], [4, 1], [5, 1], [6, 1], [8, 1], [9, 1],
      [2, 2], [7, 2]
    ]
  },
  { name: 'acorn', cells: [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]] },
  {
    name: 'gosper gun',
    cells: [
      [0, 4], [0, 5], [1, 4], [1, 5],
      [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8], [14, 5],
      [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
      [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5], [24, 0], [24, 1], [24, 5], [24, 6],
      [34, 2], [34, 3], [35, 2], [35, 3]
    ]
  }
]

/**
 * A fresh grid with a pattern's cells placed centred. Pure — the bounding box
 * comes from the cells, and anything that would fall off the board is dropped.
 */
export function placePattern(cols: number, rows: number, cells: [number, number][]): Grid {
  const grid = createGrid(cols, rows)
  const maxX = Math.max(...cells.map((c) => c[0]))
  const maxY = Math.max(...cells.map((c) => c[1]))
  const ox = Math.floor((cols - maxX) / 2)
  const oy = Math.floor((rows - maxY) / 2)
  for (const [x, y] of cells) {
    const gx = ox + x
    const gy = oy + y
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[index(cols, gx, gy)] = 1
  }
  return grid
}
