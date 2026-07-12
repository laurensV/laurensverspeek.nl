import { createRelayConnection } from '~/utils/relaySocket'
import { bumpTally } from '~/utils/terminalGameKit'
import type { ServerMessage } from '../../../realtime/protocol'

// The plumbing every online duel (pong, chess, wpm-race) repeats: one fresh
// relay connection per match, a held lease, a join frame on open, a leave frame
// + lease release on teardown, an optional lobby spinner while matchmaking, and
// recording a win in the shared tally (hall of fame + pet coins). Each game
// keeps its own rendering and frame handling; this owns the socket lifecycle.

export interface RelayDuelConfig {
  wsUrl: string
  /** sent once the socket opens */
  join: object
  /** sent on teardown (leave/forfeit) */
  leave: object
  onFrame: (msg: ServerMessage) => void
  onFail: () => void
  onDrop: () => void
  /** extra work when the socket opens (e.g. paint the first lobby frame) */
  onOpen?: () => void
  /** an optional matchmaking spinner: tick(dots) while active() is true */
  spinner?: { intervalMs?: number, active: () => boolean, tick: (dots: number) => void }
}

export interface RelayDuel {
  send: (frame: object) => void
  /** clear the spinner, send the leave frame, drop the lease — idempotent */
  teardown: () => void
  /** true if the socket constructor threw during setup (onFail already ran) */
  readonly failed: boolean
  /** record a win in the shared tally key */
  recordWin: (key: string) => void
}

export function createRelayDuel(config: RelayDuelConfig): RelayDuel {
  let release: (() => void) | null = null
  let torndown = false
  let failed = false
  let constructed = false
  let spinnerTimer: ReturnType<typeof setInterval> | undefined

  const teardown = () => {
    if (torndown) return
    torndown = true
    clearInterval(spinnerTimer)
    conn.send(config.leave)
    release?.()
    release = null
  }

  const conn = createRelayConnection(config.wsUrl, {
    onOpen: () => { conn.send(config.join); config.onOpen?.() },
    // a throwing WebSocket constructor fires onFail synchronously inside
    // acquire() — before this returns and the caller's `duel` const exists — so
    // defer that first failure a microtask, by when the caller can safely react.
    onFail: () => { failed = true; if (constructed) config.onFail(); else queueMicrotask(() => config.onFail()) },
    onDrop: config.onDrop,
    onFrame: (raw) => config.onFrame(raw as ServerMessage)
  })

  release = conn.acquire()
  // acquire() can fire onFail synchronously, flipping `failed`/`torndown` — but
  // eslint's flow analysis can't see through the callback, so it reads these as
  // constant. They aren't.
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  // on a synchronous failure teardown never ran, so drop the just-taken lease here
  if (failed && release) { release(); release = null }
  constructed = true

  if (config.spinner && !torndown && !failed) {
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
    const { intervalMs = 600, active, tick } = config.spinner
    let dots = 0
    spinnerTimer = setInterval(() => {
      if (!torndown && active()) { dots = (dots + 1) % 4; tick(dots) }
    }, intervalMs)
  }

  return {
    send: (frame) => conn.send(frame),
    teardown,
    get failed() { return failed },
    recordWin: (key) => bumpTally(key)
  }
}
