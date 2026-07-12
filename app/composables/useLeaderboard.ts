import { setScoreSink } from '~/utils/terminalGameKit'
import { LEADERBOARD_GAMES, emptyBoards } from '../../realtime/scores-core.mjs'
import type { ServerMessage, ScoreSubmitIn, ScoresGetIn, ScoreEntry, ScoreBoards } from '../../realtime/protocol'

// the wire types are the score types — re-exported for the app's consumers
export type { ScoreEntry, ScoreBoards }

export const GAMES: string[] = LEADERBOARD_GAMES

// module-scoped socket, shared by every caller (like the world/cursors sockets)
let socket: WebSocket | undefined
let wired = false
let retries = 0
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

/**
 * The online game leaderboard over the cursors relay. When no relay is
 * configured (NUXT_PUBLIC_CURSORS_WS unset) it stays offline — the local hall
 * of fame still works; there's just no global board. Finished games submit
 * their score automatically via the terminalGameKit sink.
 */
export function useLeaderboard() {
  const boards = useState<ScoreBoards>('leaderboard-boards', () => emptyBoards())
  const connected = useState('leaderboard-connected', () => false)
  const wsUrl = useRuntimeConfig().public.cursorsWs
  const enabled = computed(() => !!wsUrl)
  const { name } = useIdentity()

  const submit = (game: string, score: number) => {
    if (socket?.readyState === 1 && GAMES.includes(game) && score > 0) {
      socket.send(JSON.stringify({ type: 'score-submit', game, score, name: name.value } satisfies ScoreSubmitIn))
    }
  }

  const connect = () => {
    if (!import.meta.client || !enabled.value || socket) return
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      return
    }
    socket.onopen = () => {
      connected.value = true
      retries = 0 // a good connection resets the backoff, so later drops retry too
      socket?.send(JSON.stringify({ type: 'scores-get' } satisfies ScoresGetIn))
    }
    socket.onmessage = (event) => {
      // the relay broadcasts other subsystems' frames (hello, cursor moves) on
      // the same socket, so the honest inbound type is the full union
      let msg: ServerMessage
      try {
        msg = JSON.parse(String(event.data)) as ServerMessage
      } catch {
        return
      }
      if (msg.type === 'scores') {
        boards.value = { ...emptyBoards(), ...msg.boards }
      } else if (msg.type === 'score-board') {
        boards.value = { ...boards.value, [msg.game]: msg.board }
      }
    }
    socket.onclose = () => {
      connected.value = false
      socket = undefined
      // a relay blip must not freeze the board on "connecting…" forever —
      // keep retrying with a capped backoff for as long as a consumer is wired
      if (wired) reconnectTimer = setTimeout(connect, Math.min(30_000, 4000 * ++retries))
    }
  }

  /** Open the socket and route finished-game scores to it. */
  const enter = () => {
    if (wired || !enabled.value) return
    wired = true
    setScoreSink((game, score) => submit(game, score))
    connect()
  }

  const leave = () => {
    setScoreSink(null)
    wired = false // before close(), whose onclose would otherwise schedule a reconnect
    clearTimeout(reconnectTimer)
    socket?.close()
    socket = undefined
  }

  return { boards, connected, enabled, GAMES, enter, leave, submit }
}
