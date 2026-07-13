import { finalScoreLines, createTicker } from '~/utils/terminalGameKit'
import { RACE_PASSAGES } from '../../../realtime/race-core.mjs'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const WPM_HIGHSCORE_KEY = 'lv-wpm-highscore'
const WPM_WIDTH = 46

// one corpus for the solo test AND the online race (realtime/race-core.mjs)
const WPM_PASSAGES = RACE_PASSAGES

/** Words-per-minute (5 chars = 1 word) and accuracy over all keystrokes. */
export function wpmStats(correctChars: number, keystrokes: number, errors: number, elapsedMs: number) {
  const minutes = elapsedMs / 60_000
  const wpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0
  const accuracy = keystrokes > 0 ? Math.round(((keystrokes - errors) / keystrokes) * 100) : 100
  return { wpm, accuracy }
}

/** Word-wrap that keeps the join reversible: lines.join(' ') === text. */
export function wrapPassage(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

// A typing test: type the passage, markers under each line show hits (·) and
// misses (x). Ends when the passage length is reached; Esc aborts.
export function createWpmGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const passage = WPM_PASSAGES[Math.floor(Math.random() * WPM_PASSAGES.length)]!
  const wrapped = wrapPassage(passage, WPM_WIDTH)
  let typed = ''
  let errors = 0
  let keystrokes = 0
  let startedAt = 0

  const elapsed = () => (startedAt ? Date.now() - startedAt : 0)

  const render = () => {
    const rows: string[] = ['WPM TEST  (type the passage, Esc quits)', '']
    let offset = 0
    for (const line of wrapped) {
      rows.push(`  ${line}`)
      let markers = ''
      for (let i = offset; i < offset + line.length; i++) {
        if (i < typed.length) markers += typed[i] === passage[i] ? '·' : 'x'
        else markers += i === typed.length ? '_' : ' '
      }
      rows.push(`  ${markers}`)
      offset += line.length + 1 // +1 for the space swallowed by the wrap
    }
    const { wpm, accuracy } = wpmStats(countCorrect(), keystrokes, errors, elapsed())
    rows.push('', `  ${(elapsed() / 1000).toFixed(1)}s · ${wpm} wpm · ${accuracy}% acc`)
    onFrame(rows.join('\n'))
  }

  const countCorrect = () => [...typed].filter((ch, i) => ch === passage[i]).length

  const ticker = createTicker(render, () => 500)

  const finish = () => {
    ticker.stop()
    const { wpm, accuracy } = wpmStats(countCorrect(), keystrokes, errors, elapsed())
    onEnd(
      finalScoreLines(WPM_HIGHSCORE_KEY, wpm, {
        headline: 'test complete!',
        scoreLabel: `${wpm} wpm · ${accuracy}% accuracy · ${(elapsed() / 1000).toFixed(1)}s`
      })
    )
  }

  render()

  return {
    acceptsText: true,
    onKey(key) {
      if (key === 'Escape') {
        ticker.stop()
        onEnd(['typing test aborted — the keyboard lives to fight another day'])
        return true
      }
      if (key === 'Backspace') {
        typed = typed.slice(0, -1)
        render()
        return true
      }
      if (key.length !== 1) return false
      if (!startedAt) {
        startedAt = Date.now()
        ticker.start()
      }
      keystrokes++
      if (key !== passage[typed.length]) errors++
      typed += key
      if (typed.length >= passage.length) finish()
      else render()
      return true
    },
    stop: () => ticker.stop()
  }
}
