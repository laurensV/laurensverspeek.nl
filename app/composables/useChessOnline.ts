import { initialState, applyMove } from '~/utils/chess'
import { createRelayDuel, type RelayDuel } from '~/utils/games/relayDuel'
import type { ChessState, Side } from '~/utils/chess'
import type { ChessJoinIn, ChessLeaveIn, ChessMoveIn } from '../../realtime/protocol'

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

  // one fresh duel per match (the relay-socket lease + leave frame + win tally
  // live in the shared helper, pong/wpm-race style)
  let duel: RelayDuel | null = null

  const teardown = () => {
    duel?.teardown()
    duel = null
  }

  const leave = () => {
    teardown() // teardown sends the leave frame
    phase.value = 'idle'
  }

  const finish = (line: string) => {
    if (phase.value === 'over' || phase.value === 'idle') return
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
    duel = createRelayDuel({
      wsUrl,
      join: { type: 'chess-join', name: name.value } satisfies ChessJoinIn,
      leave: { type: 'chess-leave' } satisfies ChessLeaveIn,
      onFail: () => finish('the relay is unreachable — the chess club is closed right now'),
      onDrop: () => finish('connection lost — the match dissolves'),
      onFrame: (msg) => {
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
          if (winner === mySide.value) duel?.recordWin('lv-chess-online-wins')
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
  }

  const sendMove = (from: number, to: number) => {
    if (phase.value !== 'playing' || state.value.turn !== mySide.value) return
    duel?.send({ type: 'chess-move', from, to } satisfies ChessMoveIn)
  }

  // closing the chess window mid-match is a forfeit, same as disconnecting
  onScopeDispose(teardown)

  return { enabled, phase, mySide, foe, state, lastMove, endLine, join, leave, sendMove }
}
