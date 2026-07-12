<template>
  <canvas ref="canvasRef" class="celebration" aria-hidden="true" />
</template>

<script setup lang="ts">
// A brief confetti burst when a game beats a personal best. Flipped on by the
// game-kit celebrate-sink (see plugins/celebration.client.ts); clears the flag
// itself when the animation finishes. Reduced motion gets a single still frame.
const { celebrateActive } = useSiteEffects()
const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Bit { x: number, y: number, vx: number, vy: number, size: number, color: string, spin: number, rot: number }

const COLORS = ['#ffba00', '#ff5d73', '#41d6a0', '#4aa8ff', '#c56bff', '#ffffff']

let raf = 0

const done = () => {
  cancelAnimationFrame(raf)
  celebrateActive.value = false
}

const spawn = (w: number, h: number): Bit[] =>
  // biased vary-by-index so nothing here needs Math.random-per-frame determinism
  Array.from({ length: 90 }, (_, i) => {
    const angle = (i / 90) * Math.PI * 2
    const speed = 4 + (i % 7)
    return {
      x: w / 2,
      y: h * 0.42,
      vx: Math.cos(angle) * speed * (0.5 + (i % 5) / 5),
      vy: Math.sin(angle) * speed - 4,
      size: 5 + (i % 4) * 2,
      color: COLORS[i % COLORS.length]!,
      spin: (i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.05),
      rot: i
    }
  })

const run = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return done()

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const bits = spawn(w, h)

  if (reduced) {
    // one still frame near the burst origin, then out
    for (const b of bits) {
      ctx.fillStyle = b.color
      ctx.fillRect(b.x + b.vx * 6, b.y + b.vy * 6, b.size, b.size)
    }
    setTimeout(done, 650)
    return
  }

  let frame = 0
  const tick = () => {
    ctx.clearRect(0, 0, w, h)
    frame++
    for (const b of bits) {
      b.vy += 0.22 // gravity
      b.vx *= 0.99
      b.x += b.vx
      b.y += b.vy
      b.rot += b.spin
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)
      ctx.globalAlpha = Math.max(0, 1 - frame / 80)
      ctx.fillStyle = b.color
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size)
      ctx.restore()
    }
    if (frame < 80) raf = requestAnimationFrame(tick)
    else done()
  }
  raf = requestAnimationFrame(tick)
}

watch(celebrateActive, (on) => { if (on) void nextTick(run) }, { immediate: true })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.celebration {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10070; /* above the lvOS chrome and the terminal overlay */
  pointer-events: none;
}
</style>
