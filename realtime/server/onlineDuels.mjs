// The three online duels — pong, chess and the wpm race — extracted from the
// relay so cursors-server.mjs stays focused on cursors/world/scores/chat/draw.
//
// Each is a factory taking a small context ({ wire, sendTo, gate }) from the
// main file — wire so frames stay type-checked against the shared protocol,
// sendTo so only-if-open sends stay one helper, and gate so every per-connection
// CooldownGate registers in the main file's allGates registry (forgetConnection
// clears it on close). Each returns { handle(socket, msg, id), drop(socket) }:
// handle runs the duel's message-router branches and returns true if it owned
// msg.type; drop forfeits/dequeues a leaving or disconnecting player.

import { createPongState, stepPong, movePaddle, PONG_TICK_MS } from '../pong-core.mjs'
import { pickPassage, validProgress, RACE_COUNTDOWN_MS } from '../race-core.mjs'
import { initialState as chessInitial, legalMoves as chessLegalMoves, applyMove as chessApply, gameOver as chessOver } from '../chess-core.mjs'
import { cleanName } from '../scores-core.mjs'

/** @typedef {import('../protocol.js').ServerMessage} ServerMessage */
/**
 * @typedef {{
 *   wire: (msg: ServerMessage) => string,
 *   sendTo: (socket: import('ws').WebSocket, payload: string) => void,
 *   gate: (ms: number) => import('../world-core.mjs').CooldownGate
 * }} DuelCtx
 */

// ---- online pong: server-authoritative matches between two visitors ----
/**
 * @typedef {{
 *   left: import('ws').WebSocket, right: import('ws').WebSocket,
 *   state: import('../pong-core.mjs').PongState,
 *   timer: ReturnType<typeof setInterval>
 * }} PongMatch
 */
/** @param {DuelCtx} ctx */
export const createPongManager = ({ wire, sendTo, gate }) => {
  /** @type {{ socket: import('ws').WebSocket, name: string } | null} */
  let pongWaiting = null
  /** @type {Map<import('ws').WebSocket, PongMatch>} */
  const pongMatches = new Map()
  // paddle updates are frequent but tiny; a lenient per-connection gate stops floods
  const pongMoveGate = gate(20)

  /** @param {PongMatch} match @param {'l' | 'r'} winner @param {boolean} [forfeit] */
  const endPongMatch = (match, winner, forfeit = false) => {
    clearInterval(match.timer)
    pongMatches.delete(match.left)
    pongMatches.delete(match.right)
    const payload = wire(forfeit ? { type: 'pong-end', winner, forfeit: true } : { type: 'pong-end', winner })
    sendTo(match.left, payload)
    sendTo(match.right, payload)
  }

  /** @param {import('ws').WebSocket} a @param {string} aName @param {import('ws').WebSocket} b @param {string} bName */
  const startPongMatch = (a, aName, b, bName) => {
    /** @type {PongMatch} */
    const match = {
      left: a,
      right: b,
      state: createPongState(),
      timer: setInterval(() => {
        const outcome = stepPong(match.state)
        const { state } = match
        const payload = wire({
          type: 'pong-state',
          bx: state.ballX,
          by: state.ballY,
          ly: state.leftY,
          ry: state.rightY,
          ls: state.leftScore,
          rs: state.rightScore
        })
        sendTo(match.left, payload)
        sendTo(match.right, payload)
        if (outcome === 'win-l') endPongMatch(match, 'l')
        else if (outcome === 'win-r') endPongMatch(match, 'r')
      }, PONG_TICK_MS)
    }
    pongMatches.set(a, match)
    pongMatches.set(b, match)
    sendTo(a, wire({ type: 'pong-start', side: 'l', foe: bName }))
    sendTo(b, wire({ type: 'pong-start', side: 'r', foe: aName }))
  }

  /** A player left (message or disconnect): forfeit their match / clear the queue.
   * @param {import('ws').WebSocket} socket */
  const drop = (socket) => {
    if (pongWaiting?.socket === socket) pongWaiting = null
    const match = pongMatches.get(socket)
    if (match) endPongMatch(match, socket === match.left ? 'r' : 'l', true)
  }

  /** @param {import('ws').WebSocket} socket @param {any} msg @param {number} id */
  const handle = (socket, msg, id) => {
    if (msg.type === 'pong-join') {
      if (pongMatches.has(socket) || pongWaiting?.socket === socket) return true
      const name = cleanName(msg.name) || 'visitor'
      if (pongWaiting && pongWaiting.socket.readyState === 1) {
        const foe = pongWaiting
        pongWaiting = null
        startPongMatch(foe.socket, foe.name, socket, name)
      } else {
        pongWaiting = { socket, name }
        sendTo(socket, wire({ type: 'pong-wait' }))
      }
      return true
    }
    if (msg.type === 'pong-leave') {
      drop(socket)
      return true
    }
    if (msg.type === 'pong-move') {
      const match = pongMatches.get(socket)
      if (!match || typeof msg.y !== 'number') return true
      if (pongMoveGate.check(id, Date.now()) > 0) return true
      movePaddle(match.state, socket === match.left ? 'l' : 'r', msg.y)
      return true
    }
    return false
  }

  return { handle, drop }
}

