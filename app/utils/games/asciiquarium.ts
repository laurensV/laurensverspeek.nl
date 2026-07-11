import { createTicker, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

// A little ASCII fish tank that swims in the terminal until you press q — the
// same self-animating GameHandle shape as `top` (a ticker drives onFrame,
// isQuitKey ends it). Fish wrap around; the odd bubble rises to the surface.

const WIDTH = 48
const HEIGHT = 12

interface Fish { x: number, y: number, dir: 1 | -1, right: string, left: string }

const SPECIES = [
  { right: '><>', left: '<><' },
  { right: '><(((°>', left: '<°)))><' },
  { right: '>|=°>', left: '<°=|<' },
  { right: '><=°>', left: '<°=><' }
]

const randRow = () => 2 + Math.floor(Math.random() * (HEIGHT - 4))

export function createAquarium({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const fish: Fish[] = Array.from({ length: 6 }, (_, i) => {
    const species = SPECIES[i % SPECIES.length]!
    return {
      x: Math.floor(Math.random() * WIDTH),
      y: randRow(),
      dir: Math.random() < 0.5 ? 1 : -1,
      right: species.right,
      left: species.left
    }
  })
  const bubbles: { x: number, y: number }[] = []

  const render = () => {
    const grid: string[][] = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill(' '))
    // water surface and sandy floor
    for (let x = 0; x < WIDTH; x++) {
      grid[0]![x] = '~'
      grid[HEIGHT - 1]![x] = '^'
    }
    // a few strands of seaweed
    for (const sx of [4, 12, 24, WIDTH - 8, WIDTH - 4]) {
      for (let y = HEIGHT - 2; y > HEIGHT - 5; y--) grid[y]![sx] = y % 2 ? ')' : '('
    }
    for (const b of bubbles) {
      if (b.y > 0 && b.y < HEIGHT - 1 && b.x >= 0 && b.x < WIDTH) grid[b.y]![b.x] = 'o'
    }
    for (const f of fish) {
      const sprite = f.dir === 1 ? f.right : f.left
      for (let i = 0; i < sprite.length; i++) {
        const x = f.x + i
        if (x >= 0 && x < WIDTH && f.y > 0 && f.y < HEIGHT - 1) grid[f.y]![x] = sprite[i]!
      }
    }
    const border = `+${'-'.repeat(WIDTH)}+`
    const rows = grid.map((row) => `|${row.join('')}|`)
    onFrame([border, ...rows, border, 'asciiquarium — q to surface'].join('\n'))
  }

  const step = () => {
    for (const f of fish) {
      f.x += f.dir
      const sprite = f.dir === 1 ? f.right : f.left
      if (f.dir === 1 && f.x > WIDTH) { f.x = -sprite.length; f.y = randRow() }
      if (f.dir === -1 && f.x < -sprite.length) { f.x = WIDTH; f.y = randRow() }
      if (Math.random() < 0.08) bubbles.push({ x: f.dir === 1 ? f.x + sprite.length : f.x, y: f.y })
    }
    for (const b of bubbles) b.y -= 1
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i]!.y <= 0) bubbles.splice(i, 1)
    render()
  }

  render()
  const ticker = createTicker(step, () => 220)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd(['asciiquarium: you step away from the tank.'])
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
