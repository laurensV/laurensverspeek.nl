import {
  WORLD_SIZE, WORLD_COOLDOWN_MS, WORLD_PALETTE,
  inWorld, validColor, plotAt, CooldownGate, createSeedBoard, encodeBoard, decodeBoard
} from '../../realtime/world-core.mjs'
import { storageGet, storageSet } from '~/utils/safeStorage'

// The Pixel World's client brain: one websocket to the cursors relay when the
// site is built with NUXT_PUBLIC_CURSORS_WS, or a solo local world when not —
// same board, same cooldown rules, pixels just stay in this browser.

export interface PixelInfo {
  by: string | null
  at: number | null
}

export interface WorldCursor {
  id: number
  hue: number
  x: number
  y: number
  seen: number
}

const OFFLINE_KEY = 'lv-world-board'
const OFFLINE_META_KEY = 'lv-world-placed'

let wired = false
let socket: WebSocket | null = null
let offlineGate: CooldownGate | null = null
let offlineMeta: Record<string, { by: string, at: number }> = {}

export function useWorld() {
  const board = useState<Uint8Array | null>('world-board', () => null)
  // bump to trigger canvas redraws (Uint8Array contents aren't deep-reactive)
  const version = useState('world-version', () => 0)
  const online = useState('world-online', () => 0)
  const recent = useState('world-recent', () => 0)
  const connected = useState('world-connected', () => false)
  const cooldownMs = useState('world-cooldown', () => WORLD_COOLDOWN_MS)
  const nextPlaceAt = useState('world-next-place', () => 0)
  const cursors = useState<WorldCursor[]>('world-cursors', () => [])
  // camera target, settable from the terminal's `world goto`
  const gotoTarget = useState<{ x: number, y: number } | null>('world-goto', () => null)
  const lastInfo = useState<(PixelInfo & { x: number, y: number }) | null>('world-pixel-info', () => null)
  // recent placements, for the time-lapse scrubber (oldest → newest)
  const history = useState<{ x: number, y: number, c: number, at: number }[]>('world-history', () => [])

  const { name } = useIdentity()
  const wsUrl = useRuntimeConfig().public.cursorsWs

  const applyPixel = (x: number, y: number, c: number) => {
    if (!board.value) return
    board.value[y * WORLD_SIZE + x] = c
    version.value++
  }

  const pushHistory = (x: number, y: number, c: number) => {
    history.value = [...history.value, { x, y, c, at: Date.now() }].slice(-200)
  }

  const enterOffline = () => {
    connected.value = false
    const saved = storageGet(OFFLINE_KEY)
    board.value = saved ? decodeBoard(saved) : createSeedBoard()
    if (board.value.length !== WORLD_SIZE * WORLD_SIZE) board.value = createSeedBoard()
    try {
      offlineMeta = JSON.parse(storageGet(OFFLINE_META_KEY) ?? '{}') as typeof offlineMeta
    } catch { offlineMeta = {} }
    offlineGate ??= new CooldownGate(cooldownMs.value)
    version.value++
  }

  const enter = () => {
    if (wired) return
    wired = true
    if (!wsUrl) {
      enterOffline()
      return
    }
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      enterOffline()
      return
    }
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ type: 'world-join' }))
    })
    socket.addEventListener('error', () => {
      if (!board.value) enterOffline()
    })
    socket.addEventListener('close', () => {
      connected.value = false
    })
    socket.addEventListener('message', (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(event.data)) as Record<string, unknown>
      } catch { return }
      if (msg.type === 'world-state') {
        board.value = decodeBoard(String(msg.board))
        cooldownMs.value = Number(msg.cooldownMs) || WORLD_COOLDOWN_MS
        if (Array.isArray(msg.history)) history.value = msg.history as typeof history.value
        connected.value = true
        version.value++
      } else if (msg.type === 'pixel') {
        applyPixel(Number(msg.x), Number(msg.y), Number(msg.c))
        pushHistory(Number(msg.x), Number(msg.y), Number(msg.c))
      } else if (msg.type === 'world-count') {
        online.value = Number(msg.online) || 0
        recent.value = Number(msg.recent) || 0
      } else if (msg.type === 'pixel-denied') {
        nextPlaceAt.value = Date.now() + (Number(msg.waitMs) || 0)
      } else if (msg.type === 'pixel-info') {
        lastInfo.value = {
          x: Number(msg.x),
          y: Number(msg.y),
          by: (msg.by as string | null),
          at: (msg.at as number | null)
        }
      } else if (msg.type === 'world-cursor') {
        const id = Number(msg.id)
        const next = cursors.value.filter((cursor) => cursor.id !== id)
        next.push({ id, hue: Number(msg.hue), x: Number(msg.x), y: Number(msg.y), seen: Date.now() })
        cursors.value = next.filter((cursor) => Date.now() - cursor.seen < 15_000)
      } else if (msg.type === 'leave') {
        cursors.value = cursors.value.filter((cursor) => cursor.id !== Number(msg.id))
      }
    })
  }

  const leave = () => {
    socket?.send(JSON.stringify({ type: 'world-leave' }))
    socket?.close()
    socket = null
    wired = false
  }

  /** Place a pixel; optimistic locally, authoritative on the server. Returns
   * remaining cooldown ms (0 = placed). */
  const place = (x: number, y: number, c: number): number => {
    if (!board.value || !inWorld(x, y) || !validColor(c)) return -1
    if (connected.value && socket?.readyState === 1) {
      const wait = nextPlaceAt.value - Date.now()
      if (wait > 0) return Math.ceil(wait)
      socket.send(JSON.stringify({ type: 'pixel', x, y, c, name: name.value }))
      applyPixel(x, y, c) // optimistic; a denial only delays the next one
      nextPlaceAt.value = Date.now() + cooldownMs.value
      return 0
    }
    // offline world: same rules, local persistence
    offlineGate ??= new CooldownGate(cooldownMs.value)
    const wait = offlineGate.check('me', Date.now())
    if (wait > 0) return wait
    applyPixel(x, y, c)
    pushHistory(x, y, c)
    offlineMeta[`${x},${y}`] = { by: name.value, at: Date.now() }
    storageSet(OFFLINE_KEY, encodeBoard(board.value))
    storageSet(OFFLINE_META_KEY, JSON.stringify(offlineMeta))
    nextPlaceAt.value = Date.now() + cooldownMs.value
    return 0
  }

  /** Ask who placed a pixel (answer lands in lastInfo). */
  const who = (x: number, y: number) => {
    if (!inWorld(x, y)) return
    if (connected.value && socket?.readyState === 1) {
      socket.send(JSON.stringify({ type: 'world-who', x, y }))
      return
    }
    const info = offlineMeta[`${x},${y}`]
    lastInfo.value = { x, y, by: info?.by ?? null, at: info?.at ?? null }
  }

  const sendCursor = (x: number, y: number) => {
    if (connected.value && socket?.readyState === 1) {
      socket.send(JSON.stringify({ type: 'world-cursor', x, y }))
    }
  }

  return {
    SIZE: WORLD_SIZE,
    PALETTE: WORLD_PALETTE,
    board,
    version,
    online,
    recent,
    connected,
    cooldownMs,
    nextPlaceAt,
    cursors,
    gotoTarget,
    lastInfo,
    history,
    plotAt: (x: number, y: number): string | null => plotAt(x, y),
    enter,
    leave,
    place,
    who,
    sendCursor
  }
}
