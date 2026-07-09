import { boxed } from '~/utils/asciiFrame'
import { createTicker, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

// `telnet towel.blinkenlights.nl` — an original homage to the famous ASCII
// Star Wars asciimation (the real, full one lives at asciimation.co.nz).
// Hand-drawn scenes, each shown for its own duration, played once through.

const WIDTH = 46
const HEIGHT = 9

interface Scene {
  ms: number
  art: string[]
}

const SCENES: Scene[] = [
  {
    ms: 2400,
    art: [
      'A long time ago in a galaxy far,',
      'far away...'
    ]
  },
  {
    ms: 2600,
    art: [
      ' _____ _______       _____',
      '/ ____|__   __|/\\   |  __ \\',
      '| (___    | |  /  \\  | |__) |',
      ' \\___ \\   | | / /\\ \\ |  _  /',
      ' ____) |  | |/ ____ \\| | \\ \\',
      '|_____/   |_/_/    \\_\\_|  \\_\\',
      '',
      'W   A   R   S'
    ]
  },
  {
    ms: 2600,
    art: [
      'Episode IV.V',
      'A NEW SITE',
      '',
      'It is a period of civil war',
      'between light mode and dark mode.'
    ]
  },
  {
    ms: 2600,
    art: [
      'Rebel visitors, striking from a',
      'hidden terminal, have won their',
      'first victory against the evil',
      'Galactic Empire of unstyled pages.'
    ]
  },
  {
    ms: 2400,
    art: [
      'Pursued by the Empire\'s sinister',
      'agents, a lone tilde key races',
      'home aboard this website...'
    ]
  },
  {
    ms: 2400,
    art: [
      '<=[]==>',
      '        \\',
      '         \\',
      '   _______\\__________',
      '   \\                 \\',
      '    \\_________________\\',
      '',
      'pew pew'
    ]
  },
  {
    ms: 2600,
    art: [
      ' [==]        o',
      ' (oo)       /|\\',
      ' |__|       / \\',
      '',
      '"beep boop"     "We\'re doomed."'
    ]
  },
  {
    ms: 2600,
    art: [
      '   \\o',
      '    |',
      '   / \\',
      '',
      '"These aren\'t the droids',
      ' you\'re looking for."'
    ]
  },
  {
    ms: 2600,
    art: [
      'o====[]::::::::::>  <::::::::::[]====o',
      '',
      'obi-wan                (heavy breathing)'
    ]
  },
  {
    ms: 2400,
    art: [
      '|  |     |     |  |',
      '|  |   =[+]=   |  |',
      '|  |     |     |  |',
      '',
      '"Stay on target..."'
    ]
  },
  {
    ms: 2000,
    art: [
      '       *       *',
      '   *    \\ | /    *',
      '     -- (BOOM) --',
      '   *    / | \\    *',
      '       *       *'
    ]
  },
  {
    ms: 2600,
    art: [
      '   o   o   o',
      '  /|\\ /|\\ /|\\',
      '  / \\ / \\ / \\',
      '',
      'The dot-grid is safe again.'
    ]
  },
  {
    ms: 3000,
    art: [
      'THE END',
      '',
      'an asciimation homage —',
      'the real 20-minute masterpiece',
      'lives at asciimation.co.nz'
    ]
  }
]

const center = (line: string) => {
  const left = Math.max(0, Math.floor((WIDTH - line.length) / 2))
  return (' '.repeat(left) + line).padEnd(WIDTH, ' ').slice(0, WIDTH)
}

export function createStarwarsGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let index = 0

  const render = () => {
    const scene = SCENES[index]!
    const top = Math.max(0, Math.floor((HEIGHT - scene.art.length) / 2))
    const rows = Array.from({ length: HEIGHT }, (_, y) => center(scene.art[y - top] ?? ''))
    onFrame([
      ...boxed(rows, WIDTH),
      `towel.blinkenlights.nl · ${index + 1}/${SCENES.length} · q to quit`
    ].join('\n'))
  }

  const finish = (lines: string[]) => {
    ticker.stop()
    onEnd(lines)
  }

  const advance = () => {
    index++
    if (index >= SCENES.length) {
      finish(['Connection closed by foreign host.'])
      return
    }
    render()
  }

  render()
  const ticker = createTicker(advance, () => SCENES[Math.min(index, SCENES.length - 1)]!.ms)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        finish(['^]', 'Connection closed.'])
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
