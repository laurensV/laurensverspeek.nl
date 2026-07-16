// Live integration checks for the websocket relay: boots realtime/
// cursors-server.mjs on a scratch port with scratch state files, then runs
// real two-client conversations against every subsystem — world, scores,
// pong, chess. Run with `npm run test:relay`. Exits non-zero on any failure.

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import WebSocket from 'ws'

const PORT = Number(process.env.RELAY_CHECK_PORT) || 8873
const URL = `ws://localhost:${PORT}`

let passed = 0
let failed = 0
/** @param {string} name @param {boolean} ok @param {string} [detail] */
const check = (name, ok, detail = '') => {
  if (ok) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** A tiny test client: buffers every frame, lets checks await one by type. */
class Client {
  /** @param {string} url */
  constructor(url) {
    this.ws = new WebSocket(url)
    /** @type {Record<string, unknown>[]} */
    this.frames = []
    this.ws.on('message', (raw) => {
      try {
        this.frames.push(JSON.parse(String(raw)))
      } catch { /* ignore non-json */ }
    })
    this.open = new Promise((resolve, reject) => {
      this.ws.once('open', resolve)
      this.ws.once('error', reject)
    })
  }

  /** @param {unknown} msg — usually a frame object, but the robustness checks
   * deliberately send null/string/number payloads too */
  send(msg) {
    this.ws.send(JSON.stringify(msg))
  }

  /** Await the next frame of `type` (consumes it). Null on timeout.
   * @param {string} type @param {number} [timeoutMs] @returns {Promise<Record<string, unknown> | null>} */
  async next(type, timeoutMs = 4000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const index = this.frames.findIndex((frame) => frame.type === type)
      if (index >= 0) return this.frames.splice(index, 1)[0] ?? null
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    return null
  }

  /** True if NO frame of `type` arrives within the window.
   * @param {string} type @param {number} [windowMs] */
  async silent(type, windowMs = 700) {
    return (await this.next(type, windowMs)) === null
  }

  close() {
    this.ws.close()
  }
}

// ---- boot the relay on scratch state ----------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'relay-check-'))
const server = spawn('node', ['realtime/cursors-server.mjs'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    WORLD_FILE: join(scratch, 'world.json'),
    SCORES_FILE: join(scratch, 'scores.json'),
    WORLD_COOLDOWN_MS: '1500',
    RACE_COUNTDOWN_MS: '150'
  },
  stdio: ['ignore', 'pipe', 'inherit']
})
await new Promise((resolve, reject) => {
  const bootTimeout = setTimeout(() => reject(new Error('relay did not boot within 8s')), 8000)
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('listening')) {
      clearTimeout(bootTimeout)
      resolve(undefined)
    }
  })
  server.once('exit', (code) => reject(new Error(`relay exited early (${code})`)))
})

const shutdown = () => {
  server.kill()
  rmSync(scratch, { recursive: true, force: true })
}

