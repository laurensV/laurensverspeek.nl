import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import { storageGetJson, storageSetJson, storageRemove } from '~/utils/safeStorage'
import type { AdvState } from './types'
import { ROOMS } from './rooms'
import { advCommand, initialAdvState, describeRoom } from './engine'

// The GameHandle wrapper: adds the line editor, frame rendering and saves on
// top of the pure engine in engine.ts.

const SAVE_KEY = 'lv-adventure'

const isAdvState = (parsed: unknown): parsed is AdvState => {
  if (typeof parsed !== 'object' || parsed === null) return false
  const candidate = parsed as Record<string, unknown>
  return typeof candidate.room === 'string' && candidate.room in ROOMS
    && Array.isArray(candidate.inv) && candidate.inv.every((item) => typeof item === 'string')
    && typeof candidate.flags === 'object' && candidate.flags !== null
    && typeof candidate.moves === 'number'
}

const loadAdventure = (): AdvState | null => storageGetJson(SAVE_KEY, isAdvState)

const wrap = (text: string, width = 62): string[] => {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      if (line && `${line} ${word}`.length > width) {
        out.push(line)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    out.push(line)
  }
  return out
}

export function createAdventureGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const saved = loadAdventure()
  let state = saved ?? initialAdvState()
  let buffer = ''
  const transcript: string[] = []

  const say = (lines: string[]) => {
    for (const line of lines) transcript.push(...(line ? wrap(line) : ['']))
  }

  say(saved
    ? ['ADVENTURE — resumed where you left off ("restart" begins anew).', '']
    : ['ADVENTURE — the site is the dungeon. "help" lists the verbs.', ''])
  say(describeRoom(state))

  const render = () => {
    const view = transcript.slice(-15)
    onFrame([...view, '', `> ${buffer}█`, '(Esc saves & quits)'].join('\n'))
  }
  render()

  const finish = (lines: string[]) => onEnd(lines)

  return {
    onKey: (key: string) => {
      if (key === 'Escape') {
        storageSetJson(SAVE_KEY, state)
        finish(['adventure: saved. the dungeon holds its breath until you return.'])
        return true
      }
      if (key === 'Backspace') {
        buffer = buffer.slice(0, -1)
        render()
        return true
      }
      if (key === 'Enter') {
        const input = buffer.trim()
        buffer = ''
        if (!input) {
          render()
          return true
        }
        say([`> ${input}`])
        const result = advCommand(state, input)
        state = result.state
        say(result.lines)
        if (result.done === 'quit') {
          storageSetJson(SAVE_KEY, state)
          finish(['adventure: saved. the dungeon holds its breath until you return.'])
          return true
        }
        if (result.done === 'dead') {
          storageRemove(SAVE_KEY)
          finish([...result.lines, 'adventure: game over — run it again to try anew.'])
          return true
        }
        if (result.done === 'win') {
          storageRemove(SAVE_KEY)
          finish(result.lines)
          return true
        }
        storageSetJson(SAVE_KEY, state)
        render()
        return true
      }
      if (key.length === 1 && buffer.length < 60) {
        buffer += key
        render()
        return true
      }
      return false
    },
    stop: () => storageSetJson(SAVE_KEY, state)
  }
}
