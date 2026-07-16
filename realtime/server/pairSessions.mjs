// The pair terminal: one visitor hosts their live terminal transcript, others
// watch it through a short session code, and the host can grant the room the
// keyboard (guests then send command lines that run on the host's shell).
//
// Same factory shape as the online duels: createPairManager({ wire, sendTo,
// gate }) returns { handle(socket, msg, id), drop(socket) }. Everything is
// server-authoritative — codes are minted here, line frames are rebuilt from a
// whitelist (never passed through), and a guest's command line is only relayed
// while the room is granted.

/** @typedef {import('../protocol.js').ServerMessage} ServerMessage */
/** @typedef {import('../protocol.js').PairLine} PairLine */
/**
 * @typedef {{
 *   wire: (msg: ServerMessage) => string,
 *   sendTo: (socket: import('ws').WebSocket, payload: string) => void,
 *   gate: (ms: number) => import('../world-core.mjs').CooldownGate
 * }} PairCtx
 */

// unambiguous alphabet: no O/0 and no I/1, so a code read out loud survives
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PAIR_CODE_RE = /^[A-Z0-9]{4}$/
const MAX_GUESTS = 8
const MAX_LINES_PER_FRAME = 40
const MAX_LINE_TEXT = 400
const MAX_RUN_LINE = 200
const LINE_TYPES = new Set(['input', 'output', 'error', 'muted', 'primary'])

/** Rebuild a sanitized copy of a host's lines frame — entries are re-created
 * from scratch (whitelisted type, clipped text), never passed through, so a
 * hostile host can't smuggle extra fields or megabyte payloads to watchers.
 * @param {unknown} raw @returns {PairLine[]} */
const sanitizeLines = (raw) => {
  if (!Array.isArray(raw)) return []
  /** @type {PairLine[]} */
  const clean = []
  for (const entry of raw.slice(0, MAX_LINES_PER_FRAME)) {
    if (!entry || typeof entry !== 'object') continue
    if (!LINE_TYPES.has(entry.type) || typeof entry.text !== 'string') continue
    clean.push({
      type: /** @type {PairLine['type']} */ (entry.type),
      text: entry.text.slice(0, MAX_LINE_TEXT)
    })
  }
  return clean
}

