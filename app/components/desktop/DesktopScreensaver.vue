<template>
  <div
    class="saver"
    role="presentation"
    tabindex="0"
    @pointerdown="$emit('wake')"
    @pointermove="$emit('wake')"
    @keydown="$emit('wake')"
  >
    <canvas ref="canvasRef" class="saver-stars" aria-hidden="true" />
    <div class="saver-logo" :style="{ transform: `translate(${logo.x}px, ${logo.y}px)` }">
      <span class="saver-logo-text">lvOS</span>
      <span class="saver-logo-time is-family-code">{{ clock }}</span>
    </div>
    <p class="saver-hint is-family-code">move the mouse or press a key to wake</p>
  </div>
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'

// Screensaver: a warp-speed starfield with a DVD-logo-style bouncing clock.
// Emits `wake` on any interaction so the desktop can dismiss it.
defineEmits<{ wake: [] }>()

const now = useNow({ interval: 1000 })
const clock = computed(() => now.value.toLocaleTimeString('en-GB'))

const canvasRef = ref<HTMLCanvasElement>()
const logo = reactive({ x: 80, y: 80 })
let raf = 0

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()

  const primary = getComputedStyle(document.documentElement).getPropertyValue('--bulma-primary').trim() || '#ffba00'

  // starfield: points streaking outward from center
  const stars = Array.from({ length: 220 }, () => ({
    x: (Math.random() - 0.5) * canvas.width,
    y: (Math.random() - 0.5) * canvas.height,
    z: Math.random() * canvas.width
  }))

  // bouncing logo velocity
  let vx = 1.6
  let vy = 1.3
  const logoW = 180
  const logoH = 90

  const draw = () => {
    raf = requestAnimationFrame(draw)
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    ctx.fillStyle = 'rgba(6,6,8,0.35)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = primary
    for (const s of stars) {
      s.z -= 6
      if (s.z <= 1) {
        s.x = (Math.random() - 0.5) * canvas.width
        s.y = (Math.random() - 0.5) * canvas.height
        s.z = canvas.width
      }
      const k = 128 / s.z
      const px = cx + s.x * k
      const py = cy + s.y * k
      const size = (1 - s.z / canvas.width) * 2.4
      ctx.globalAlpha = Math.min(1, (1 - s.z / canvas.width) * 1.5)
      ctx.fillRect(px, py, size, size)
    }
    ctx.globalAlpha = 1

    // bounce the logo
    logo.x += vx
    logo.y += vy
    if (logo.x <= 0 || logo.x >= canvas.width - logoW) vx = -vx
    if (logo.y <= 0 || logo.y >= canvas.height - logoH) vy = -vy
  }
  draw()

  useEventListener(window, 'resize', resize)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped lang="scss">
.saver {
  position: fixed;
  inset: 0;
  z-index: 10040; // above the taskbar (10000) and toasts (10002); below the night-light wash
  background-color: hsl(var(--lv-scheme-hs), 3%);
  cursor: none;
  outline: none;
}

.saver-stars {
  position: absolute;
  inset: 0;
}

.saver-logo {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  will-change: transform;

  .saver-logo-text {
    font-size: 2.6rem;
    font-weight: 800;
    color: var(--bulma-primary);
    letter-spacing: -0.02em;
    text-shadow: 0 0 24px hsla(var(--lv-primary-hsl), 0.6);
  }

  .saver-logo-time {
    font-size: 1rem;
    color: hsl(var(--lv-scheme-hs), 70%);
  }
}

.saver-hint {
  position: absolute;
  bottom: 2rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.75rem;
  color: hsl(var(--lv-scheme-hs), 40%);
}
</style>
