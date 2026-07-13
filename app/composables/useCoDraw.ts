import type { DrawStroke, ServerMessage, DrawJoinIn, DrawLeaveIn, DrawStrokeIn, DrawClearIn } from '../../realtime/protocol'
import type { Ref } from 'vue'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'
import { MAX_STROKES } from '../../realtime/draw-core.mjs'

// The co-draw whiteboard, over the cursors relay. One shared canvas of freehand
// segments (normalized 0..1). Strokes are drawn optimistically and the server
// echoes them to everyone else, so the drawer feels no latency and boards stay
// consistent. Ephemeral by design — the relay keeps a ring buffer, not history.
// With no relay configured it degrades to a solo local sketchpad.

let conn: RelayConnection | null = null
// mirrors the core's lease count so the LAST leaver says goodbye first
let drawLeases = 0

export function useCoDraw() {
  const wsUrl = useRuntimeConfig().public.cursorsWs

  const enabled = computed(() => !!wsUrl)
  const strokes = useState<DrawStroke[]>(STATE_KEYS.drawStrokes, () => [])
  const online = useState(STATE_KEYS.drawOnline, () => 0)
  const status: Ref<'offline' | 'connecting' | 'open' | 'lost'> = useState(STATE_KEYS.drawStatus, () => 'offline')

  const cap = (list: DrawStroke[]) => (list.length > MAX_STROKES ? list.slice(-MAX_STROKES) : list)

  conn ??= wsUrl
    ? createRelayConnection(wsUrl, {
        // onOpen re-fires on every reconnect, so it re-joins the board too
        onOpen: () => conn?.send({ type: 'draw-join' } satisfies DrawJoinIn),
        onDrop: () => (status.value = 'lost'),
        onFail: () => (status.value = 'lost'),
        onFrame: (raw) => {
          const msg = raw as ServerMessage
          if (msg.type === 'draw-state') {
            strokes.value = msg.strokes
            online.value = msg.online
            status.value = 'open'
          } else if (msg.type === 'draw-stroke') {
            strokes.value = cap([...strokes.value, { x0: msg.x0, y0: msg.y0, x1: msg.x1, y1: msg.y1, c: msg.c }])
          } else if (msg.type === 'draw-clear') {
            strokes.value = []
          } else if (msg.type === 'draw-count') {
            online.value = msg.online
          }
        }
      // like the other persistent rooms, heal through a transient drop
      }, { reconnect: true })
    : null

  /** Take a lease on the board. Returns a release function — always call it. */
  const join = (): (() => void) => {
    if (!conn) return () => {}
    if (status.value !== 'open') status.value = 'connecting'
    drawLeases++
    const release = conn.acquire()
    let released = false
    return () => {
      if (released) return
      released = true
      drawLeases--
      if (drawLeases <= 0) {
        conn?.send({ type: 'draw-leave' } satisfies DrawLeaveIn)
        status.value = 'offline'
      }
      release()
    }
  }

  /** Draw a segment: optimistic locally, then sent for everyone else to mirror
   * (or purely local when there's no relay). */
  const addStroke = (stroke: DrawStroke) => {
    strokes.value = cap([...strokes.value, stroke])
    conn?.send({ type: 'draw-stroke', ...stroke } satisfies DrawStrokeIn)
  }

  /** Wipe the board for everyone (or just locally offline). */
  const clear = () => {
    strokes.value = []
    conn?.send({ type: 'draw-clear' } satisfies DrawClearIn)
  }

  return { enabled, strokes, online, status, join, addStroke, clear }
}
