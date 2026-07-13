// The walkable museum: the /museum wings become real rooms, stacked into one
// long gallery. Pure grid logic — building, movement, plaque proximity and
// the ASCII viewport — so the whole floor is unit-testable; the page only
// wires keys to moves.

export interface WalkWing {
  title: string
  exhibits: { name: string }[]
}

export interface PlaqueRef {
  wing: number
  exhibit: number
}

interface Cell {
  ch: string
  walkable: boolean
  plaque?: PlaqueRef
}

export interface MuseumMap {
  grid: Cell[][]
  width: number
  height: number
  spawn: { x: number, y: number }
  /** Row band each wing's room occupies, for the HUD's "current wing" */
  wingRows: { from: number, to: number }[]
}

const INNER_W = 51
const INNER_H = 7

// each side wall holds at most one plaque per row, so a room must be tall
// enough for half its exhibits — grow it rather than ever drop a plaque
const roomHeight = (exhibits: number) => Math.max(INNER_H, Math.ceil(exhibits / 2))

/** Stack one room per wing, doors centered in the shared walls. */
export function buildMuseumMap(wings: WalkWing[]): MuseumMap {
  const width = INNER_W + 2
  const heights = wings.map((wing) => roomHeight(wing.exhibits.length))
  const height = 1 + heights.reduce((sum, h) => sum + h + 1, 0)
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ ch: ' ', walkable: false }))
  )

  const wall = (x: number, y: number) => (grid[y]![x] = { ch: '#', walkable: false })
  // floor MUST be a full-width ASCII glyph: '·' (U+00B7) is "covered" by
  // JetBrains Mono but renders at ~half an ASCII advance, so floor rows used to
  // collapse leftward and the whole grid looked jagged and shifted while walking
  const floor = (x: number, y: number) => (grid[y]![x] = { ch: '.', walkable: true })
  const doorX = Math.floor(width / 2)

  const wingRows: MuseumMap['wingRows'] = []

  let top = 0
  wings.forEach((wing, w) => {
    const innerH = heights[w]!
    const bottom = top + innerH + 1
    wingRows.push({ from: top, to: bottom })
    // walls: top (shared), sides, and the final bottom
    for (let x = 0; x < width; x++) wall(x, top)
    for (let y = top + 1; y < bottom; y++) {
      wall(0, y)
      wall(width - 1, y)
      for (let x = 1; x < width - 1; x++) floor(x, y)
    }
    if (w === wings.length - 1) for (let x = 0; x < width; x++) wall(x, bottom)
    // a door in every shared wall (not the museum's outer top wall)
    if (w > 0) grid[top]![doorX] = { ch: '+', walkable: true }

    // plaques hang on the room's own west and east walls — side walls are
    // never shared between rooms and never carry doors
    const half = Math.ceil(wing.exhibits.length / 2)
    const place = (count: number, offset: number, x: number) => {
      if (!count) return
      const step = innerH / count
      for (let i = 0; i < count; i++) {
        const y = top + 1 + Math.min(innerH - 1, Math.floor(step * (i + 0.5)))
        grid[y]![x] = { ch: '?', walkable: false, plaque: { wing: w, exhibit: offset + i } }
      }
    }
    place(half, 0, 0)
    place(wing.exhibits.length - half, half, width - 1)
    top = bottom
  })

  return {
    grid,
    width,
    height,
    spawn: { x: doorX, y: Math.floor((heights[0] ?? INNER_H) / 2) + 1 },
    wingRows
  }
}

/** Step the visitor one cell; walls and plaques stop them. */
export function moveVisitor(
  map: MuseumMap,
  pos: { x: number, y: number },
  dx: number,
  dy: number
): { x: number, y: number } {
  const x = pos.x + Math.sign(dx)
  const y = pos.y + Math.sign(dy)
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return pos
  return map.grid[y]![x]!.walkable ? { x, y } : pos
}

/** The plaque the visitor is standing next to (8 neighbours), if any. */
export function nearbyPlaque(map: MuseumMap, pos: { x: number, y: number }): PlaqueRef | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = map.grid[pos.y + dy]?.[pos.x + dx]
      if (cell?.plaque) return cell.plaque
    }
  }
  return null
}

/** Which wing's room the visitor is in. */
export function currentWing(map: MuseumMap, pos: { x: number, y: number }): number {
  const index = map.wingRows.findIndex((band) => pos.y >= band.from && pos.y <= band.to)
  return index === -1 ? 0 : index
}

/**
 * Render a vertical camera window around the visitor. The map is narrower
 * than most terminals, so only the y-axis scrolls.
 */
export function renderMuseum(
  map: MuseumMap,
  pos: { x: number, y: number },
  viewH = 21,
  highlight?: PlaqueRef | null
): string {
  const half = Math.floor(viewH / 2)
  const from = Math.max(0, Math.min(pos.y - half, map.height - viewH))
  const rows: string[] = []
  for (let y = from; y < Math.min(from + viewH, map.height); y++) {
    let row = ''
    for (let x = 0; x < map.width; x++) {
      if (x === pos.x && y === pos.y) {
        row += '@'
        continue
      }
      const cell = map.grid[y]![x]!
      row += cell.plaque && highlight
        && cell.plaque.wing === highlight.wing && cell.plaque.exhibit === highlight.exhibit
        ? '!'
        : cell.ch
    }
    rows.push(row)
  }
  return rows.join('\n')
}
