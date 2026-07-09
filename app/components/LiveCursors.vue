<template>
  <div v-if="enabled" class="live-cursors" aria-hidden="true">
    <div
      v-for="cursor in visibleCursors"
      :key="cursor.id"
      class="live-cursor"
      :style="{
        left: `${cursor.x * 100}%`,
        top: `${cursor.y * 100}%`,
        color: `hsl(${cursor.hue}, 70%, 55%)`
      }"
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor">
        <path d="M0 0 L14 10 L7 11 L4 18 Z" />
      </svg>
      <span class="live-cursor-label is-family-code">{{ cursor.name || 'visitor' }}</span>
      <span v-if="cursor.say" class="live-cursor-bubble is-family-code">{{ cursor.say }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener, useThrottleFn } from '@vueuse/core'

// Anonymous live cursors of other visitors, relayed through a tiny websocket
// server (see realtime/cursors-server.mjs). Renders nothing unless
// NUXT_PUBLIC_CURSORS_WS is configured.

interface RemoteCursor {
  id: number
  hue: number
  name?: string
  x: number
  y: number
  page: string
  seen: number
  say?: string
  sayUntil?: number
}

const { cursorsWs } = useRuntimeConfig().public
const route = useRoute()
const { name } = useIdentity()
const { count, showCursors, enabled, outbox } = useLiveVisitors()

const cursors = ref(new Map<number, RemoteCursor>())
const tick = ref(0)

let socket: WebSocket | undefined
let retries = 0
const connected = ref(false)

const visibleCursors = computed(() => {
  void tick.value
  if (!showCursors.value) return []
  const now = Date.now()
  return [...cursors.value.values()]
    .map((c) => (c.sayUntil && now > c.sayUntil ? { ...c, say: undefined } : c))
    .filter((c) => c.page === route.path && now - c.seen < 6000)
})

// the status bar badge: everyone active anywhere on the site, plus you
watchEffect(() => {
  void tick.value
  const now = Date.now()
  const others = [...cursors.value.values()].filter((c) => now - c.seen < 15000).length
  count.value = connected.value ? others + 1 : 0
})

const connect = () => {
  if (!cursorsWs) return
  socket = new WebSocket(cursorsWs as string)
  socket.onopen = () => (connected.value = true)

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'move') {
      // keep any active speech bubble alive across position updates
      const prev = cursors.value.get(msg.id)
      cursors.value.set(msg.id, { ...msg, seen: Date.now(), say: prev?.say, sayUntil: prev?.sayUntil })
      cursors.value = new Map(cursors.value)
    } else if (msg.type === 'leave') {
      cursors.value.delete(msg.id)
      cursors.value = new Map(cursors.value)
    } else if (msg.type === 'say') {
      const existing = cursors.value.get(msg.id)
      if (existing) {
        existing.say = String(msg.text).slice(0, 80)
        existing.sayUntil = Date.now() + 5000
        cursors.value = new Map(cursors.value)
      }
    }
  }

  socket.onclose = () => {
    connected.value = false
    if (retries++ < 3) setTimeout(connect, 4000 * retries)
  }
}

const send = useThrottleFn((event: PointerEvent) => {
  if (socket?.readyState !== WebSocket.OPEN) return
  socket.send(
    JSON.stringify({
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
      page: route.path,
      name: name.value
    })
  )
}, 90)

onMounted(() => {
  if (!enabled.value) return
  connect()
  // prune stale cursors so they fade even without traffic
  const pruneTimer = setInterval(() => tick.value++, 2000)
  onBeforeUnmount(() => {
    clearInterval(pruneTimer)
    socket?.close()
  })
})

useEventListener('pointermove', send, { passive: true })

// the terminal `say` command writes here; forward it to the relay
watch(outbox, (msg) => {
  if (msg && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'say', text: msg.text }))
  }
})
</script>

<style scoped lang="scss">
.live-cursors {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
}

.live-cursor {
  position: absolute;
  transition: left 0.09s linear, top 0.09s linear;

  .live-cursor-label {
    display: block;
    margin-left: 0.9rem;
    font-size: 0.6rem;
    opacity: 0.8;
  }

  .live-cursor-bubble {
    position: absolute;
    left: 0.9rem;
    bottom: 1.2rem;
    max-width: 12rem;
    padding: 0.2rem 0.55rem;
    border-radius: 0.7rem;
    // readable on any cursor hue: light fill, dark text, hue only on the border
    border: 1.5px solid currentColor;
    background-color: #fbfbfd;
    color: #101014;
    font-size: 0.65rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
