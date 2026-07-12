import { initialState, applyMove } from '~/utils/chess'
import type { ChessState, Side } from '~/utils/chess'
import type { ServerMessage, ChessJoinIn, ChessLeaveIn, ChessMoveIn } from '../../realtime/protocol'

export type ChessOnlinePhase = 'idle' | 'connecting' | 'waiting' | 'playing' | 'over'

/**
 * Online chess over the cursors relay, pong-online style: a two-visitor
 * matchmaking queue, and a server that validates every move with the SAME
 * chess-core the client renders with. This side only sends from/to intents
 * and replays the server's applied moves — the boards cannot diverge.
 * Degrades to `enabled: false` when no relay is configured.
 */
export function useChessOnline() {
  const wsUrl = useRuntimeConfig().public.cursorsWs
  const { name } = useIdentity()

  const enabled = computed(() => !!wsUrl)
  const phase = ref<ChessOnlinePhase>('idle')
  const mySide = ref<Side>('w')
  const foe = ref('')
  const state = ref<ChessState>(initialState())
  const lastMove = ref<number[]>([])
  const endLine = ref('')

  let socket: WebSocket | null = null

  const teardown = () => {
    const open = socket
    socket = null // onclose checks this to tell a deliberate exit from a drop
    open?.close()
  }

  const leave = () => {
    if (socket?.readyState === 1) socket.send(JSON.stringify({ type: 'chess-leave' } satisfies ChessLeaveIn))
    teardown()
    phase.value = 'idle'
  }

  const finish = (line: string) => {
    teardown()
    endLine.value = line
    phase.value = 'over'
  }

  const join = () => {
    if (!wsUrl || phase.value === 'connecting' || phase.value === 'waiting' || phase.value === 'playing') return
    phase.value = 'connecting'
    state.value = initialState()
    lastMove.value = []
    endLine.value = ''
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      finish('the relay refused the call — try again later')
      return
    }
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ type: 'chess-join', name: name.value } satisfies ChessJoinIn))
    })
    socket.addEventListener('error', () => {
      if (socket) finish('the relay is unreachable — the chess club is closed right now')
    })
    socket.addEventListener('close', () => {
      if (socket) finish('connection lost — the match dissolves')
    })
    socket.addEventListener('message', (event) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(String(event.data)) as ServerMessage
      } catch {
        return
      }
      if (msg.type === 'chess-wait') {
        phase.value = 'waiting'
      } else if (msg.type === 'chess-start') {
        mySide.value = msg.side
        foe.value = msg.foe || 'a visitor'
        state.value = initialState()
        lastMove.value = []
        phase.value = 'playing'
      } else if (msg.type === 'chess-moved') {
        state.value = applyMove(state.value, msg.move)
        lastMove.value = [msg.move.from, msg.move.to]
      } else if (msg.type === 'chess-end') {
        const { winner, reason } = msg
        if (reason === 'forfeit') {
          finish(winner === mySide.value
            ? `${foe.value} disconnected — you win by forfeit`
            : 'you forfeited. the club remembers.')
        } else if (reason === 'stalemate') {
          finish('stalemate — a firm diplomatic handshake')
        } else {
          finish(winner === mySide.value
            ? `checkmate — you beat ${foe.value}! a real human, defeated.`
            : `checkmate — ${foe.value} wins. shake hands with the screen.`)
        }
      }
    })
  }

  const sendMove = (from: number, to: number) => {
    if (phase.value !== 'playing' || state.value.turn !== mySide.value) return
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({ type: 'chess-move', from, to } satisfies ChessMoveIn))
    }
  }

  // closing the chess window mid-match is a forfeit, same as disconnecting
  onScopeDispose(() => {
    if (socket?.readyState === 1) socket.send(JSON.stringify({ type: 'chess-leave' } satisfies ChessLeaveIn))
    teardown()
  })

  return { enabled, phase, mySide, foe, state, lastMove, endLine, join, leave, sendMove }
}
