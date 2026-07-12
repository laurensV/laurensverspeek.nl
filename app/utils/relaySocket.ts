// The one way this site talks to the cursors relay. Six subsystems (cursors,
// world, leaderboard, chat, online chess, online pong) used to each hand-roll
// the same socket mechanics; this core owns them once:
//   - safe construction (a throwing WebSocket constructor can't crash a caller)
//   - JSON parse guarding on every inbound frame
//   - deliberate-close vs unexpected-drop detection
//   - optional capped-backoff reconnect while at least one lease is held
//   - refcounted leases, so shared connections close when the last user leaves
// Consumers keep their own protocol logic; this file knows nothing about frames.

export interface RelayHandlers {
  /** every successfully parsed inbound frame (callers narrow the type) */
  onFrame: (msg: unknown) => void
  /** fires on every (re)connect once the socket is open */
  onOpen?: () => void
  /** an unexpected drop — never fires on a deliberate release/close */
  onDrop?: () => void
  /** the socket failed: constructor threw or the connection errored */
  onFail?: () => void
}

export interface RelayOptions {
  /** reconnect with capped backoff while a lease is held (default: off) */
  reconnect?: boolean
  baseDelayMs?: number
  maxDelayMs?: number
  /** injectable for tests */
  socketFactory?: (url: string) => WebSocket
}

export interface RelayConnection {
  /** Take a lease; the connection lives while ≥1 lease is held.
   * Returns a release function — always call it (idempotent). */
  acquire: () => () => void
  /** JSON-serialize and send when open; returns whether it was sent. */
  send: (frame: object) => boolean
  isOpen: () => boolean
  /** whether any lease is currently held */
  active: () => boolean
}

export function createRelayConnection(
  url: string,
  handlers: RelayHandlers,
  options: RelayOptions = {}
): RelayConnection {
  const {
    reconnect = false,
    baseDelayMs = 4_000,
    maxDelayMs = 30_000,
    socketFactory = (target: string) => new WebSocket(target)
  } = options

  let socket: WebSocket | null = null
  let leases = 0
  let retries = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const connect = () => {
    if (socket || leases <= 0) return
    try {
      socket = socketFactory(url)
    } catch {
      socket = null
      handlers.onFail?.()
      return
    }
    socket.addEventListener('open', () => {
      retries = 0 // a good connection resets the backoff, so later drops retry too
      handlers.onOpen?.()
    })
    socket.addEventListener('error', () => handlers.onFail?.())
    socket.addEventListener('close', () => {
      if (!socket) return // deliberate teardown nulled it first
      socket = null
      handlers.onDrop?.()
      if (reconnect && leases > 0) {
        timer = setTimeout(connect, Math.min(maxDelayMs, baseDelayMs * ++retries))
      }
    })
    socket.addEventListener('message', (event) => {
      let msg: unknown
      try {
        msg = JSON.parse(String(event.data))
      } catch {
        return // a non-JSON frame must not take the handler down
      }
      handlers.onFrame(msg)
    })
  }

  const acquire = () => {
    leases++
    connect()
    let released = false
    return () => {
      if (released) return
      released = true
      leases--
      if (leases <= 0) {
        clearTimeout(timer)
        if (socket) {
          const open = socket
          socket = null // mark deliberate before close() fires the handler
          open.close()
        }
      }
    }
  }

  return {
    acquire,
    send: (frame: object) => {
      if (socket?.readyState !== 1) return false
      socket.send(JSON.stringify(frame))
      return true
    },
    isOpen: () => socket?.readyState === 1,
    active: () => leases > 0
  }
}
