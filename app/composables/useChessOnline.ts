import { initialState, applyMove } from '~/utils/chess'
import { bumpTally } from '~/utils/terminalGameKit'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'
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

  // one fresh connection per match (relay-socket core: parse guards + the
  // deliberate-close vs drop distinction live there)
  let conn: RelayConnection | null = null
  let release: (() => void) | null = null

  const teardown = () => {
    release?.()
    release = null
    conn = null
  }

  const leave = () => {
    conn?.send({ type: 'chess-leave' } satisfies ChessLeaveIn)
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
    const match = createRelayConnection(wsUrl, {
      onOpen: () => conn?.send({ type: 'chess-join', name: name.value } satisfies ChessJoinIn),
      onFail: () => {
        if (conn) finish('the relay is unreachable — the chess club is closed right now')
      },
      onDrop: () => {
        if (conn) finish('connection lost — the match dissolves')
      },
      onFrame: (raw) => {
        const msg = raw as ServerMessage
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
          // a win over a real visitor joins the shared tally (hall of fame, pet coins)
          if (winner === mySide.value) bumpTally('lv-chess-online-wins')
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
      }
    })
    conn = match
    release = match.acquire()
    const failedSynchronously = () => phase.value === 'over'
    if (failedSynchronously()) {
      // the socket constructor threw and finish() already ran — drop the lease
      release()
      release = null
    }
  }

  const sendMove = (from: number, to: number) => {
    if (phase.value !== 'playing' || state.value.turn !== mySide.value) return
    conn?.send({ type: 'chess-move', from, to } satisfies ChessMoveIn)
  }

  // closing the chess window mid-match is a forfeit, same as disconnecting
  onScopeDispose(() => {
    conn?.send({ type: 'chess-leave' } satisfies ChessLeaveIn)
    teardown()
  })

  return { enabled, phase, mySide, foe, state, lastMove, endLine, join, leave, sendMove }
}
