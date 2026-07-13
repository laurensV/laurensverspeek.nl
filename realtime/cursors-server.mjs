// Tiny websocket relay for live visitor cursors.
//
// Run locally:   node realtime/cursors-server.mjs        (ws://localhost:8787)
// Deploy:        any Node host (Fly.io, Railway, a VPS...) — no state, no storage.
// Then set NUXT_PUBLIC_CURSORS_WS=wss://your-host on the site build.
//
// Privacy: only anonymous cursor positions (fractions of the viewport) and the
// current page path are relayed. No IPs, IDs or fingerprints are stored.

import { WebSocketServer } from 'ws'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  WORLD_SIZE, WORLD_COOLDOWN_MS, inWorld, validColor,
  CooldownGate, createSeedBoard, encodeBoard, decodeBoard
} from './world-core.mjs'
import { validSubmission, addScore, cleanName, emptyBoards } from './scores-core.mjs'
import { sanitizeStroke, validPen, MAX_STROKES } from './draw-core.mjs'
import { createPongManager, createChessManager, createRaceManager } from './server/onlineDuels.mjs'

const PORT = Number(process.env.PORT) || 8787
const MAX_CLIENTS = 64

// Every per-connection CooldownGate is created through gate() so it registers
// itself here; forgetConnection(id) then clears that id from ALL of them on
// close. Without this a newly-added gate is easy to forget in the close handler,
// and its per-id map leaks one entry per connection for the relay's whole uptime
// (exactly the bug drawGate hit). Register once, never forget.
const allGates = /** @type {import('./world-core.mjs').CooldownGate[]} */ ([])
const gate = (/** @type {number} */ ms) => {
  const g = new CooldownGate(ms)
  allGates.push(g)
  return g
}
const forgetConnection = (/** @type {number} */ id) => {
  for (const g of allGates) g.last.delete(id)
}

// ---- the game leaderboard: top scores per game, persisted ----
const SCORES_FILE = process.env.SCORES_FILE
  ?? fileURLToPath(new URL('./scores.json', import.meta.url))
/** @type {Record<string, { name: string, score: number, at: number }[]>} */
let scoreBoards = emptyBoards()
try {
  const saved = JSON.parse(readFileSync(SCORES_FILE, 'utf8'))
  scoreBoards = { ...emptyBoards(), ...saved }
} catch { /* no saved scores yet */ }
let scoresSaveTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined)
const scheduleScoresSave = () => {
  clearTimeout(scoresSaveTimer)
  scoresSaveTimer = setTimeout(() => {
    try {
      writeFileSync(SCORES_FILE, JSON.stringify(scoreBoards))
    } catch (error) {
      console.warn('[scores] save failed:', error)
    }
  }, 2000)
}
// submissions are rate-limited per connection
const scoreGate = gate(1500)

// ---- the pixel world: one persistent board, server-authoritative ----
const WORLD_FILE = process.env.WORLD_FILE
  ?? fileURLToPath(new URL('./world-board.json', import.meta.url))
const COOLDOWN_MS = Number(process.env.WORLD_COOLDOWN_MS) || WORLD_COOLDOWN_MS
// a ring buffer of the most recent placements, for the client time-lapse
const HISTORY_MAX = 200
/** @type {{ x: number, y: number, c: number, at: number }[]} */
let history = []

/** @type {Uint8Array} */
let board
/** @type {Record<string, { by: string, at: number }>} provenance, keyed "x,y" */
let placedBy = {}
try {
  const saved = JSON.parse(readFileSync(WORLD_FILE, 'utf8'))
  board = decodeBoard(saved.board)
  placedBy = saved.placedBy ?? {}
  history = Array.isArray(saved.history) ? saved.history.slice(-HISTORY_MAX) : []
  if (board.length !== WORLD_SIZE * WORLD_SIZE) throw new Error('size mismatch')
} catch {
  board = createSeedBoard()
  placedBy = {}
}

let saveTimer = /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined)
const scheduleSave = () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      writeFileSync(WORLD_FILE, JSON.stringify({ board: encodeBoard(board), placedBy, history }))
    } catch (error) {
      console.warn('[world] save failed:', error)
    }
  }, 2000)
}