// ---- online chess: turn-based matches, validated by the shared rules ----
/**
 * @typedef {{
 *   white: import('ws').WebSocket, black: import('ws').WebSocket,
 *   state: import('../chess-core.mjs').ChessState
 * }} ChessMatch
 */
/** @param {DuelCtx} ctx */
export const createChessManager = ({ wire, sendTo, gate }) => {
  /** @type {{ socket: import('ws').WebSocket, name: string } | null} */
  let chessWaiting = null
  /** @type {Map<import('ws').WebSocket, ChessMatch>} */
  const chessMatches = new Map()
  // chess is turn-based; the gate just blunts scripted floods
  const chessMoveGate = gate(250)

  /** @param {ChessMatch} match @param {'w' | 'b' | null} winner @param {'checkmate' | 'stalemate' | 'forfeit'} reason */
  const endChessMatch = (match, winner, reason) => {
    chessMatches.delete(match.white)
    chessMatches.delete(match.black)
    const payload = wire({ type: 'chess-end', winner, reason })
    sendTo(match.white, payload)
    sendTo(match.black, payload)
  }

  /** @param {import('ws').WebSocket} a @param {string} aName @param {import('ws').WebSocket} b @param {string} bName */
  const startChessMatch = (a, aName, b, bName) => {
    // the earlier queuer gets white
    /** @type {ChessMatch} */
    const match = { white: a, black: b, state: chessInitial() }
    chessMatches.set(a, match)
    chessMatches.set(b, match)
    sendTo(a, wire({ type: 'chess-start', side: 'w', foe: bName }))
    sendTo(b, wire({ type: 'chess-start', side: 'b', foe: aName }))
  }

  /** A player left (message or disconnect): forfeit their match / clear the queue.
   * @param {import('ws').WebSocket} socket */
  const drop = (socket) => {
    if (chessWaiting?.socket === socket) chessWaiting = null
    const match = chessMatches.get(socket)
    if (match) endChessMatch(match, socket === match.white ? 'b' : 'w', 'forfeit')
  }

  /** @param {import('ws').WebSocket} socket @param {any} msg @param {number} id */
  const handle = (socket, msg, id) => {
    if (msg.type === 'chess-join') {
      if (chessMatches.has(socket) || chessWaiting?.socket === socket) return true
      const name = cleanName(msg.name) || 'visitor'
      if (chessWaiting && chessWaiting.socket.readyState === 1) {
        const foe = chessWaiting
        chessWaiting = null
        startChessMatch(foe.socket, foe.name, socket, name)
      } else {
        chessWaiting = { socket, name }
        sendTo(socket, wire({ type: 'chess-wait' }))
      }
      return true
    }
    if (msg.type === 'chess-leave') {
      drop(socket)
      return true
    }
    if (msg.type === 'chess-move') {
      const match = chessMatches.get(socket)
      if (!match || typeof msg.from !== 'number' || typeof msg.to !== 'number') return true
      if (chessMoveGate.check(id, Date.now()) > 0) return true
      // only the side to move may move — and only to a legal square. The full
      // move (promo/castle/ep) comes from the server's own legal list; nothing
      // else in the client frame is trusted.
      const mySide = socket === match.white ? 'w' : 'b'
      if (match.state.turn !== mySide) return true
      const move = chessLegalMoves(match.state).find((m) => m.from === msg.from && m.to === msg.to)
      if (!move) return true
      match.state = chessApply(match.state, move)
      const payload = wire({ type: 'chess-moved', move })
      sendTo(match.white, payload)
      sendTo(match.black, payload)
      const over = chessOver(match.state)
      if (over === 'checkmate') endChessMatch(match, mySide, 'checkmate')
      else if (over === 'stalemate') endChessMatch(match, null, 'stalemate')
      return true
    }
    return false
  }

  return { handle, drop }
}

// ---- wpm race: two typists, one passage, the server holds the stopwatch ----
/**
 * @typedef {{
 *   a: import('ws').WebSocket, b: import('ws').WebSocket,
 *   text: string, started: boolean, goAt: number,
 *   progress: Map<import('ws').WebSocket, number>,
 *   countdown: ReturnType<typeof setTimeout>
 * }} RaceMatch
 */
