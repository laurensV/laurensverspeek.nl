import { setScoreSink } from '~/utils/terminalGameKit'
import { LEADERBOARD_GAMES, emptyBoards } from '../../realtime/scores-core.mjs'

export interface ScoreEntry { name: string, score: number, at: number }
export type ScoreBoards = Record<string, ScoreEntry[]>

export const GAMES: string[] = LEADERBOARD_GAMES

// module-scoped socket, shared by every caller (like the world/cursors sockets)
let socket: WebSocket | undefined
let wired = false

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
      socket.send(JSON.stringify({ type: 'score-submit', game, score, name: name.value }))
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
      socket?.send(JSON.stringify({ type: 'scores-get' }))
    }
    socket.onmessage = (event) => {
      let msg: { type?: string, boards?: ScoreBoards, game?: string, board?: ScoreEntry[] }
      try {
        msg = JSON.parse(String(event.data)) as typeof msg
      } catch {
        return
      }
      if (msg.type === 'scores' && msg.boards) {
        boards.value = { ...emptyBoards(), ...msg.boards }
      } else if (msg.type === 'score-board' && msg.game && msg.board) {
        boards.value = { ...boards.value, [msg.game]: msg.board }
      }
    }
    socket.onclose = () => {
      connected.value = false
      socket = undefined
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
    socket?.close()
    socket = undefined
    wired = false
  }

  return { boards, connected, enabled, GAMES, enter, leave, submit }
}