const cooldowns = gate(COOLDOWN_MS)
// broadcasts (chat + cursor moves) are throttled per connection too, so a
// scripted client can't flood the fan-out. Moves are lenient (the client
// already throttles to ~90ms); chat is slower.
const moveGate = gate(45)
const chatGate = gate(400)
/** placements in the trailing 10 minutes, for the activity counter */
/** @type {number[]} */
let activity = []
const recentActivity = () => {
  const cutoff = Date.now() - 10 * 60_000
  activity = activity.filter((t) => t > cutoff)
  return activity.length
}

/** @type {Set<import('ws').WebSocket>} sockets currently inside the world */
const worldMembers = new Set()
const broadcastWorld = (/** @type {string} */ payload) => {
  for (const member of worldMembers) {
    if (member.readyState === 1) member.send(payload)
  }
}
const broadcastWorldCount = () => {
  broadcastWorld(wire({ type: 'world-count', online: worldMembers.size, recent: recentActivity() }))
}

/** @typedef {import('./protocol.js').ServerMessage} ServerMessage */
/** Stringify an outbound frame, type-checked against the shared wire contract
 * in protocol.d.ts — drift between server and client shapes fails checkJs.
 * @param {ServerMessage} msg */
const wire = (msg) => JSON.stringify(msg)

// ---- the three online duels (pong, chess, wpm race) live in their own module;
// each gets wire (type-checked frames), sendTo (send-if-open) and gate (so their
// per-connection CooldownGates register in allGates and forgetConnection clears
// them on close). Each returns { handle(socket, msg, id), drop(socket) }. ----
/** @param {import('ws').WebSocket} socket @param {string} payload */
const sendTo = (socket, payload) => {
  if (socket.readyState === 1) socket.send(payload)
}
const pong = createPongManager({ wire, sendTo, gate })
const chess = createChessManager({ wire, sendTo, gate })
const race = createRaceManager({ wire, sendTo, gate })

// ---- the chat room: one ephemeral feed, a short ring buffer in memory ----
const CHAT_LOG_MAX = 50
/** @type {import('./protocol.js').ChatMessage[]} */
let chatLog = []
/** @type {Set<import('ws').WebSocket>} */
const chatMembers = new Set()
const chatSendGate = gate(1200)
const broadcastChat = (/** @type {string} */ payload) => {
  for (const member of chatMembers) {
    if (member.readyState === 1) member.send(payload)
  }
}
const broadcastChatCount = () => {
  broadcastChat(wire({ type: 'chat-count', online: chatMembers.size }))
}

// ---- the co-draw whiteboard: one ephemeral shared canvas, a ring buffer of
// recent freehand segments replayed to each new joiner ----
/** @type {{ x0: number, y0: number, x1: number, y1: number, c: number }[]} */
let drawLog = []
/** @type {Set<import('ws').WebSocket>} */
const drawMembers = new Set()
// drawing fires many segments a second; a light gate blunts scripted floods
// without dropping a normal drag (~60/s)
const drawGate = gate(8)
// live pen positions are broadcast far more coarsely than strokes are drawn
const drawCursorGate = gate(40)
/** @param {string} payload @param {import('ws').WebSocket} [except] */
const broadcastDraw = (payload, except) => {
  for (const member of drawMembers) {
    if (member !== except && member.readyState === 1) member.send(payload)
  }
}
const broadcastDrawCount = () => {
  broadcastDraw(wire({ type: 'draw-count', online: drawMembers.size }))
}

const wss = new WebSocketServer({ port: PORT })
let nextId = 1

