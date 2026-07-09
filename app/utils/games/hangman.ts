import { isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const HANGMAN_WORDS = [
  'blockchain',
  'typescript',
  'decentralized',
  'amsterdam',
  'genetic',
  'solana',
  'terminal',
  'inference',
  'validator',
  'keyboard',
  'nosana'
]

const GALLOWS = [
  ['  ┌───┐', '  │   ', '  │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │   │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │  /', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │  / \\', '  │', '──┴──']
]

export function createHangmanGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]!
  const guessed = new Set<string>()
  let wrong = 0

  function masked() {
    return [...word].map((ch) => (guessed.has(ch) ? ch : '_')).join(' ')
  }

  function render(message = '') {
    const wrongLetters = [...guessed].filter((ch) => !word.includes(ch)).join(' ') || '—'
    onFrame(
      [
        `HANGMAN  (type letters, q quits)`,
        '',
        ...GALLOWS[wrong]!,
        '',
        `word:  ${masked()}`,
        `wrong: ${wrongLetters}  (${wrong}/${GALLOWS.length - 1})`,
        message
      ].join('\n')
    )
  }

  function won() {
    return [...word].every((ch) => guessed.has(ch))
  }

  render()

  return {
    onKey(key) {
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        onEnd([`hangman aborted — the word was '${word}'`])
        return true
      }
      if (!/^[a-z]$/.test(lower)) return false
      if (guessed.has(lower)) {
        render(`already tried '${lower}'`)
        return true
      }
      guessed.add(lower)
      if (!word.includes(lower)) wrong++

      if (won()) {
        onEnd([`you win! the word was '${word}' 🎉`, `wrong guesses: ${wrong}`])
      } else if (wrong >= GALLOWS.length - 1) {
        render()
        onEnd([`game over — the word was '${word}'`, 'the hangman sends his regards'])
      } else {
        render()
      }
      return true
    },
    stop: () => {}
  }
}
