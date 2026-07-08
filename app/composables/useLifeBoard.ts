import { toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { createGrid, seedRandom, step as lifeStep, population, index, type Grid } from '~/utils/gameOfLife'
import { drawGrid } from '~/utils/drawLife'
import { placePattern } from '~/utils/lifePatterns'

// The grid state, colour reading, drawing and canvas-scene wiring shared by the
// three Life surfaces (hero, /life, lvOS app). Each supplies its own controls
// and options; this owns the mechanics they all repeated.

export interface UseLifeBoardOptions {
  cellSize: MaybeRefOrGetter<number>
  /** ms between generations while running */
  stepMs: MaybeRefOrGetter<number>
  draw?: { alpha?: number, grid?: boolean }
  seedDensity?: number
  /** smallest cols/rows (keeps tiny containers sane) */
  minDim?: number
  /** run the loop even under reduced motion (interactive tools) */
  alwaysAnimate?: boolean
  /** when set, the loop only advances while this is true */
  running?: Ref<boolean>
  /** keep the pattern across a resize instead of reseeding (the /life page) */
  preserveOnResize?: boolean
  /** reseed a soup when the board nearly dies (the ambient hero) */
  autoReseed?: boolean
  /** called after each generation (e.g. bump a counter) */
  onAdvance?: () => void
  /** called whenever the board is reset (reseed/clear/place) */
  onReset?: () => void
}

export function useLifeBoard(
  canvasRef: Ref<HTMLCanvasElement | undefined>,
  containerRef: Ref<HTMLElement | undefined>,
  options: UseLifeBoardOptions
) {
  let ctx: CanvasRenderingContext2D | null = null
  let cols = 0
  let rows = 0
  let grid: Grid = new Uint8Array(0)
  let next: Grid = new Uint8Array(0)
  let acc = 0
  const pop = ref(0)

  let hsl = { h: 45, s: 100, l: 50 }
  const readColor = () => {
    const style = getComputedStyle(document.documentElement)
    hsl = {
      h: parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45,
      s: parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100,
      l: parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
    }
  }

  const draw = () => {
    if (!ctx) return
    drawGrid(ctx, grid, cols, rows, {
      cell: toValue(options.cellSize),
      hue: hsl.h,
      sat: hsl.s,
      light: hsl.l,
      alpha: options.draw?.alpha,
      grid: options.draw?.grid
    })
    pop.value = population(grid)
  }

  // internal: reseed without drawing (onResize draws once colours are read)
  const seed = () => {
    grid = seedRandom(cols, rows, options.seedDensity ?? 0.18)
    next = createGrid(cols, rows)
    options.onReset?.()
  }
  // public: reseed and repaint (the "random" control)
  const randomize = () => {
    seed()
    draw()
  }
  const clear = () => {
    grid = createGrid(cols, rows)
    next = createGrid(cols, rows)
    options.onReset?.()
    draw()
  }
  const place = (cells: [number, number][]) => {
    grid = placePattern(cols, rows, cells)
    next = createGrid(cols, rows)
    options.onReset?.()
    draw()
  }
  const advance = () => {
    lifeStep(grid, cols, rows, next)
    ;[grid, next] = [next, grid]
    if (options.autoReseed && population(grid) < grid.length * 0.02) seed()
    options.onAdvance?.()
    draw()
  }

  // paint a single cell under the pointer (value 1 draws, 0 erases)
  const paintAt = (event: PointerEvent, value: 0 | 1 = 1) => {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return
    const cs = toValue(options.cellSize)
    const x = Math.floor((event.clientX - rect.left) / cs)
    const y = Math.floor((event.clientY - rect.top) / cs)
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      grid[index(cols, x, y)] = value
      draw()
    }
  }
  // low-level access for custom brushes (the hero paints a soft radius)
  const setCell = (x: number, y: number, value: 0 | 1) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows) grid[index(cols, x, y)] = value
  }

  const { redraw } = useCanvasScene(canvasRef, containerRef, {
    onResize: (context, w, h) => {
      ctx = context
      const cs = toValue(options.cellSize)
      const min = options.minDim ?? 8
      const nextCols = Math.max(min, Math.floor(w / cs))
      const nextRows = Math.max(min, Math.floor(h / cs))
      if (nextCols !== cols || nextRows !== rows) {
        const oldGrid = grid
        const oldCols = cols
        cols = nextCols
        rows = nextRows
        if (options.preserveOnResize && oldGrid.length) {
          // copy the overlapping region so a resize/zoom keeps the pattern
          grid = createGrid(cols, rows)
          const oldRows = oldGrid.length / oldCols
          for (let y = 0; y < Math.min(rows, oldRows); y++) {
            for (let x = 0; x < Math.min(cols, oldCols); x++) {
              grid[index(cols, x, y)] = oldGrid[y * oldCols + x]!
            }
          }
          next = createGrid(cols, rows)
        } else {
          seed()
        }
      }
      readColor()
      draw()
    },
    onFrame: (context, dt) => {
      ctx = context
      if (options.running && !options.running.value) return
      acc += dt
      if (acc >= toValue(options.stepMs)) {
        acc = 0
        advance()
      }
    }
  }, { alwaysAnimate: options.alwaysAnimate })

  return { pop, redraw, draw, randomize, clear, place, advance, paintAt, setCell, dims: () => ({ cols, rows }) }
}
