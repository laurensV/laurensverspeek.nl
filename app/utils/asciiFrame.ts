// Shared box-drawing helpers for the terminal games. Each game still owns its
// own cell rendering; these remove the repeated border/rule bookkeeping.

/** A horizontal rule `width` chars wide (default light box line). */
export function rule(width: number, ch = '─'): string {
  return ch.repeat(width)
}

/**
 * Wrap already-rendered rows in a box. `innerWidth` is the visible width of the
 * widest row (used for the top/bottom rules); rows are assumed pre-padded.
 */
export function boxed(rows: string[], innerWidth: number): string[] {
  return [`┌${rule(innerWidth)}┐`, ...rows.map((row) => `│${row}│`), `└${rule(innerWidth)}┘`]
}

/** A single ruled row with custom left/join/right corners (for grid tables). */
export function ruledRow(left: string, join: string, right: string, cells: number, cellWidth: number): string {
  return `${left}${Array.from({ length: cells }, () => rule(cellWidth)).join(join)}${right}`
}

/**
 * Render a boolean grid to text with a 1-char border. `cell(value, x, y)` maps
 * each interior cell to its glyph. Used by snake-style bordered boards.
 */
export function borderGrid(
  width: number,
  height: number,
  cell: (x: number, y: number) => string
): string {
  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    let row = ''
    for (let x = 0; x < width; x++) {
      if (y === 0 && x === 0) row += '┌'
      else if (y === 0 && x === width - 1) row += '┐'
      else if (y === height - 1 && x === 0) row += '└'
      else if (y === height - 1 && x === width - 1) row += '┘'
      else if (y === 0 || y === height - 1) row += '─'
      else if (x === 0 || x === width - 1) row += '│'
      else row += cell(x, y)
    }
    rows.push(row)
  }
  return rows.join('\n')
}
