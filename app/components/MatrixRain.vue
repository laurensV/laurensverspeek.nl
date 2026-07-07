<template>
  <Teleport to="body">
    <div v-if="matrixActive" class="matrix-overlay" role="presentation" @click="stop">
      <canvas ref="canvasRef" />
      <p class="matrix-hint is-family-code">click or press any key to wake up</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener, useWindowSize } from '@vueuse/core'

// The classic: falling glyph rain. Started via the `matrix` terminal command.

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXYZ$+-*/=<>'

const { matrixActive } = useSiteEffects()
const canvasRef = ref<HTMLCanvasElement>()
const { width, height } = useWindowSize()

let rafId = 0
let lastFrame = 0
let drops: number[] = []

const stop = () => {
  matrixActive.value = false
}

const draw = (time: number) => {
  rafId = requestAnimationFrame(draw)
  if (time - lastFrame < 50) return
  lastFrame = time

  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const style = getComputedStyle(document.documentElement)
  const glyphColor = style.getPropertyValue('--bulma-success').trim() || 'hsl(153, 53%, 53%)'

  ctx.fillStyle = 'hsla(0, 0%, 0%, 0.08)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = glyphColor
  ctx.font = '15px monospace'

  drops.forEach((y, i) => {
    const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!
    ctx.fillText(glyph, i * 16, y * 16)
    drops[i] = y * 16 > canvas.height && Math.random() > 0.975 ? 0 : y + 1
  })
}

const setup = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  canvas.width = width.value
  canvas.height = height.value
  ctx.fillStyle = 'hsl(0, 0%, 0%)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drops = Array.from({ length: Math.ceil(width.value / 16) }, () => Math.floor(Math.random() * 40))
}

watch(matrixActive, async (active) => {
  cancelAnimationFrame(rafId)
  if (active) {
    await nextTick()
    setup()
    rafId = requestAnimationFrame(draw)
  }
})

watch([width, height], () => {
  if (matrixActive.value) setup()
})

useEventListener('keydown', (event) => {
  if (matrixActive.value) {
    event.preventDefault()
    stop()
  }
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<style scoped lang="scss">
.matrix-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  cursor: pointer;
  background-color: hsl(0, 0%, 0%);

  canvas {
    display: block;
  }

  .matrix-hint {
    position: absolute;
    bottom: 1rem;
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    color: var(--bulma-success);
    opacity: 0.6;
  }
}
</style>
