import {
  WORLD_SIZE, WORLD_COOLDOWN_MS, WORLD_PALETTE,
  inWorld, validColor, plotAt, CooldownGate, createSeedBoard, encodeBoard, decodeBoard
} from '../../realtime/world-core.mjs'
import { storageGet, storageSet, storageGetJson } from '~/utils/safeStorage'
import { createRelayConnection, type RelayConnection } from '~/utils/relaySocket'
import type { ServerMessage, WorldJoinIn, WorldLeaveIn, PixelIn, WorldWhoIn, WorldCursorIn } from '../../realtime/protocol'

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

let conn: RelayConnection | null = null
let releaseLease: (() => void) | null = null
let offlineGate: CooldownGate | null = null
let offlineMeta: Record<string, { by: string, at: number }> = {}
// the last optimistic placement, so a server denial can roll it back
let pendingPlace: { x: number, y: number, prev: number } | null = null

// provenance is keyed "x,y" → {by, at}; anything else in storage is discarded
const isPixelMeta = (value: unknown): value is Record<string, { by: string, at: number }> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.values(value).every((entry) =>
    !!entry && typeof entry === 'object'
    && typeof (entry as { by: unknown }).by === 'string'
    && typeof (entry as { at: unknown }).at === 'number')

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
    offlineMeta = storageGetJson(OFFLINE_META_KEY, isPixelMeta) ?? {}
    offlineGate ??= new CooldownGate(cooldownMs.value)
    version.value++
  }

  // one shared connection via the relay-socket core: capped-backoff reconnect
  // while entered, so a mid-session relay drop can't strand the shared world
  const connect = () => {
    conn ??= createRelayConnection(wsUrl, {
      onOpen: () => conn?.send({ type: 'world-join' } satisfies WorldJoinIn),
      onFail: () => {
        if (!board.value) enterOffline()
      },
      onDrop: () => (connected.value = false),
      onFrame: (raw) => {
        // the relay broadcasts other subsystems' frames (hello, page cursors,
        // score boards) on the same socket — type the full union and let
        // anything we don't handle fall through
        const msg = raw as ServerMessage
        if (msg.type === 'world-state') {
          board.value = decodeBoard(msg.board)
          cooldownMs.value = msg.cooldownMs || WORLD_COOLDOWN_MS
          history.value = msg.history
          connected.value = true
          version.value++
        } else if (msg.type === 'pixel') {
          applyPixel(msg.x, msg.y, msg.c)
          pushHistory(msg.x, msg.y, msg.c)
          // our optimistic pixel came back confirmed — nothing to revert
          if (pendingPlace && pendingPlace.x === msg.x && pendingPlace.y === msg.y) pendingPlace = null
        } else if (msg.type === 'world-count') {
          online.value = msg.online
          recent.value = msg.recent
        } else if (msg.type === 'pixel-denied') {
          nextPlaceAt.value = Date.now() + msg.waitMs
          // the server refused our optimistic pixel — roll it back to its old colour
          if (pendingPlace) {
            applyPixel(pendingPlace.x, pendingPlace.y, pendingPlace.prev)
            pendingPlace = null
          }
        } else if (msg.type === 'pixel-info') {
          lastInfo.value = { x: msg.x, y: msg.y, by: msg.by, at: msg.at }
        } else if (msg.type === 'world-cursor') {
          const { id, hue, x, y } = msg
          const next = cursors.value.filter((cursor) => cursor.id !== id)
          next.push({ id, hue, x, y, seen: Date.now() })
          cursors.value = next.filter((cursor) => Date.now() - cursor.seen < 15_000)
        } else if (msg.type === 'leave') {
          const gone = msg.id
          cursors.value = cursors.value.filter((cursor) => cursor.id !== gone)
        }
      }
    }, { reconnect: true })
  }

  const enter = () => {
    if (releaseLease) return
    if (!wsUrl) {
      enterOffline()
      return
    }
    connect()
    releaseLease = conn?.acquire() ?? null
  }

  const leave = () => {
    // a goodbye for the world, then hand the lease back (the core closes last)
    conn?.send({ type: 'world-leave' } satisfies WorldLeaveIn)
    releaseLease?.()
    releaseLease = null
    connected.value = false
  }

  /** Place a pixel; optimistic locally, authoritative on the server. Returns
   * remaining cooldown ms (0 = placed). */
  const place = (x: number, y: number, c: number): number => {
    if (!board.value || !inWorld(x, y) || !validColor(c)) return -1
    if (connected.value && conn?.isOpen()) {
      const wait = nextPlaceAt.value - Date.now()
      if (wait > 0) return Math.ceil(wait)
      // optimistic paint, remembering the prior colour so a denial can revert
      pendingPlace = { x, y, prev: board.value[y * WORLD_SIZE + x] ?? 0 }
      conn.send({ type: 'pixel', x, y, c, name: name.value } satisfies PixelIn)
      applyPixel(x, y, c)
      nextPlaceAt.value = Date.now() + cooldownMs.value
      return 0
    }
    // offline world: same rules. Only a truly solo world (no relay configured)
    // persists locally. A configured relay that has merely dropped must NOT
    // write the server board into the offline cache — it would resurrect later
    // as a stale online/offline hybrid — so it paints optimistically and lets
    // the reconnect's world-state reconcile the board.
    offlineGate ??= new CooldownGate(cooldownMs.value)
    const wait = offlineGate.check('me', Date.now())
    if (wait > 0) return wait
    applyPixel(x, y, c)
    if (!wsUrl) {
      pushHistory(x, y, c)
      offlineMeta[`${x},${y}`] = { by: name.value, at: Date.now() }
      storageSet(OFFLINE_KEY, encodeBoard(board.value))
      storageSet(OFFLINE_META_KEY, JSON.stringify(offlineMeta))
    }
    nextPlaceAt.value = Date.now() + cooldownMs.value
    return 0
  }

  /** Ask who placed a pixel (answer lands in lastInfo). */
  const who = (x: number, y: number) => {
    if (!inWorld(x, y)) return
    if (connected.value && conn?.isOpen()) {
      conn.send({ type: 'world-who', x, y } satisfies WorldWhoIn)
      return
    }
    const info = offlineMeta[`${x},${y}`]
    lastInfo.value = { x, y, by: info?.by ?? null, at: info?.at ?? null }
  }

  const sendCursor = (x: number, y: number) => {
    if (connected.value && conn?.isOpen()) {
      conn.send({ type: 'world-cursor', x, y } satisfies WorldCursorIn)
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
