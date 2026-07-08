import { index, type Grid } from '~/utils/gameOfLife'

// Shared canvas renderer for a Life board, so the hero, /life and the lvOS app
// don't each hand-roll the same cell loop. Colours are passed as raw HSL parts
// (read from the Bulma primary variable by the caller).

export interface DrawGridOptions {
  cell: number
  hue: number
  sat: number
  light: number
  /** cell fill opacity (the hero draws dim cells) */
  alpha?: number
  /** draw a faint background grid (the /life page does) */
  grid?: boolean
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  cols: number,
  rows: number,
  { cell, hue, sat, light, alpha = 1, grid: showGrid = false }: DrawGridOptions
) {
  const w = cols * cell
  const h = rows * cell
  ctx.clearRect(0, 0, w, h)

  if (showGrid) {
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.06)`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h) }
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell) }
    ctx.stroke()
  }

  ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`
  const size = cell - 2
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[index(cols, x, y)]) ctx.fillRect(x * cell + 1, y * cell + 1, size, size)
    }
  }
}
