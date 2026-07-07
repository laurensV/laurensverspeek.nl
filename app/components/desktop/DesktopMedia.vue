<template>
  <div class="media is-family-code">
    <p class="media-track">♪ {{ track }}</p>
    <canvas ref="canvasRef" width="320" height="70" class="media-viz" />
    <div class="media-controls">
      <button @click="toggle">{{ playing ? '⏸ pause' : '▶ play' }}</button>
      <span class="media-note">{{ playing ? 'now playing: pure 8-bit vibes' : 'ready (volume warning: nostalgic)' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Compact player over the shared chiptune engine (see useChiptune) — a small
// bar analyser. The full visualizer app renders the same audio differently.

const { playing, track, toggle, getAnalyser } = useChiptune()

const canvasRef = ref<HTMLCanvasElement>()
let rafId = 0

const draw = () => {
  rafId = requestAnimationFrame(draw)
  const canvas = canvasRef.value
  const c2d = canvas?.getContext('2d')
  const analyser = getAnalyser()
  if (!canvas || !c2d) return
  c2d.clearRect(0, 0, canvas.width, canvas.height)
  if (!analyser) return
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  const style = getComputedStyle(document.documentElement)
  c2d.fillStyle = style.getPropertyValue('--bulma-primary').trim() || '#ffba00'
  const bars = 24
  const bw = canvas.width / bars
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor((i / bars) * data.length * 0.5)]! / 255
    const h = Math.max(2, v * canvas.height)
    c2d.fillRect(i * bw + 1, canvas.height - h, bw - 2, h)
  }
}

onMounted(() => draw())
onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<style scoped lang="scss">
.media {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.media-track {
  font-size: 0.8rem;
  color: var(--bulma-primary);
}

.media-viz {
  width: 100%;
  height: 70px;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
}

.media-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  button {
    padding: 0.25rem 0.8rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .media-note {
    font-size: 0.65rem;
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}
</style>
