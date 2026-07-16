import { createRelayDuel } from '~/utils/games/relayDuel'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import type { ServerMessage, PairJoinIn, PairLeaveIn, PairRunIn } from '../../../realtime/protocol'

// The guest side of the pair terminal (`pair join <CODE>`): a GameHandle that
// takes over the terminal and renders the host's mirrored transcript live.
// While the host has granted the keyboard, a typed line + Enter sends the
// command to run on THEIR shell. Only Escape leaves — letters are typing.
// Everything renders as plain text through the game-frame pre; the host
// already stripped html and the relay rebuilt every line, but nothing here
// goes near v-html anyway.

interface PairWatchOptions {
  code: string
  cursorsWs: string
  playerName: string
}

/** rolling transcript cap — the relay replays ~30 lines, the rest streams */
const FEED_MAX = 200

export function createPairWatch(
  { code, cursorsWs, playerName }: PairWatchOptions,
  { onFrame, onEnd }: GameCallbacks
): GameHandle {
  let phase: 'connecting' | 'watching' = 'connecting'
  let watchers = 0
  let granted = false
  let buffer = ''
  let done = false
  const feed: string[] = []

  const append = (line: string) => {
    feed.push(line)
    if (feed.length > FEED_MAX) feed.splice(0, feed.length - FEED_MAX)
  }

  const render = () => {
    const status = phase === 'connecting'
      ? `pair session ${code} — connecting…`
      : `pair session ${code} — ${watchers} watching · keyboard: ${granted ? 'granted' : 'view-only'}`
    const rows = [
      `${status}  (esc leaves)`,
      '',
      ...(feed.length ? feed : ['(waiting for the host\'s terminal…)']),
      ''
    ]
    if (granted) rows.push(`${playerName}> ${buffer}▌   (enter runs it on the host's shell)`)
    else rows.push(`(view-only — the host can 'pair allow' you the keyboard)`)
    onFrame(rows.join('\n'))
  }

  const duel = createRelayDuel({
    wsUrl: cursorsWs,
    join: { type: 'pair-join', code } satisfies PairJoinIn,
    leave: { type: 'pair-leave' } satisfies PairLeaveIn,
    onFail: () => finish(['pair: could not reach the relay — nobody to watch today.']),
    onDrop: () => finish(['pair: connection lost — the session is gone.']),
    onFrame: (msg: ServerMessage) => {
      if (msg.type === 'pair-joined') {
        phase = 'watching'
        watchers = msg.watchers
        render()
      } else if (msg.type === 'pair-lines') {
        for (const line of msg.lines) append(line.type === 'input' ? `$ ${line.text}` : line.text)
        render()
      } else if (msg.type === 'pair-watchers') {
        watchers = msg.watchers
        render()
      } else if (msg.type === 'pair-granted') {
        granted = msg.granted
        if (!granted) buffer = ''
        render()
      } else if (msg.type === 'pair-closed') {
        finish([`pair: the host ended session ${code}.`])
      } else if (msg.type === 'pair-error') {
        finish([msg.reason === 'full'
          ? `pair: session ${code} is full — 8 watchers max.`
          : `pair: no session with code ${code} — codes die with their host.`])
      }
    }
  })

  const finish = (lines: string[]) => {
    if (done) return
    done = true
    duel.teardown()
    onEnd(lines)
  }

  render()

  return {
    // guests type whole command lines — touch needs the soft keyboard
    acceptsText: true,
    onKey(key) {
      if (key === 'Escape') {
        finish([`pair: left session ${code}.`])
        return true
      }
      if (key === 'Enter') {
        const line = buffer.trim()
        if (granted && line) {
          duel.send({ type: 'pair-run', line } satisfies PairRunIn)
          buffer = ''
          render()
        }
        return true
      }
      if (key === 'Backspace') {
        buffer = buffer.slice(0, -1)
        render()
        return true
      }
      if (key.length === 1) {
        // consume printables even while view-only, so stray typing can't
        // trigger browser shortcuts — it just has nowhere to go yet
        if (granted) {
          buffer = (buffer + key).slice(0, 200)
          render()
        }
        return true
      }
      return false
    },
    // terminal closed mid-watch: leave quietly, no onEnd
    stop: () => {
      done = true
      duel.teardown()
    }
  }
}
