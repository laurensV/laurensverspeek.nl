import { isQuitKey } from '~/utils/terminalGameKit'
import { createRelayDuel } from '~/utils/games/relayDuel'
import { wpmStats, wrapPassage } from '~/utils/games/wpm'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import type { RaceJoinIn, RaceLeaveIn, RaceProgressIn } from '../../../realtime/protocol'

// The online typing race: two visitors, one passage (from the same corpus the
// solo test uses — realtime/race-core.mjs), and a server that holds the
// stopwatch and the finish line. This side renders and reports how many
// leading characters are correct; the win is declared by the relay.

const RACE_WIDTH = 46

interface OnlineRaceOptions {
  wsUrl: string
  playerName: string
}

export function createWpmRace(
  { wsUrl, playerName }: OnlineRaceOptions,
  { onFrame, onEnd }: GameCallbacks
): GameHandle {
  let phase: 'connecting' | 'waiting' | 'ready' | 'racing' = 'connecting'
  let text = ''
  let wrapped: string[] = []
  let foe = ''
  let typed = ''
  let foeChars = 0
  let keystrokes = 0
  let errors = 0
  let startedAt = 0
  let done = false

  // progress = leading correct characters; you can't sprint past a typo
  const correctPrefix = () => {
    let i = 0
    while (i < typed.length && typed[i] === text[i]) i++
    return i
  }

  const renderLobby = (dots = 0) => {
    const line = phase === 'connecting' ? 'dialing the racetrack' : 'waiting for another visitor to type `wpm race`'
    onFrame(['WPM RACE', '', `${line}${'.'.repeat(dots)}`, '', '(q backs out)'].join('\n'))
  }

  const bar = (chars: number) => {
    const width = 30
    const filled = text.length ? Math.round((chars / text.length) * width) : 0
    return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${Math.round((chars / Math.max(1, text.length)) * 100)}%`
  }

  const render = () => {
    const me = playerName || 'you'
    const rows: string[] = [
      phase === 'ready' ? `WPM RACE vs ${foe} — fingers on keys…` : `WPM RACE vs ${foe}  (type the passage, q forfeits)`,
      ''
    ]
    let offset = 0
    for (const line of wrapped) {
      rows.push(`  ${line}`)
      let markers = ''
      for (let i = offset; i < offset + line.length; i++) {
        if (i < typed.length) markers += typed[i] === text[i] ? '·' : 'x'
        else markers += i === typed.length ? '_' : ' '
      }
      rows.push(`  ${markers}`)
      offset += line.length + 1
    }
    const mine = correctPrefix()
    const { wpm } = wpmStats(mine, keystrokes, errors, startedAt ? Date.now() - startedAt : 0)
    rows.push('', `  ${me.padEnd(12)} ${bar(mine)}  ${wpm} wpm`, `  ${foe.padEnd(12)} ${bar(foeChars)}`)
    if (phase === 'ready') rows.push('', '  GET READY — the flag drops in a moment')
    onFrame(rows.join('\n'))
  }

  const finish = (lines: string[]) => {
    if (done) return
    done = true
    duel.teardown()
    onEnd(lines)
  }

  const duel = createRelayDuel({
    wsUrl,
    join: { type: 'race-join', name: playerName } satisfies RaceJoinIn,
    leave: { type: 'race-leave' } satisfies RaceLeaveIn,
    onOpen: () => renderLobby(),
    spinner: { active: () => phase === 'connecting' || phase === 'waiting', tick: renderLobby },
    onFail: () => finish(['wpm: the relay is unreachable — the racetrack is closed right now']),
    onDrop: () => finish(['wpm: connection lost — the race dissolves at the starting line']),
    onFrame: (msg) => {
      if (msg.type === 'race-wait') {
        phase = 'waiting'
        renderLobby()
      } else if (msg.type === 'race-start') {
        phase = 'ready'
        foe = msg.foe || 'a visitor'
        text = msg.text
        wrapped = wrapPassage(text, RACE_WIDTH)
        render()
      } else if (msg.type === 'race-go') {
        phase = 'racing'
        startedAt = Date.now()
        render()
      } else if (msg.type === 'race-foe') {
        foeChars = msg.chars
        if (phase === 'racing') render()
      } else if (msg.type === 'race-end') {
        // a win over a real visitor joins the shared tally (hall of fame, pet coins)
        if (msg.youWon) duel.recordWin('lv-wpm-race-wins')
        const mine = correctPrefix()
        const { wpm, accuracy } = wpmStats(mine, keystrokes, errors, startedAt ? Date.now() - startedAt : 0)
        const stats = startedAt ? ` (${wpm} wpm · ${accuracy}% acc)` : ''
        finish(msg.forfeit
          ? [msg.youWon ? `${foe} bailed out — you win by forfeit!${stats}` : 'you forfeited. the keyboard remembers.']
          : [msg.youWon ? `you out-typed ${foe}!${stats} a real human, out-clacked.` : `${foe} crossed the line first${stats} — faster thumbs next time.`])
      }
    }
  })

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        finish([`wpm: ${phase === 'racing' ? 'race forfeited — your opponent coasts to the finish' : 'left the racetrack lobby'}`])
        return true
      }
      if (phase !== 'racing') return true // swallow eager typing before the flag
      if (key === 'Backspace') {
        typed = typed.slice(0, -1)
        render()
        return true
      }
      if (key.length !== 1) return false
      keystrokes++
      if (key !== text[typed.length]) errors++
      typed += key
      duel.send({ type: 'race-progress', chars: correctPrefix() } satisfies RaceProgressIn)
      render()
      return true
    },
    stop: duel.teardown
  }
}
