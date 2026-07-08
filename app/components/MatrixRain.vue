<template>
  <Teleport to="body">
    <div ref="overlayRef" class="matrix-overlay" role="presentation" @click="stop">
      <canvas ref="canvasRef" aria-hidden="true" />
      <p class="matrix-hint is-family-code">click or press any key to wake up</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// The classic: falling glyph rain. Started via the `matrix` terminal command,
// which flips matrixActive — the layout only mounts this component while that's
// true, so useCanvasScene runs from mount to dismiss. This component supplies
// the setup + per-tick draw and the dismiss behaviour.

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXYZ$+-*/=<>'

const { matrixActive } = useSiteEffects()
const overlayRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

let drops: number[] = []
let vw = 0
let vh = 0
let acc = 0

const stop = () => {
  matrixActive.value = false
}

// alwaysAnimate: this is a deliberately-triggered effect, so it runs even under
// reduced motion. The default autoStart is fine — we only mount while active.
useCanvasScene(canvasRef, overlayRef, {
  onResize: (ctx, w, h) => {
    vw = w
    vh = h
    ctx.fillStyle = 'hsl(0, 0%, 0%)'
    ctx.fillRect(0, 0, w, h)
    drops = Array.from({ length: Math.ceil(w / 16) }, () => Math.floor(Math.random() * 40))
  },
  onFrame: (ctx, dt) => {
    acc += dt
    if (acc < 50) return // ~20fps, the classic cadence
    acc = 0
    const glyphColor = getComputedStyle(document.documentElement).getPropertyValue('--bulma-success').trim() || 'hsl(153, 53%, 53%)'
    ctx.fillStyle = 'hsla(0, 0%, 0%, 0.08)'
    ctx.fillRect(0, 0, vw, vh)
    ctx.fillStyle = glyphColor
    ctx.font = '15px monospace'
    drops.forEach((y, i) => {
      ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!, i * 16, y * 16)
      drops[i] = y * 16 > vh && Math.random() > 0.975 ? 0 : y + 1
    })
  }
}, { alwaysAnimate: true })

useEventListener('keydown', (event) => {
  event.preventDefault()
  stop()
})
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
