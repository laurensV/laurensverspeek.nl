import { setScoreSink } from '~/utils/terminalGameKit'
import { LEADERBOARD_GAMES, emptyBoards } from '../../realtime/scores-core.mjs'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'
import type { ServerMessage, ScoreSubmitIn, ScoresGetIn, ScoreEntry, ScoreBoards } from '../../realtime/protocol'

// the wire types are the score types — re-exported for the app's consumers
export type { ScoreEntry, ScoreBoards }

export const GAMES: string[] = LEADERBOARD_GAMES

// one shared connection (relay-socket core), like the world/chat sockets
let conn: RelayConnection | null = null
let releaseLease: (() => void) | null = null

/**
 * The online game leaderboard over the cursors relay. When no relay is
 * configured (NUXT_PUBLIC_CURSORS_WS unset) it stays offline — the local hall
 * of fame still works; there's just no global board. Finished games submit
 * their score automatically via the terminalGameKit sink. A relay blip must
 * not freeze the board on "connecting…": the core reconnects with capped
 * backoff for as long as the sink is wired.
 */
export function useLeaderboard() {
  const boards = useState<ScoreBoards>('leaderboard-boards', () => emptyBoards())
  const connected = useState('leaderboard-connected', () => false)
  const wsUrl = useRuntimeConfig().public.cursorsWs
  const enabled = computed(() => !!wsUrl)
  const { name } = useIdentity()
  // beating the global #1 gets its own celebration on top of the personal best
  const { celebrateActive, worldRecord } = useSiteEffects()

  conn ??= wsUrl && import.meta.client
    ? createRelayConnection(wsUrl, {
        onOpen: () => {
          connected.value = true
          conn?.send({ type: 'scores-get' } satisfies ScoresGetIn)
        },
        onDrop: () => (connected.value = false),
        onFrame: (raw) => {
          // the relay broadcasts other subsystems' frames (hello, cursor moves)
          // on the same socket, so the honest inbound type is the full union
          const msg = raw as ServerMessage
          if (msg.type === 'scores') {
            boards.value = { ...emptyBoards(), ...msg.boards }
          } else if (msg.type === 'score-board') {
            boards.value = { ...boards.value, [msg.game]: msg.board }
          }
        }
      }, { reconnect: true })
    : null

  const submit = (game: string, score: number) => {
    if (GAMES.includes(game) && score > 0) {
      // the board is sorted best-first, so [0] is the reigning global top known
      // to this client — captured BEFORE our submission updates it
      const worldBest = boards.value[game]?.[0]?.score ?? 0
      conn?.send({ type: 'score-submit', game, score, name: name.value } satisfies ScoreSubmitIn)
      // only the player who beat a real existing #1 celebrates (never a first-ever
      // score against an empty board, and only when actually connected)
      if (connected.value && worldBest > 0 && score > worldBest) {
        worldRecord.value = game
        celebrateActive.value = true
      }
    }
  }

  /** Open the socket and route finished-game scores to it. */
  const enter = () => {
    if (releaseLease || !conn) return
    setScoreSink((game, score) => submit(game, score))
    releaseLease = conn.acquire()
  }

  const leave = () => {
    setScoreSink(null)
    releaseLease?.()
    releaseLease = null
    connected.value = false
  }

  return { boards, connected, enabled, GAMES, enter, leave, submit }
}
