import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { TerminalLine } from '~/utils/terminal/types'
import type {
  PairLine, ServerMessage,
  PairCreateIn, PairLinesIn, PairAllowIn, PairLeaveIn
} from '../../../realtime/protocol'
import { createRelayConnection } from '~/utils/relaySocket'
import { registerPairProc, unregisterPairProc } from '~/utils/terminal/effectProcs'

// The host side of the pair terminal (`pair`). NOT a game — the shell stays
// fully usable while a session mirrors the pane-0 transcript to watching
// guests over the relay. It registers as a killable process (pid 2525,
// pair-share.sh); cleanup is explicit via stop()/kill/page-lifetime, the same
// way the site effects behave — command exec has no scope to dispose from.

export const MIRROR_BATCH_MAX = 40
export const MIRROR_TEXT_MAX = 400
/** how much recent transcript a brand-new guest is owed */
export const BACKLOG_LINES = 30

/**
 * Map transcript lines newer than `sinceId` into relay-safe { type, text }
 * pairs: html lines get their tags stripped (raw HTML NEVER crosses the
 * relay), text is clipped to the server's cap, and the batch keeps only the
 * newest MIRROR_BATCH_MAX entries. Keyed by line id, not index — ids are
 * monotonic for the whole visit, so the cursor survives `clear` and the
 * scrollback cap's front-splices (an index would drift).
 */
export function mirrorable(lines: readonly TerminalLine[], sinceId: number): PairLine[] {
  const fresh: PairLine[] = []
  for (const line of lines) {
    if (line.id <= sinceId) continue
    const text = line.html ? line.text.replace(/<[^>]*>/g, '') : line.text
    fresh.push({ type: line.type, text: text.slice(0, MIRROR_TEXT_MAX) })
  }
  return fresh.slice(-MIRROR_BATCH_MAX)
}

type PairEventStyle = 'muted' | 'primary' | 'error'

export interface PairHostOptions {
  /** the shared pane-0 transcript (useTerminal's lines state) */
  lines: Ref<TerminalLine[]>
  /** run one line through the shell, as if typed (granted guest commands) */
  run: (line: string) => void
  cursorsWs: string
  /** session announcements (code, joins, leaves) — printed by the caller */
  onEvent: (text: string, style?: PairEventStyle) => void
}

export interface PairHostHandle {
  code: Ref<string>
  watchers: Ref<number>
  granted: Ref<boolean>
  allow: (granted: boolean) => void
  stop: () => void
}

// one hosted session per visitor, shared by every terminal face (module scope,
// like the active game) — `pair allow`/`pair status`/`pair stop` reach it from
// any later command invocation
let active: PairHostHandle | null = null
export const activePairHost = (): PairHostHandle | null => active

export function createPairHost({ lines, run, cursorsWs, onEvent }: PairHostOptions): PairHostHandle {
  active?.stop() // starting a new session replaces the old one (server agrees)

  const code = ref('')
  const watchers = ref(0)
  const granted = ref(false)
  let stopped = false
  let stopWatch: (() => void) | null = null
  let release: (() => void) | null = null
  // mirror from "now" — the backlog below covers what a joiner missed
  let sentThrough = lines.value.at(-1)?.id ?? -1

  const stop = (note = 'pair: session ended', style: PairEventStyle = 'muted') => {
    if (stopped) return
    stopped = true
    stopWatch?.()
    conn.send({ type: 'pair-leave' } satisfies PairLeaveIn) // best-effort on a dead socket
    release?.()
    release = null
    unregisterPairProc()
    active = null
    onEvent(note, style)
  }

  const conn = createRelayConnection(cursorsWs, {
    onOpen: () => void conn.send({ type: 'pair-create' } satisfies PairCreateIn),
    // no reconnect: the session code dies with the connection, so be honest
    onDrop: () => stop('pair: relay connection lost — session ended', 'error'),
    onFail: () => stop('pair: could not reach the relay — session ended', 'error'),
    onFrame: (raw) => {
      // the relay broadcasts cross-subsystem frames too — type the FULL union
      const msg = raw as ServerMessage
      if (msg.type === 'pair-code') {
        code.value = msg.code
        onEvent(`pair session live — code ${msg.code}`, 'primary')
        onEvent(`guests watch with 'pair join ${msg.code}' · 'pair allow' hands them the keyboard · 'pair stop' ends it`)
      } else if (msg.type === 'pair-peer') {
        watchers.value = msg.watchers
        if (msg.event === 'joined') {
          onEvent(`pair: guest #${msg.guest} joined (${msg.watchers} watching)`)
          // greet the joiner with the recent transcript, routed only to them
          const backlog = mirrorable(lines.value.slice(-BACKLOG_LINES), -1)
          if (backlog.length) conn.send({ type: 'pair-lines', lines: backlog, for: msg.guest } satisfies PairLinesIn)
        } else {
          onEvent(`pair: guest #${msg.guest} left (${msg.watchers} watching)`)
        }
      } else if (msg.type === 'pair-run') {
        // no special echo: run() prints the input line, and the transcript
        // mirror carries it (and the command's output) back to every guest
        run(msg.line)
      }
    }
  })

  release = conn.acquire()

  const handle: PairHostHandle = {
    code,
    watchers,
    granted,
    allow: (value: boolean) => {
      granted.value = value
      conn.send({ type: 'pair-allow', granted: value } satisfies PairAllowIn)
    },
    stop: () => stop()
  }

  // a synchronously-throwing WebSocket constructor already ran stop() inside
  // acquire(), before `release` was assigned — drop the just-taken lease and
  // return the (already ended) handle without registering anything. (eslint's
  // flow analysis can't see onFail flipping `stopped` inside acquire — same
  // blind spot relayDuel documents.)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (stopped) {
    release()
    release = null
    return handle
  }

  // mirror pane 0: watch the newest line's id (cheap, and it still changes
  // when the scrollback cap splices the front while the length stays put)
  stopWatch = watch(
    () => lines.value.at(-1)?.id ?? -1,
    () => {
      const batch = mirrorable(lines.value, sentThrough)
      if (!batch.length) return
      // always advance, even with no guests — nobody wants a stale replay
      sentThrough = lines.value.at(-1)?.id ?? sentThrough
      if (watchers.value > 0) conn.send({ type: 'pair-lines', lines: batch } satisfies PairLinesIn)
    }
  )

  registerPairProc({ running: () => !stopped, stop: () => stop() })
  active = handle
  return handle
}