wss.on('connection', (socket) => {
  // clients.size already counts this socket, so reject once it would exceed the
  // cap — MAX_CLIENTS stay connected, the next one is turned away immediately
  if (wss.clients.size > MAX_CLIENTS) {
    socket.close(1013, 'server full')
    return
  }
  const id = nextId++
  const hue = (id * 47) % 360
  socket.send(wire({ type: 'hello', id, hue }))

  socket.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    // JSON.parse('null') / '123' / '"x"' succeed but aren't objects — every
    // handler below reads msg.type, so a bare `null` would throw and (with no
    // uncaughtException handler) take down the whole single-instance relay.
    if (!msg || typeof msg !== 'object') return
    // chat: a short message shown as a speech bubble over the sender's cursor
    if (msg.type === 'say' && typeof msg.text === 'string') {
      const text = msg.text.slice(0, 80)
      if (!text.trim()) return
      if (chatGate.check(id, Date.now()) > 0) return // drop flooded chat
      const payload = wire({ type: 'say', id, text })
      for (const client of wss.clients) {
        if (client !== socket && client.readyState === 1) client.send(payload)
      }
      return
    }
    // ---- leaderboard protocol (server-authoritative) ----
    if (msg.type === 'scores-get') {
      socket.send(wire({ type: 'scores', boards: scoreBoards }))
      return
    }
    if (msg.type === 'score-submit') {
      if (!validSubmission(msg)) return
      if (scoreGate.check(id, Date.now()) > 0) return
      const entry = { name: cleanName(msg.name), score: msg.score, at: Date.now() }
      scoreBoards[msg.game] = addScore(scoreBoards[msg.game], entry)
      scheduleScoresSave()
      // broadcast the updated board for that game to everyone
      const payload = wire({ type: 'score-board', game: msg.game, board: scoreBoards[msg.game] })
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(payload)
      }
      return
    }
    // ---- the three online duels (pong, chess, wpm race) own their protocol
    // frames; each handle() returns true once it recognises msg.type ----
    if (pong.handle(socket, msg, id)) return
    if (chess.handle(socket, msg, id)) return
    if (race.handle(socket, msg, id)) return
    // ---- chat-room protocol (ephemeral, server-sanitized) ----
    if (msg.type === 'chat-join') {
      chatMembers.add(socket)
      socket.send(wire({ type: 'chat-state', messages: chatLog, online: chatMembers.size }))
      broadcastChatCount()
      return
    }
    if (msg.type === 'chat-leave') {
      if (chatMembers.delete(socket)) broadcastChatCount()
      return
    }
    if (msg.type === 'chat-send') {
      if (!chatMembers.has(socket) || typeof msg.text !== 'string') return
      const text = msg.text.slice(0, 200).trim()
      if (!text) return
      if (chatSendGate.check(id, Date.now()) > 0) return // drop flooded sends
      const entry = { name: cleanName(msg.name) || 'visitor', text, at: Date.now() }
      chatLog.push(entry)
      if (chatLog.length > CHAT_LOG_MAX) chatLog = chatLog.slice(-CHAT_LOG_MAX)
      broadcastChat(wire({ type: 'chat-msg', ...entry }))
      return
    }
    // ---- co-draw whiteboard protocol (ephemeral, server-sanitized) ----
    if (msg.type === 'draw-join') {
      drawMembers.add(socket)
      socket.send(wire({ type: 'draw-state', strokes: drawLog, online: drawMembers.size }))
      broadcastDrawCount()
      return
    }
    if (msg.type === 'draw-leave') {
      if (drawMembers.delete(socket)) {
        broadcastDrawCount()
        broadcastDraw(wire({ type: 'draw-cursor-gone', id }), socket)
      }
      return
    }
    if (msg.type === 'draw-stroke') {
      if (!drawMembers.has(socket)) return
      const stroke = sanitizeStroke(msg)
      if (!stroke) return
      if (drawGate.check(id, Date.now()) > 0) return // drop flooded segments
      drawLog.push(stroke)
      if (drawLog.length > MAX_STROKES) drawLog = drawLog.slice(-MAX_STROKES)
      // the sender already drew it optimistically — echo only to everyone else
      broadcastDraw(wire({ type: 'draw-stroke', ...stroke }), socket)
      return
    }
    if (msg.type === 'draw-clear') {
      if (!drawMembers.has(socket)) return
      drawLog = []
      broadcastDraw(wire({ type: 'draw-clear' }), socket)
      return
    }
    if (msg.type === 'draw-cursor') {
      if (!drawMembers.has(socket)) return
      if (drawCursorGate.check(id, Date.now()) > 0) return // coarser than strokes
      const x = Number(msg.x)
      const y = Number(msg.y)
      if (!Number.isFinite(x) || !Number.isFinite(y) || !validPen(msg.c)) return
      const cx = x < 0 ? 0 : x > 1 ? 1 : x
      const cy = y < 0 ? 0 : y > 1 ? 1 : y
      broadcastDraw(wire({ type: 'draw-cursor', id, x: cx, y: cy, c: msg.c }), socket)
      return
    }
    // ---- pixel world protocol (server-authoritative) ----
    if (msg.type === 'world-join') {
      worldMembers.add(socket)
      socket.send(wire({
        type: 'world-state',
        size: WORLD_SIZE,
        cooldownMs: COOLDOWN_MS,
        board: encodeBoard(board),
        history
      }))
      broadcastWorldCount()
      return
    }
    if (msg.type === 'world-leave') {
      worldMembers.delete(socket)
      broadcastWorldCount()
      return
    }
    if (msg.type === 'pixel') {
      if (!worldMembers.has(socket)) return
      if (!inWorld(msg.x, msg.y) || !validColor(msg.c)) return
      const wait = cooldowns.check(id, Date.now())
      if (wait > 0) {
        socket.send(wire({ type: 'pixel-denied', waitMs: wait }))
        return
      }
      const by = typeof msg.name === 'string'
        ? msg.name.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'visitor'
        : 'visitor'
      const at = Date.now() // server clock; client timestamps are never trusted
      board[msg.y * WORLD_SIZE + msg.x] = msg.c
      placedBy[`${msg.x},${msg.y}`] = { by, at }
      history.push({ x: msg.x, y: msg.y, c: msg.c, at })
      if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX)
      activity.push(at)
      scheduleSave()
      broadcastWorld(wire({ type: 'pixel', x: msg.x, y: msg.y, c: msg.c, by, at }))
      broadcastWorldCount()
      return
    }
    if (msg.type === 'world-who') {
      if (!inWorld(msg.x, msg.y)) return
      const info = placedBy[`${msg.x},${msg.y}`]
      socket.send(wire({ type: 'pixel-info', x: msg.x, y: msg.y, by: info?.by ?? null, at: info?.at ?? null }))
      return
    }
    // world cursors: board-coordinate positions relayed to other members
    if (msg.type === 'world-cursor') {
      // Number.isFinite rejects NaN/Infinity (typeof-number passes them, and
      // JSON.parse('1e400') === Infinity), matching the draw-cursor guard above
      if (!worldMembers.has(socket) || !Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return
      if (moveGate.check(id, Date.now()) > 0) return // throttle the fan-out
      const payload = wire({ type: 'world-cursor', id, hue, x: msg.x, y: msg.y })
      for (const member of worldMembers) {
        if (member !== socket && member.readyState === 1) member.send(payload)
      }
      return
    }

    // Number.isFinite rejects NaN/Infinity — Math.max(0, Infinity) is Infinity,
    // so an unguarded coord would propagate unclamped into the relayed move frame
    if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y) || typeof msg.page !== 'string') return
    if (moveGate.check(id, Date.now()) > 0) return // throttle the cursor fan-out
    // relay the visitor's chosen display name (sanitized, length-capped)
    const name = typeof msg.name === 'string'
      ? msg.name.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'visitor'
      : 'visitor'
    // UTC offset in minutes, for the visitor globe (clamped to the real range)
    const tz = typeof msg.tz === 'number' && Number.isFinite(msg.tz)
      ? Math.max(-840, Math.min(840, Math.round(msg.tz)))
      : 0
    const payload = wire({
      type: 'move',
      id,
      hue,
      name,
      x: Math.min(1, Math.max(0, msg.x)),
      y: Math.min(1, Math.max(0, msg.y)),
      page: String(msg.page).slice(0, 100),
      tz
    })
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === 1) client.send(payload)
    }
  })

  socket.on('close', () => {
    pong.drop(socket) // mid-match disconnects forfeit to the opponent
    chess.drop(socket)
    race.drop(socket)
    if (chatMembers.delete(socket)) broadcastChatCount()
    if (drawMembers.delete(socket)) {
      broadcastDrawCount()
      broadcastDraw(wire({ type: 'draw-cursor-gone', id }), socket)
    }
    if (worldMembers.delete(socket)) broadcastWorldCount()
    // drop this connection's cooldown state from every registered gate, or the
    // maps grow for the relay's whole uptime (one entry per id that ever
    // placed/moved/chatted/drew) — the registry means no gate can be forgotten
    forgetConnection(id)
    const payload = wire({ type: 'leave', id })
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  })
})

console.log(`cursors relay listening on ws://localhost:${PORT}`)