/** @param {DuelCtx} ctx */
export const createRaceManager = ({ wire, sendTo, gate }) => {
  /** @type {{ socket: import('ws').WebSocket, name: string } | null} */
  let raceWaiting = null
  /** @type {Map<import('ws').WebSocket, RaceMatch>} */
  const raceMatches = new Map()
  // progress reports arrive per keystroke burst; a lenient gate blunts floods
  const raceProgressGate = gate(60)
  // the countdown is env-overridable so the relay test doesn't sit out 3s
  const raceCountdownMs = Number(process.env.RACE_COUNTDOWN_MS || RACE_COUNTDOWN_MS)
  // minimum plausible ms per finished character — a full passage that "arrives"
  // faster than this is a forged instant-win. 30ms/char ≈ a superhuman 400 WPM
  // ceiling (real typists top out ~220 WPM), so legit finishes are never caught.
  // Env-overridable so the relay test can use a tiny floor without real waits.
  const raceMinMsPerChar = Number(process.env.RACE_MIN_MS_PER_CHAR || 30)

  /** @param {RaceMatch} match @param {import('ws').WebSocket | null} winner @param {boolean} [forfeit] */
  const endRace = (match, winner, forfeit = false) => {
    clearTimeout(match.countdown)
    raceMatches.delete(match.a)
    raceMatches.delete(match.b)
    for (const player of [match.a, match.b]) {
      const youWon = player === winner
      sendTo(player, wire(forfeit ? { type: 'race-end', youWon, forfeit: true } : { type: 'race-end', youWon }))
    }
  }

  /** @param {import('ws').WebSocket} a @param {string} aName @param {import('ws').WebSocket} b @param {string} bName */
  const startRace = (a, aName, b, bName) => {
    const text = pickPassage()
    /** @type {RaceMatch} */
    const match = {
      a,
      b,
      text,
      started: false,
      goAt: 0,
      progress: new Map([[a, 0], [b, 0]]),
      countdown: setTimeout(() => {
        match.started = true
        match.goAt = Date.now() // start the stopwatch to reject instant "wins"
        const go = wire({ type: 'race-go' })
        sendTo(a, go)
        sendTo(b, go)
      }, raceCountdownMs)
    }
    raceMatches.set(a, match)
    raceMatches.set(b, match)
    sendTo(a, wire({ type: 'race-start', foe: bName, text }))
    sendTo(b, wire({ type: 'race-start', foe: aName, text }))
  }

  /** A racer left (message or disconnect): forfeit the match / clear the queue.
   * @param {import('ws').WebSocket} socket */
  const drop = (socket) => {
    if (raceWaiting?.socket === socket) raceWaiting = null
    const match = raceMatches.get(socket)
    if (match) endRace(match, socket === match.a ? match.b : match.a, true)
  }

  /** @param {import('ws').WebSocket} socket @param {any} msg @param {number} id */
  const handle = (socket, msg, id) => {
    if (msg.type === 'race-join') {
      if (raceMatches.has(socket) || raceWaiting?.socket === socket) return true
      const name = cleanName(msg.name) || 'visitor'
      if (raceWaiting && raceWaiting.socket.readyState === 1) {
        const foe = raceWaiting
        raceWaiting = null
        startRace(foe.socket, foe.name, socket, name)
      } else {
        raceWaiting = { socket, name }
        sendTo(socket, wire({ type: 'race-wait' }))
      }
      return true
    }
    if (msg.type === 'race-leave') {
      drop(socket)
      return true
    }
    if (msg.type === 'race-progress') {
      const match = raceMatches.get(socket)
      if (!match || !match.started) return true
      const previous = match.progress.get(socket) ?? 0
      if (!validProgress(msg.chars, previous, match.text.length)) return true
      // the finishing frame may never be flood-dropped, or nobody could win
      const finishing = msg.chars >= match.text.length
      if (!finishing && raceProgressGate.check(id, Date.now()) > 0) return true
      // the server can't see keystrokes, but it does hold the stopwatch: a full
      // passage that "arrives" faster than a superhuman ceiling is a forged
      // instant-win — drop it rather than mint a bogus victory.
      if (finishing && Date.now() - match.goAt < match.text.length * raceMinMsPerChar) return true
      match.progress.set(socket, msg.chars)
      sendTo(socket === match.a ? match.b : match.a, wire({ type: 'race-foe', chars: msg.chars }))
      // the server declares the finish — first full passage wins
      if (msg.chars >= match.text.length) endRace(match, socket)
      return true
    }
    return false
  }

  return { handle, drop }
}
