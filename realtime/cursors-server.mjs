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

const PORT = Number(process.env.PORT) || 8787
const MAX_CLIENTS = 64

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

const cooldowns = new CooldownGate(COOLDOWN_MS)
// broadcasts (chat + cursor moves) are throttled per connection too, so a
// scripted client can't flood the fan-out. Moves are lenient (the client
// already throttles to ~90ms); chat is slower.
const moveGate = new CooldownGate(45)
const chatGate = new CooldownGate(400)
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
  broadcastWorld(JSON.stringify({ type: 'world-count', online: worldMembers.size, recent: recentActivity() }))
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
  socket.send(JSON.stringify({ type: 'hello', id, hue }))

  socket.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    // chat: a short message shown as a speech bubble over the sender's cursor
    if (msg.type === 'say' && typeof msg.text === 'string') {
      const text = msg.text.slice(0, 80)
      if (!text.trim()) return
      if (chatGate.check(id, Date.now()) > 0) return // drop flooded chat
      const payload = JSON.stringify({ type: 'say', id, text })
      for (const client of wss.clients) {
        if (client !== socket && client.readyState === 1) client.send(payload)
      }
      return
    }
    // ---- pixel world protocol (server-authoritative) ----
    if (msg.type === 'world-join') {
      worldMembers.add(socket)
      socket.send(JSON.stringify({
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
        socket.send(JSON.stringify({ type: 'pixel-denied', waitMs: wait }))
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
      broadcastWorld(JSON.stringify({ type: 'pixel', x: msg.x, y: msg.y, c: msg.c, by, at }))
      broadcastWorldCount()
      return
    }
    if (msg.type === 'world-who') {
      if (!inWorld(msg.x, msg.y)) return
      const info = placedBy[`${msg.x},${msg.y}`]
      socket.send(JSON.stringify({ type: 'pixel-info', x: msg.x, y: msg.y, by: info?.by ?? null, at: info?.at ?? null }))
      return
    }
    // world cursors: board-coordinate positions relayed to other members
    if (msg.type === 'world-cursor') {
      if (!worldMembers.has(socket) || typeof msg.x !== 'number' || typeof msg.y !== 'number') return
      if (moveGate.check(id, Date.now()) > 0) return // throttle the fan-out
      const payload = JSON.stringify({ type: 'world-cursor', id, hue, x: msg.x, y: msg.y })
      for (const member of worldMembers) {
        if (member !== socket && member.readyState === 1) member.send(payload)
      }
      return
    }

    if (typeof msg.x !== 'number' || typeof msg.y !== 'number' || typeof msg.page !== 'string') return
    if (moveGate.check(id, Date.now()) > 0) return // throttle the cursor fan-out
    // relay the visitor's chosen display name (sanitized, length-capped)
    const name = typeof msg.name === 'string'
      ? msg.name.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'visitor'
      : 'visitor'
    const payload = JSON.stringify({
      type: 'move',
      id,
      hue,
      name,
      x: Math.min(1, Math.max(0, msg.x)),
      y: Math.min(1, Math.max(0, msg.y)),
      page: String(msg.page).slice(0, 100)
    })
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === 1) client.send(payload)
    }
  })

  socket.on('close', () => {
    if (worldMembers.delete(socket)) broadcastWorldCount()
    // drop this connection's cooldown state, or the maps grow for the relay's
    // whole uptime (one entry per id that ever placed/moved/chatted)
    cooldowns.last.delete(id)
    moveGate.last.delete(id)
    chatGate.last.delete(id)
    const payload = JSON.stringify({ type: 'leave', id })
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  })
})

console.log(`cursors relay listening on ws://localhost:${PORT}`)