try {
  // ---- pixel world ----------------------------------------------------------
  console.log('world:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'world-join' })
    b.send({ type: 'world-join' })
    const state = await a.next('world-state')
    check('join returns the board state', !!state && typeof state.board === 'string' && typeof state.size === 'number')
    await b.next('world-state')
    a.send({ type: 'pixel', x: 3, y: 4, c: 5, name: 'checker' })
    a.send({ type: 'pixel', x: 9, y: 9, c: 1 }) // straight into the cooldown window
    const seenByB = await b.next('pixel')
    check('a placement reaches the other member', !!seenByB && seenByB.x === 3 && seenByB.y === 4 && seenByB.c === 5)
    await a.next('pixel')
    const denied = await a.next('pixel-denied')
    check('the cooldown denies a rapid second pixel', !!denied)
    b.send({ type: 'world-who', x: 3, y: 4 })
    const who = await b.next('pixel-info')
    check('provenance names the placer', !!who && who.by === 'checker')
    a.close()
    b.close()
  }

  // ---- leaderboard ------------------------------------------------------------
  console.log('scores:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'score-submit', game: 'snake', score: 42, name: 'checker' })
    const board = await b.next('score-board')
    const entries = /** @type {{ name: string, score: number }[]} */ (board?.board ?? [])
    check('a submission broadcasts the updated board', board?.game === 'snake' && entries.some((entry) => entry.name === 'checker' && entry.score === 42))
    b.send({ type: 'scores-get' })
    const boards = await b.next('scores')
    check('scores-get returns all boards', !!boards && typeof boards.boards === 'object')
    a.close()
    b.close()
  }

  // ---- online pong ------------------------------------------------------------
  console.log('pong:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'pong-join', name: 'lefty' })
    check('the first joiner waits in the queue', !!(await a.next('pong-wait')))
    b.send({ type: 'pong-join', name: 'righty' })
    const startA = await a.next('pong-start')
    const startB = await b.next('pong-start')
    check('two joiners are matched l/r with names', startA?.side === 'l' && startB?.side === 'r' && startA?.foe === 'righty' && startB?.foe === 'lefty')
    check('the server ticks state to both', !!(await a.next('pong-state')) && !!(await b.next('pong-state')))
    b.close() // rage-quit
    const end = await a.next('pong-end')
    check('a disconnect forfeits to the opponent', end?.winner === 'l' && end?.forfeit === true)
    a.close()
  }

  // ---- online chess -------------------------------------------------------------
  console.log('chess:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'chess-join', name: 'white-hat' })
    check('the first joiner waits in the queue', !!(await a.next('chess-wait')))
    b.send({ type: 'chess-join', name: 'black-hat' })
    const startA = await a.next('chess-start')
    const startB = await b.next('chess-start')
    check('two joiners are matched w/b with names', startA?.side === 'w' && startB?.side === 'b' && startA?.foe === 'black-hat' && startB?.foe === 'white-hat')

    b.send({ type: 'chess-move', from: 12, to: 28 }) // black tries to move first
    check('a move out of turn is ignored', await b.silent('chess-moved'))

    a.send({ type: 'chess-move', from: 52, to: 36 }) // e2–e4
    const movedA = await a.next('chess-moved')
    const movedB = await b.next('chess-moved')
    const moveOf = (/** @type {Record<string, unknown> | null} */ frame) => /** @type {{ from?: number, to?: number } | undefined} */ (frame?.move)
    check('a legal move is applied and broadcast to both', moveOf(movedA)?.from === 52 && moveOf(movedA)?.to === 36 && moveOf(movedB)?.from === 52)

    a.send({ type: 'chess-move', from: 51, to: 35 }) // white again, out of turn
    check('the mover cannot move twice', await a.silent('chess-moved'))

    b.send({ type: 'chess-move', from: 0, to: 63 }) // a rook teleport, please
    check('an illegal move is rejected by the shared rules', await b.silent('chess-moved'))

    b.send({ type: 'chess-move', from: 12, to: 28 }) // e7–e5, black's actual reply
    const reply = await a.next('chess-moved')
    check("black's legal reply comes through", moveOf(reply)?.from === 12 && moveOf(reply)?.to === 28)
    await b.next('chess-moved')

    b.close() // storm off mid-game
    const end = await a.next('chess-end')
    check('a disconnect forfeits to the opponent', end?.winner === 'w' && end?.reason === 'forfeit')
    a.close()
  }

  // ---- chat room ---------------------------------------------------------------
  console.log('chat:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'chat-join' })
    const state = await a.next('chat-state')
    check('joining returns the room state', !!state && Array.isArray(state.messages) && state.online === 1)
    await a.next('chat-count') // a's own join broadcast (online: 1)
    b.send({ type: 'chat-join' })
    await b.next('chat-state')
    check('the member count updates on join', (await a.next('chat-count'))?.online === 2)
    a.send({ type: 'chat-send', text: 'hello from the checks', name: 'checker' })
    const seen = await b.next('chat-msg')
    check('a message reaches the other member', seen?.name === 'checker' && seen?.text === 'hello from the checks' && typeof seen?.at === 'number')
    await a.next('chat-msg')
    a.send({ type: 'chat-send', text: 'flooded line', name: 'checker' }) // inside the send gate
    check('the flood gate drops rapid sends', await b.silent('chat-msg'))
    const c = new Client(URL)
    await c.open
    c.send({ type: 'chat-join' })
    const late = await c.next('chat-state')
    const lateLog = /** @type {{ text: string }[]} */ (late?.messages ?? [])
    check('a late joiner receives the ring buffer', lateLog.some((entry) => entry.text === 'hello from the checks'))
    a.close()
    b.close()
    c.close()
  }

  // ---- wpm race -----------------------------------------------------------------
  console.log('race:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'race-join', name: 'speedy' })
    check('the first racer waits in the queue', !!(await a.next('race-wait')))
    b.send({ type: 'race-join', name: 'clacker' })
    const startA = await a.next('race-start')
    const startB = await b.next('race-start')
    check('both racers get the SAME passage and each other\'s names',
      typeof startA?.text === 'string' && startA.text.length > 0 && startA.text === startB?.text
      && startA?.foe === 'clacker' && startB?.foe === 'speedy')
    const text = String(startA?.text ?? '')

    a.send({ type: 'race-progress', chars: 5 }) // typing before the flag drops
    check('progress before race-go is ignored', await b.silent('race-foe'))

    check('the flag drops for both', !!(await a.next('race-go', 2000)) && !!(await b.next('race-go', 2000)))

    a.send({ type: 'race-progress', chars: text.length }) // a full passage the instant the flag drops
    check('an impossibly-fast (no-typing) finish is rejected', await b.silent('race-foe'))

    a.send({ type: 'race-progress', chars: 10 })
    const foeSeen = await b.next('race-foe')
    check("a racer's progress reaches the opponent", foeSeen?.chars === 10)

    a.send({ type: 'race-progress', chars: 4 }) // running backwards
    check('non-monotonic progress is rejected', await b.silent('race-foe'))
    a.send({ type: 'race-progress', chars: text.length + 50 }) // beyond the passage
    check('progress past the passage is rejected', await b.silent('race-foe'))

    // now a plausible finish: wait past the server's superhuman-speed floor
    // (30ms/char) so the full passage isn't dropped as a forged instant-win
    await new Promise((resolve) => setTimeout(resolve, text.length * 30 + 400))
    b.send({ type: 'race-progress', chars: text.length }) // the server declares the finish
    const endA = await a.next('race-end')
    const endB = await b.next('race-end')
    check('the server declares the finisher the winner', endB?.youWon === true && endA?.youWon === false && !endA?.forfeit)
    a.close()
    b.close()
  }

  // ---- race forfeit ---------------------------------------------------------------
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'race-join', name: 'stayer' })
    await a.next('race-wait')
    b.send({ type: 'race-join', name: 'quitter' })
    await Promise.all([a.next('race-start'), b.next('race-start')])
    b.close() // bail mid-countdown
    const end = await a.next('race-end')
    check('a disconnect forfeits the race to the opponent', end?.youWon === true && end?.forfeit === true)
    a.close()
  }

  // ---- fool's mate: the server itself declares checkmate -----------------------
  console.log('chess endgame:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'chess-join', name: 'doomed' })
    await a.next('chess-wait')
    b.send({ type: 'chess-join', name: 'queen-slinger' })
    await Promise.all([a.next('chess-start'), b.next('chess-start')])
    // 1. f3 e5 2. g4 Qh4# (white digs its own grave; gate is 250ms between moves)
    /** @type {[Client, number, number][]} */
    const moves = [[a, 53, 45], [b, 12, 28], [a, 54, 38], [b, 3, 39]]
    for (const [client, from, to] of moves) {
      await new Promise((resolve) => setTimeout(resolve, 300)) // respect the flood gate
      client.send({ type: 'chess-move', from, to })
      await Promise.all([a.next('chess-moved'), b.next('chess-moved')])
    }
    const endA = await a.next('chess-end')
    const endB = await b.next('chess-end')
    check("fool's mate ends the match with black the winner", endA?.winner === 'b' && endA?.reason === 'checkmate' && endB?.winner === 'b')
    a.close()
    b.close()
  }

  // ---- co-draw whiteboard ------------------------------------------------------
  console.log('draw:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'draw-join' })
    const state = await a.next('draw-state')
    check('joining returns the board + members', !!state && Array.isArray(state.strokes) && state.online === 1)
    await a.next('draw-count') // a's own join broadcast
    b.send({ type: 'draw-join' })
    await b.next('draw-state')
    check('the member count updates on join', (await a.next('draw-count'))?.online === 2)

    // send two segments back-to-back (synchronously, well inside the 8ms gate):
    // the first lands, the second is flood-dropped
    a.send({ type: 'draw-stroke', x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4, c: 2 })
    a.send({ type: 'draw-stroke', x0: 0.5, y0: 0.5, x1: 0.6, y1: 0.6, c: 3 })
    const seen = await b.next('draw-stroke')
    check('a stroke reaches the other member', seen?.x0 === 0.1 && seen?.y1 === 0.4 && seen?.c === 2)
    check('the drawer does not receive its own echo', await a.silent('draw-stroke'))
    check('the flood gate drops rapid segments', await b.silent('draw-stroke'))

    await new Promise((resolve) => setTimeout(resolve, 20))
    a.send({ type: 'draw-stroke', x0: 0, y0: 0, x1: 0, y1: 0, c: 999 }) // an out-of-palette pen
    check('an unsanitary stroke is dropped', await b.silent('draw-stroke'))

    const c = new Client(URL)
    await c.open
    c.send({ type: 'draw-join' })
    const late = await c.next('draw-state')
    const lateStrokes = /** @type {{ c: number }[]} */ (late?.strokes ?? [])
    check('a late joiner receives the stroke buffer', lateStrokes.some((entry) => entry.c === 2))

    // live pen cursors (broadcast to others, throttled by a 40ms gate)
    const gap = () => new Promise((resolve) => setTimeout(resolve, 50))
    a.send({ type: 'draw-cursor', x: 0.25, y: 0.75, c: 4 })
    const cur = await b.next('draw-cursor')
    check('a live pen cursor reaches the others', cur?.x === 0.25 && cur?.y === 0.75 && cur?.c === 4 && typeof cur?.id === 'number')
    check('the drawer does not receive its own cursor', await a.silent('draw-cursor'))
    await gap()
    a.send({ type: 'draw-cursor', x: 2, y: -1, c: 5 }) // out of the board
    const clamped = await b.next('draw-cursor')
    check('a live cursor is clamped into the board', clamped?.x === 1 && clamped?.y === 0)
    await gap()
    a.send({ type: 'draw-cursor', x: 0.5, y: 0.5, c: 42 }) // bad pen index
    check('a cursor with an invalid pen is dropped', await b.silent('draw-cursor'))
    // a member leaving takes its cursor dot with it
    c.send({ type: 'draw-cursor', x: 0.4, y: 0.4, c: 1 })
    const cCur = await a.next('draw-cursor')
    c.send({ type: 'draw-leave' })
    const gone = await a.next('draw-cursor-gone')
    check('a leaving member clears its cursor for everyone', gone?.id === cCur?.id)

    await new Promise((resolve) => setTimeout(resolve, 20))
    b.send({ type: 'draw-clear' })
    check('clear wipes the board for the others', !!(await a.next('draw-clear')))
    a.close()
    b.close()
    c.close()
  }

  // ---- whiteboard undo (per-drawer, whole pen-drag) ---------------------------
  console.log('draw undo:')
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'draw-join' })
    b.send({ type: 'draw-join' })
    await Promise.all([a.next('draw-state'), b.next('draw-state')])
    const gap = () => new Promise((resolve) => setTimeout(resolve, 20)) // clear the 8ms stroke gate
    a.send({ type: 'draw-stroke', x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2, c: 2, sid: 1 })
    await b.next('draw-stroke')
    await gap()
    a.send({ type: 'draw-stroke', x0: 0.3, y0: 0.3, x1: 0.4, y1: 0.4, c: 3, sid: 2 })
    const second = await b.next('draw-stroke')
    check('a stroke carries its drawer id + pen-drag id', typeof second?.by === 'number' && second?.sid === 2)
    await gap()
    // undoing a sid the server never received (its segments were flood-dropped)
    // must remove nothing and stay silent, not erase a different stroke
    a.send({ type: 'draw-undo', sid: 999 })
    check('an undo for an unknown sid is a silent no-op', await b.silent('draw-undo'))
    await gap()
    a.send({ type: 'draw-undo', sid: 2 })
    const undone = await b.next('draw-undo')
    check('undo removes exactly the sid the client resolved', undone?.sid === 2 && undone?.by === second?.by)
    await gap()
    a.send({ type: 'draw-undo', sid: 1 })
    check('a second undo removes the previous stroke', (await b.next('draw-undo'))?.sid === 1)
    const c = new Client(URL)
    await c.open
    c.send({ type: 'draw-join' })
    const late = await c.next('draw-state')
    const lateStrokes = /** @type {{ sid: number }[]} */ (late?.strokes ?? [])
    check('both undone strokes are gone from the buffer', !lateStrokes.some((s) => s.sid === 1 || s.sid === 2))
    a.close()
    b.close()
    c.close()
  }

  // ---- pair terminal (shared live sessions) -----------------------------------
  console.log('pair:')
  {
    const host = new Client(URL)
    const g1 = new Client(URL)
    const g2 = new Client(URL)
    await Promise.all([host.open, g1.open, g2.open])

    host.send({ type: 'pair-create' })
    const codeMsg = await host.next('pair-code')
    const code = String(codeMsg?.code ?? '')
    check('create returns a 4-char unambiguous code', /^[A-Z0-9]{4}$/.test(code) && !/[O0I1]/.test(code))

    const lost = new Client(URL)
    await lost.open
    // '0000' passes the shape check but can never be minted (0 is excluded)
    lost.send({ type: 'pair-join', code: '0000' })
    check('joining a dead code errors', (await lost.next('pair-error'))?.reason === 'bad-code')
    lost.close()

    g1.send({ type: 'pair-join', code: code.toLowerCase() }) // server uppercases
    const joined = await g1.next('pair-joined')
    const peer = await host.next('pair-peer')
    check('a lowercase code joins and reports watchers', joined?.code === code && joined?.watchers === 1)
    check('the host learns the joiner id', peer?.event === 'joined' && typeof peer?.guest === 'number' && peer?.watchers === 1)
    const g1id = Number(peer?.guest)

    // broadcast lines are REBUILT: 500-char text clipped to 400, an off-whitelist
    // type dropped, extra fields never passed through
    host.send({
      type: 'pair-lines',
      lines: [
        { type: 'output', text: 'x'.repeat(500), evil: 'smuggled' },
        { type: 'blink', text: 'nope' },
        { type: 'input', text: 'ls' }
      ]
    })
    const linesMsg = await g1.next('pair-lines')
    const got = /** @type {{ type: string, text: string, evil?: string }[]} */ (linesMsg?.lines ?? [])
    check('host lines reach the guest rebuilt: clipped, whitelisted, no extras',
      got.length === 2 && got[0]?.text.length === 400 && got[0]?.evil === undefined
      && got[1]?.type === 'input' && !got.some((line) => line.type === 'blink'))

    // two broadcast frames back-to-back (synchronously, inside the 40ms gate):
    // the first lands, the second is flood-dropped. Clear the gate first — the
    // sanitize frame above may be less than 40ms behind us.
    await new Promise((resolve) => setTimeout(resolve, 50))
    host.send({ type: 'pair-lines', lines: [{ type: 'output', text: 'one' }] })
    host.send({ type: 'pair-lines', lines: [{ type: 'output', text: 'two' }] })
    const flood = /** @type {{ text: string }[]} */ ((await g1.next('pair-lines'))?.lines ?? [])
    check('rapid line frames are flood-dropped', flood[0]?.text === 'one' && await g1.silent('pair-lines'))

    // a guest command is blocked while view-only, relayed once granted
    g1.send({ type: 'pair-run', line: 'whoami' })
    check('a guest command is blocked while view-only', await host.silent('pair-run'))
    host.send({ type: 'pair-allow', granted: true })
    check('granting the keyboard notifies guests', (await g1.next('pair-granted'))?.granted === true)
    g1.send({ type: 'pair-run', line: 'whoami' })
    check('a granted guest command reaches the host', (await host.next('pair-run'))?.line === 'whoami')

    g2.send({ type: 'pair-join', code })
    const joined2 = await g2.next('pair-joined')
    const peer2 = await host.next('pair-peer')
    check('a second guest bumps the watcher count for everyone',
      joined2?.watchers === 2 && peer2?.guest !== g1id && (await g1.next('pair-watchers'))?.watchers === 2)
    check('a mid-session joiner learns the room is already granted', (await g2.next('pair-granted'))?.granted === true)
    const g2id = Number(peer2?.guest)

    // a `for`-routed backlog reaches ONLY the named guest
    host.send({ type: 'pair-lines', lines: [{ type: 'muted', text: 'backlog line' }], for: g2id })
    const backlog = /** @type {{ text: string }[]} */ ((await g2.next('pair-lines'))?.lines ?? [])
    check('a for-routed backlog reaches the target guest', backlog[0]?.text === 'backlog line')
    check('the backlog does not leak to other guests', await g1.silent('pair-lines'))

    g1.close() // a watcher wanders off
    const left = await host.next('pair-peer')
    check('a guest disconnect notifies the host', left?.event === 'left' && left?.guest === g1id && left?.watchers === 1)
    check('remaining guests see the watcher count drop', (await g2.next('pair-watchers'))?.watchers === 1)

    host.close() // the host pulls the plug
    check('a host disconnect closes the session for guests', !!(await g2.next('pair-closed')))
    g2.close()
  }

  // ---- robustness: hostile frames must not crash the relay --------------------
  console.log('robustness:')
  {
    const a = new Client(URL)
    await a.open
    a.send(null) // JSON.parse('null') succeeds but isn't an object
    a.send('nope') // a bare string
    a.send(42) // a bare number
    a.send({ type: 'scores-get' }) // a legit follow-up proves the relay is alive
    check('a non-object payload does not crash the relay', !!(await a.next('scores')))
    a.close()
  }
  {
    const a = new Client(URL)
    const b = new Client(URL)
    await Promise.all([a.open, b.open])
    a.send({ type: 'world-join' })
    b.send({ type: 'world-join' })
    await Promise.all([a.next('world-state'), b.next('world-state')])
    // sent as RAW json text: JSON.stringify(Infinity) is 'null', but an
    // attacker writes the frame by hand, and JSON.parse('1e400') === Infinity
    // (typeof 'number', so only Number.isFinite rejects it — unguarded it relays)
    a.ws.send('{"type":"world-cursor","x":1e400,"y":0.5}')
    check('a non-finite world cursor is dropped', await b.silent('world-cursor'))
    a.close()
    b.close()
  }
} finally {
  shutdown()
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
