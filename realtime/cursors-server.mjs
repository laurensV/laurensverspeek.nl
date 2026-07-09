// Tiny websocket relay for live visitor cursors.
//
// Run locally:   node realtime/cursors-server.mjs        (ws://localhost:8787)
// Deploy:        any Node host (Fly.io, Railway, a VPS...) — no state, no storage.
// Then set NUXT_PUBLIC_CURSORS_WS=wss://your-host on the site build.
//
// Privacy: only anonymous cursor positions (fractions of the viewport) and the
// current page path are relayed. No IPs, IDs or fingerprints are stored.

import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8787
const MAX_CLIENTS = 64

const wss = new WebSocketServer({ port: PORT })
let nextId = 1

wss.on('connection', (socket) => {
  if (wss.clients.size > MAX_CLIENTS) {
    socket.close()
    return
  }
  const id = nextId++
  const hue = (id * 47) % 360
  socket.send(JSON.stringify({ type: 'hello', id, hue }))

  socket.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    // chat: a short message shown as a speech bubble over the sender's cursor
    if (msg.type === 'say' && typeof msg.text === 'string') {
      const text = msg.text.slice(0, 80)
      if (!text.trim()) return
      const payload = JSON.stringify({ type: 'say', id, text })
      for (const client of wss.clients) {
        if (client !== socket && client.readyState === 1) client.send(payload)
      }
      return
    }
    if (typeof msg.x !== 'number' || typeof msg.y !== 'number' || typeof msg.page !== 'string') return
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
    const payload = JSON.stringify({ type: 'leave', id })
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  })
})

console.log(`cursors relay listening on ws://localhost:${PORT}`)