/** @param {PairCtx} ctx */
export const createPairManager = ({ wire, sendTo, gate }) => {
  /**
   * @typedef {{
   *   code: string,
   *   hostId: number,
   *   host: import('ws').WebSocket,
   *   guests: Map<number, import('ws').WebSocket>,
   *   granted: boolean
   * }} PairRoom
   */
  /** @type {Map<string, PairRoom>} */
  const rooms = new Map()
  /** @type {Map<import('ws').WebSocket, PairRoom>} the room a socket hosts */
  const hostRooms = new Map()
  /** @type {Map<import('ws').WebSocket, { room: PairRoom, id: number }>} the room a socket watches */
  const guestRooms = new Map()

  // broadcast line frames fan out to up to 8 guests — a lenient gate blunts a
  // scripted flood without dropping a normal transcript (one frame per tick)
  const linesGate = gate(40)
  // `for`-routed frames (per-joiner backlogs) fan out to ONE guest, so they get
  // their own gate — sharing linesGate would let an ordinary mirror flush
  // swallow the backlog a brand-new joiner is owed
  const backlogGate = gate(40)
  // guests type command lines by hand; anything faster than this is a script
  const runGate = gate(800)
  // create/join re-send state and fan out membership — rapid re-tries are noise
  const sessionGate = gate(1500)

  const makeCode = () => {
    for (;;) {
      let code = ''
      for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      if (!rooms.has(code)) return code
    }
  }

  /** @param {PairRoom} room @param {string} payload @param {import('ws').WebSocket} [except] */
  const broadcastGuests = (room, payload, except) => {
    for (const guest of room.guests.values()) {
      if (guest !== except) sendTo(guest, payload)
    }
  }

  /** The host is gone (leave, disconnect or re-create) — the session dies.
   * @param {PairRoom} room */
  const closeRoom = (room) => {
    rooms.delete(room.code)
    hostRooms.delete(room.host)
    const payload = wire({ type: 'pair-closed' })
    for (const guest of room.guests.values()) {
      guestRooms.delete(guest)
      sendTo(guest, payload)
    }
  }

  /** Remove a socket from the room it watches (if any) and tell the others.
   * @param {import('ws').WebSocket} socket */
  const dropGuest = (socket) => {
    const entry = guestRooms.get(socket)
    if (!entry) return
    guestRooms.delete(socket)
    const { room, id } = entry
    room.guests.delete(id)
    sendTo(room.host, wire({ type: 'pair-peer', event: 'left', watchers: room.guests.size, guest: id }))
    broadcastGuests(room, wire({ type: 'pair-watchers', watchers: room.guests.size }))
  }

  /** A pair participant left (message or disconnect): close their hosted room
   * and/or drop their guest membership.
   * @param {import('ws').WebSocket} socket */
  const drop = (socket) => {
    const hosted = hostRooms.get(socket)
    if (hosted) closeRoom(hosted)
    dropGuest(socket)
  }

  /** @param {import('ws').WebSocket} socket @param {any} msg @param {number} id */
  const handle = (socket, msg, id) => {
    if (msg.type === 'pair-create') {
      if (sessionGate.check(id, Date.now()) > 0) return true
      // one hosted room per connection — re-creating closes the old one
      const prev = hostRooms.get(socket)
      if (prev) closeRoom(prev)
      /** @type {PairRoom} */
      const room = { code: makeCode(), hostId: id, host: socket, guests: new Map(), granted: false }
      rooms.set(room.code, room)
      hostRooms.set(socket, room)
      sendTo(socket, wire({ type: 'pair-code', code: room.code }))
      return true
    }
    if (msg.type === 'pair-join') {
      if (sessionGate.check(id, Date.now()) > 0) return true
      const code = typeof msg.code === 'string' ? msg.code.toUpperCase() : ''
      const room = PAIR_CODE_RE.test(code) ? rooms.get(code) : undefined
      // hosts can't watch their own session — the mirror would feed itself
      if (!room || room.host === socket) {
        sendTo(socket, wire({ type: 'pair-error', reason: 'bad-code' }))
        return true
      }
      if (room.guests.size >= MAX_GUESTS) {
        sendTo(socket, wire({ type: 'pair-error', reason: 'full' }))
        return true
      }
      dropGuest(socket) // a socket watches at most one session
      room.guests.set(id, socket)
      guestRooms.set(socket, { room, id })
      sendTo(socket, wire({ type: 'pair-joined', code: room.code, watchers: room.guests.size }))
      // a mid-session joiner must learn the room's keyboard is already granted
      if (room.granted) sendTo(socket, wire({ type: 'pair-granted', granted: true }))
      sendTo(room.host, wire({ type: 'pair-peer', event: 'joined', watchers: room.guests.size, guest: id }))
      broadcastGuests(room, wire({ type: 'pair-watchers', watchers: room.guests.size }), socket)
      return true
    }
    if (msg.type === 'pair-lines') {
      const room = hostRooms.get(socket)
      if (!room || room.guests.size === 0) return true
      const targeted = msg.for !== undefined
      if ((targeted ? backlogGate : linesGate).check(id, Date.now()) > 0) return true
      const lines = sanitizeLines(msg.lines)
      if (!lines.length) return true
      const payload = wire({ type: 'pair-lines', lines })
      if (targeted) {
        // `for` must name an existing guest of THIS room, or the frame dies here
        const target = Number.isInteger(msg.for) ? room.guests.get(msg.for) : undefined
        if (target) sendTo(target, payload)
        return true
      }
      broadcastGuests(room, payload)
      return true
    }
    if (msg.type === 'pair-allow') {
      const room = hostRooms.get(socket)
      if (!room || typeof msg.granted !== 'boolean') return true
      room.granted = msg.granted
      broadcastGuests(room, wire({ type: 'pair-granted', granted: room.granted }))
      return true
    }
    if (msg.type === 'pair-run') {
      const entry = guestRooms.get(socket)
      // relayed ONLY when this socket is a guest of a room the host has granted
      if (!entry || !entry.room.granted || typeof msg.line !== 'string') return true
      const line = msg.line.slice(0, MAX_RUN_LINE).trim()
      if (!line) return true
      if (runGate.check(id, Date.now()) > 0) return true
      sendTo(entry.room.host, wire({ type: 'pair-run', line }))
      return true
    }
    if (msg.type === 'pair-leave') {
      drop(socket)
      return true
    }
    return false
  }

  return { handle, drop }
}
