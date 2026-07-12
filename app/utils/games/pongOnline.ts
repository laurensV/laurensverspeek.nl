import { isQuitKey, bumpTally } from '~/utils/terminalGameKit'
import { boxed } from '~/utils/asciiFrame'
import { createRelayConnection } from '~/utils/relaySocket'
import { PONG_W, PONG_H, PONG_PADDLE, clampPaddle } from '../../../realtime/pong-core.mjs'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'
import type { ServerMessage, PongJoinIn, PongLeaveIn, PongMoveIn } from '../../../realtime/protocol'

// Online pong over the cursors relay: the server owns the ball (see
// realtime/pong-core.mjs — the SAME physics module), this side only renders
// states and sends paddle intents. Matchmaking is a two-visitor queue.

interface OnlinePongOptions {
  wsUrl: string
  playerName: string
}

export function createOnlinePong(
  { wsUrl, playerName }: OnlinePongOptions,
  { onFrame, onEnd }: GameCallbacks
): GameHandle {
  let phase: 'connecting' | 'waiting' | 'playing' = 'connecting'
  let side: 'l' | 'r' = 'l'
  let foe = ''
  let myY = Math.floor(PONG_H / 2) - 1
  let state = { bx: PONG_W / 2, by: PONG_H / 2, ly: myY, ry: myY, ls: 0, rs: 0 }
  let dots = 0
  let done = false
  let release: (() => void) | null = null

  // keep the lobby spinner alive while connecting/waiting
  const lobbyTimer = setInterval(() => {
    if (phase !== 'playing') renderLobby(phase === 'connecting' ? 'dialing the arcade' : 'waiting for another visitor to type `pong online`')
  }, 600)

  const stop = () => {
    clearInterval(lobbyTimer)
    conn.send({ type: 'pong-leave' } satisfies PongLeaveIn)
    release?.()
    release = null
  }

  const renderLobby = (line: string) => {
    dots = (dots + 1) % 4
    onFrame([
      'ONLINE PONG',
      '',
      `${line}${'.'.repeat(dots)}`,
      '',
      '(q backs out)'
    ].join('\n'))
  }

  const render = () => {
    const rows: string[] = []
    for (let y = 0; y < PONG_H; y++) {
      let row = ''
      for (let x = 0; x < PONG_W; x++) {
        const isBall = Math.round(state.bx) === x && Math.round(state.by) === y
        const isLeft = x === 1 && y >= state.ly && y < state.ly + PONG_PADDLE
        const isRight = x === PONG_W - 2 && y >= state.ry && y < state.ry + PONG_PADDLE
        const isNet = x === Math.floor(PONG_W / 2) && y % 2 === 0
        row += isBall ? '●' : isLeft || isRight ? '█' : isNet ? '·' : ' '
      }
      rows.push(row)
    }
    const me = playerName || 'you'
    const score = side === 'l'
      ? `${me} ${state.ls} — ${state.rs} ${foe}`
      : `${foe} ${state.ls} — ${state.rs} ${me}`
    onFrame([
      `PONG vs ${foe}  ${score}  (you are ${side === 'l' ? 'left' : 'right'} · w/s or ↑/↓ · q forfeits)`,
      ...boxed(rows, PONG_W)
    ].join('\n'))
  }

  const finish = (lines: string[]) => {
    if (done) return
    done = true
    stop()
    onEnd(lines)
  }

  // one fresh connection for this match, on the shared relay-socket core
  const conn = createRelayConnection(wsUrl, {
    onOpen: () => {
      conn.send({ type: 'pong-join', name: playerName } satisfies PongJoinIn)
      renderLobby('dialing the arcade')
    },
    onFail: () => finish(['pong: the relay is unreachable — the global arcade is closed right now']),
    onDrop: () => finish(['pong: connection lost — the match dissolves into static']),
    onFrame: (raw) => {
      const msg = raw as ServerMessage
      if (msg.type === 'pong-wait') {
        phase = 'waiting'
        renderLobby('waiting for another visitor to type `pong online`')
      } else if (msg.type === 'pong-start') {
        phase = 'playing'
        side = msg.side
        foe = msg.foe || 'a visitor'
        clearInterval(lobbyTimer)
        render()
      } else if (msg.type === 'pong-state') {
        state = { bx: msg.bx, by: msg.by, ly: msg.ly, ry: msg.ry, ls: msg.ls, rs: msg.rs }
        render()
      } else if (msg.type === 'pong-end') {
        const iWon = msg.winner === side
        // a win over a real visitor joins the shared tally (hall of fame, pet coins)
        if (iWon) bumpTally('lv-pong-online-wins')
        const score = side === 'l' ? `${state.ls}–${state.rs}` : `${state.rs}–${state.ls}`
        finish(msg.forfeit
          ? [iWon ? `${foe} rage-quit — you win by forfeit!` : 'you forfeited. the arcade remembers.']
          : [iWon ? `you beat ${foe} ${score}! a real human, defeated.` : `${foe} wins ${score} — shake hands with the screen.`])
      }
    }
  })
  release = conn.acquire()

  const move = (delta: number) => {
    if (phase !== 'playing') return
    myY = clampPaddle(myY + delta)
    // optimistic: paint my paddle where I mean it while the server catches up
    if (side === 'l') state.ly = myY
    else state.ry = myY
    render()
    conn.send({ type: 'pong-move', y: myY } satisfies PongMoveIn)
  }

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        const line = phase === 'playing' ? 'match forfeited — your opponent takes it' : 'left the arcade lobby'
        finish([`pong: ${line}`])
        return true
      }
      const lower = key.toLowerCase()
      if (key === 'ArrowUp' || lower === 'w') {
        move(-1)
        return true
      }
      if (key === 'ArrowDown' || lower === 's') {
        move(1)
        return true
      }
      return false
    },
    stop
  }
}
