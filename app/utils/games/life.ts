import { createTicker, isQuitKey } from '~/utils/terminalGameKit'
import { seedRandom, step as lifeStep, population } from '~/utils/gameOfLife'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const LIFE_W = 46
const LIFE_H = 20
const LIFE_SEED = 0.3

export function createLifeGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
  let gen = 0
  let paused = false

  const render = () => {
    const rule = '─'.repeat(LIFE_W)
    const rows: string[] = []
    for (let y = 0; y < LIFE_H; y++) {
      let row = ''
      for (let x = 0; x < LIFE_W; x++) row += grid[y * LIFE_W + x] ? '█' : ' '
      rows.push(`│${row}│`)
    }
    const header = `conway's game of life — gen ${gen}, pop ${population(grid)}${paused ? '  [paused]' : ''}`
    onFrame([header, `┌${rule}┐`, ...rows, `└${rule}┘`, 'space pause · r reseed · q quit'].join('\n'))
  }

  const tick = () => {
    if (paused) return
    grid = lifeStep(grid, LIFE_W, LIFE_H)
    gen++
    // reseed a soup if the board fizzles out, so it never goes empty
    if (population(grid) < LIFE_W * LIFE_H * 0.02) {
      grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
      gen = 0
    }
    render()
  }

  render()
  const ticker = createTicker(tick, () => 160)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd([`life: exited after ${gen} generations`])
        return true
      }
      if (key === ' ') {
        paused = !paused
        render()
        return true
      }
      if (key.toLowerCase() === 'r') {
        grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
        gen = 0
        render()
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
