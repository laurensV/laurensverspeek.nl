import type { DrawStroke, ServerMessage, DrawJoinIn, DrawLeaveIn, DrawStrokeIn, DrawClearIn, DrawUndoIn, DrawCursorIn } from '../../realtime/protocol'
import type { Ref } from 'vue'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'
import { MAX_STROKES } from '../../realtime/draw-core.mjs'

/** Another visitor's live pen position over the board (normalized 0..1). */
export interface DrawCursor { x: number, y: number, c: number, at: number }

/** A segment as the drawing view produces it — the composable tags it with the
 * drawer id + current pen-drag id before storing/sending. */
export type DrawSegment = Pick<DrawStroke, 'x0' | 'y0' | 'x1' | 'y1' | 'c'>

// The co-draw whiteboard, over the cursors relay. One shared canvas of freehand
// segments (normalized 0..1). Strokes are drawn optimistically and the server
// echoes them to everyone else, so the drawer feels no latency and boards stay
// consistent. Ephemeral by design — the relay keeps a ring buffer, not history.
// With no relay configured it degrades to a solo local sketchpad.

let conn: RelayConnection | null = null
// mirrors the core's lease count so the LAST leaver says goodbye first
let drawLeases = 0
// our own connection id (from the relay's hello), stamped on strokes we draw so
// undo can find them; 0 in solo mode, where every stroke is "ours" anyway
let ownId = 0
// a per-drawer pen-drag id: bumped on each pen-down, shared by that drag's
// segments so the whole stroke undoes as one. Module-level so the terminal and
// lvOS views of the one board keep a single, non-colliding sequence.
let nextSid = 1

export function useCoDraw() {
  const wsUrl = useRuntimeConfig().public.cursorsWs

  const enabled = computed(() => !!wsUrl)
  const strokes = useState<DrawStroke[]>(STATE_KEYS.drawStrokes, () => [])
  const online = useState(STATE_KEYS.drawOnline, () => 0)
  const status: Ref<'offline' | 'connecting' | 'open' | 'lost'> = useState(STATE_KEYS.drawStatus, () => 'offline')
  // where every OTHER connected visitor's pen is, keyed by their connection id
  const cursors = useState<Record<number, DrawCursor>>(STATE_KEYS.drawCursors, () => ({}))

  const cap = (list: DrawStroke[]) => (list.length > MAX_STROKES ? list.slice(-MAX_STROKES) : list)

  conn ??= wsUrl
    ? createRelayConnection(wsUrl, {
        // onOpen re-fires on every reconnect, so it re-joins the board too
        onOpen: () => conn?.send({ type: 'draw-join' } satisfies DrawJoinIn),
        onDrop: () => { status.value = 'lost'; cursors.value = {} },
        onFail: () => { status.value = 'lost'; cursors.value = {} },
        onFrame: (raw) => {
          const msg = raw as ServerMessage
          if (msg.type === 'hello') {
            ownId = msg.id // stamp our strokes so we can undo exactly our own
          } else if (msg.type === 'draw-state') {
            strokes.value = msg.strokes
            online.value = msg.online
            status.value = 'open'
          } else if (msg.type === 'draw-stroke') {
            strokes.value = cap([...strokes.value, { x0: msg.x0, y0: msg.y0, x1: msg.x1, y1: msg.y1, c: msg.c, by: msg.by, sid: msg.sid }])
          } else if (msg.type === 'draw-clear') {
            strokes.value = []
          } else if (msg.type === 'draw-undo') {
            // another drawer took back their last stroke — drop that group
            strokes.value = strokes.value.filter((s) => !(s.by === msg.by && s.sid === msg.sid))
          } else if (msg.type === 'draw-count') {
            online.value = msg.online
          } else if (msg.type === 'draw-cursor') {
            cursors.value = { ...cursors.value, [msg.id]: { x: msg.x, y: msg.y, c: msg.c, at: Date.now() } }
          } else if (msg.type === 'draw-cursor-gone') {
            const { [msg.id]: _gone, ...rest } = cursors.value
            cursors.value = rest
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
        cursors.value = {}
      }
      release()
    }
  }

  /** Broadcast where this visitor's pen is, so others see it move live. */
  const sendCursor = (x: number, y: number, c: number) => {
    conn?.send({ type: 'draw-cursor', x, y, c } satisfies DrawCursorIn)
  }

  /** Drop cursor dots that have gone quiet (the owner stopped moving or left
   * without a clean goodbye). Call on a timer from the view. */
  const pruneCursors = () => {
    const cutoff = Date.now() - 3000
    const next: Record<number, DrawCursor> = {}
    let changed = false
    for (const [id, cur] of Object.entries(cursors.value)) {
      if (cur.at >= cutoff) next[Number(id)] = cur
      else changed = true
    }
    if (changed) cursors.value = next
  }

  // the pen-drag id for the stroke currently being drawn
  let sid = 0

  /** Begin a new pen-drag — call on pen-down so its segments share one sid and
   * undo removes the whole stroke, not just the last segment. */
  const startStroke = () => {
    sid = nextSid++
  }

  /** Draw a segment: optimistic locally, then sent for everyone else to mirror
   * (or purely local when there's no relay). Tagged with our id + the current
   * pen-drag id so it can be undone as part of its stroke. */
  const addStroke = (segment: DrawSegment) => {
    const stroke: DrawStroke = { ...segment, by: ownId, sid }
    strokes.value = cap([...strokes.value, stroke])
    conn?.send({ type: 'draw-stroke', ...segment, sid } satisfies DrawStrokeIn)
  }

  /** Whether we have a stroke of our own on the board to take back. */
  const canUndo = computed(() => strokes.value.some((s) => s.by === ownId))

  /** Take back our most recent stroke still on the board — for us right away,
   * and (with a relay) for everyone else via the server. Returns whether it
   * removed anything (nothing of ours on the board → false). */
  const undo = (): boolean => {
    let lastSid = -1
    for (const s of strokes.value) if (s.by === ownId && s.sid > lastSid) lastSid = s.sid
    if (lastSid < 0) return false
    strokes.value = strokes.value.filter((s) => !(s.by === ownId && s.sid === lastSid))
    // send the exact stroke we removed so the server can't undo a different one
    // (its own "highest sid" could differ if the flood gate dropped a later drag)
    conn?.send({ type: 'draw-undo', sid: lastSid } satisfies DrawUndoIn)
    return true
  }

  /** Wipe the board for everyone (or just locally offline). */
  const clear = () => {
    strokes.value = []
    conn?.send({ type: 'draw-clear' } satisfies DrawClearIn)
  }

  return { enabled, strokes, online, status, cursors, join, startStroke, addStroke, undo, canUndo, clear, sendCursor, pruneCursors }
}
