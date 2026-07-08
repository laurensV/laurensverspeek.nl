// Conway's Game of Life on a toroidal (wrapping) board. Pure and framework-free
// so it can be unit-tested and shared by the hero canvas and the /life page.

export type Grid = Uint8Array

export const index = (cols: number, x: number, y: number) => y * cols + x

export function createGrid(cols: number, rows: number): Grid {
  return new Uint8Array(cols * rows)
}

export function seedRandom(cols: number, rows: number, density = 0.16): Grid {
  const grid = new Uint8Array(cols * rows)
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < density ? 1 : 0
  return grid
}

export function population(grid: Grid): number {
  let n = 0
  for (let i = 0; i < grid.length; i++) n += grid[i]!
  return n
}

/**
 * Advance one generation. Writes into `next` (allocated if omitted) and returns
 * it, so callers can ping-pong two buffers without per-tick allocation.
 */
export function step(grid: Grid, cols: number, rows: number, next: Grid = new Uint8Array(grid.length)): Grid {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = (x + dx + cols) % cols
          const ny = (y + dy + rows) % rows
          n += grid[ny * cols + nx]!
        }
      }
      const alive = grid[y * cols + x]!
      next[y * cols + x] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0
    }
  }
  return next
}
