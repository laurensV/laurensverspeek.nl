import { finalScoreLines, isQuitKey } from '~/utils/terminalGameKit'
import { ruledRow } from '~/utils/asciiFrame'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

type Matrix = number[][]

const G2048_HIGHSCORE_KEY = 'lv-2048-highscore'

export function create2048Game({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let grid: Matrix = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0))
  let score = 0
  let reached2048 = false

  const addTile = () => {
    const empty: [number, number][] = []
    grid.forEach((row, y) => row.forEach((cell, x) => !cell && empty.push([y, x])))
    if (!empty.length) return
    const [y, x] = empty[Math.floor(Math.random() * empty.length)]!
    grid[y]![x] = Math.random() < 0.9 ? 2 : 4
  }

  /** Slide + merge one row to the left; returns the new row. */
  const slideRow = (row: number[]): number[] => {
    const tiles = row.filter(Boolean)
    const merged: number[] = []
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        const value = tiles[i]! * 2
        score += value
        if (value === 2048) reached2048 = true
        merged.push(value)
        i++
      } else {
        merged.push(tiles[i]!)
      }
    }
    while (merged.length < 4) merged.push(0)
    return merged
  }

  const transpose = (m: Matrix): Matrix => m[0]!.map((_, x) => m.map((row) => row[x]!))
  const mirror = (m: Matrix): Matrix => m.map((row) => [...row].reverse())

  const slide = (direction: 'left' | 'right' | 'up' | 'down'): boolean => {
    const before = JSON.stringify(grid)
    if (direction === 'left') grid = grid.map(slideRow)
    if (direction === 'right') grid = mirror(mirror(grid).map(slideRow))
    if (direction === 'up') grid = transpose(transpose(grid).map(slideRow))
    if (direction === 'down') grid = transpose(mirror(mirror(transpose(grid)).map(slideRow)))
    return JSON.stringify(grid) !== before
  }

  const canMove = () =>
    grid.some((row, y) =>
      row.some(
        (cell, x) => !cell || cell === grid[y]?.[x + 1] || cell === grid[y + 1]?.[x]
      )
    )

  function render(message = '') {
    const line = (l: string, m: string, r: string) => ruledRow(l, m, r, 4, 6)
    const rows = grid
      .map((row) => `│${row.map((cell) => (cell ? String(cell).padStart(5, ' ') + ' ' : '      ')).join('│')}│`)
      .join(`\n${line('├', '┼', '┤')}\n`)
    onFrame(
      `2048  score: ${score}${reached2048 ? '  🏆' : ''}  (arrows/wasd, q quits)\n\n`
      + `${line('┌', '┬', '┐')}\n${rows}\n${line('└', '┴', '┘')}\n${message}`
    )
  }

  function end(message: string) {
    onEnd(finalScoreLines(G2048_HIGHSCORE_KEY, score, { headline: message }))
  }

  addTile()
  addTile()
  render()

  const DIRECTIONS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    arrowup: 'up',
    w: 'up',
    arrowdown: 'down',
    s: 'down'
  }

  return {
    onKey(key) {
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        end('2048 terminated by user')
        return true
      }
      const direction = DIRECTIONS[lower]
      if (!direction) return false
      const moved = slide(direction)
      if (moved) {
        addTile()
        if (!canMove()) {
          render()
          end('game over — out of moves, the heap is fragmented')
          return true
        }
      }
      render(moved ? '' : '(nothing moved)')
      return true
    },
    stop: () => {}
  }
}

