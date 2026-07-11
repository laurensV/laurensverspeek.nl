<template>
  <div class="media is-family-code">
    <div class="media-bar">
      <button class="media-play" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle">{{ playing ? '⏸' : '▶' }}</button>
      <span class="media-track">♪ {{ track }}</span>
      <span class="media-modes">
        <button
          v-for="m in MODES"
          :key="m"
          :class="{ 'is-active': mode === m }"
          @click="mode = m"
        >{{ m }}</button>
      </span>
    </div>
    <canvas ref="canvasRef" width="520" height="200" class="media-canvas" />
    <p class="media-note">
      {{ playing ? `now playing in ${mode} mode — pure 8-bit vibes` : 'press ▶ to start the audio engine (volume warning: nostalgic)' }}
    </p>
  </div>
</template>

<script setup lang="ts">
// The media player and the visualizer, unified: one window over the shared
// chiptune engine with three render modes off the same AnalyserNode. Closing
// (or killing) this window stops the music — no ghost concerts.

const { playing, track, toggle, stop, getAnalyser } = useChiptune()

const MODES = ['bars', 'wave', 'radial'] as const
type Mode = (typeof MODES)[number]
const mode = ref<Mode>('bars')

const canvasRef = ref<HTMLCanvasElement>()
let rafId = 0

const primary = () => {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bulma-primary').trim()
  return value || '#ffba00'
}

const drawBars = (c2d: CanvasRenderingContext2D, w: number, h: number, freq: Uint8Array) => {
  const bars = 48
  const bw = w / bars
  for (let i = 0; i < bars; i++) {
    const v = freq[Math.floor((i / bars) * freq.length * 0.7)]! / 255
    const bh = Math.max(2, v * h)
    c2d.fillRect(i * bw + 1, h - bh, bw - 2, bh)
  }
}

const drawWave = (c2d: CanvasRenderingContext2D, w: number, h: number, wave: Uint8Array) => {
  c2d.lineWidth = 2
  c2d.strokeStyle = primary()
  c2d.beginPath()
  for (let i = 0; i < wave.length; i++) {
    const x = (i / (wave.length - 1)) * w
    const y = (wave[i]! / 255) * h
    if (i === 0) c2d.moveTo(x, y)
    else c2d.lineTo(x, y)
  }
  c2d.stroke()
}

const drawRadial = (c2d: CanvasRenderingContext2D, w: number, h: number, freq: Uint8Array) => {
  const cx = w / 2
  const cy = h / 2
  const base = Math.min(w, h) * 0.18
  const spokes = 64
  c2d.lineWidth = 2
  c2d.strokeStyle = primary()
  for (let i = 0; i < spokes; i++) {
    const v = freq[Math.floor((i / spokes) * freq.length * 0.6)]! / 255
    const angle = (i / spokes) * Math.PI * 2
    const len = base + v * base * 2.2
    c2d.beginPath()
    c2d.moveTo(cx + Math.cos(angle) * base, cy + Math.sin(angle) * base)
    c2d.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
    c2d.stroke()
  }
}

const draw = () => {
  rafId = requestAnimationFrame(draw)
  const canvas = canvasRef.value
  const c2d = canvas?.getContext('2d')
  const analyser = getAnalyser()
  if (!canvas || !c2d) return
  c2d.clearRect(0, 0, canvas.width, canvas.height)
  if (!analyser) return

  c2d.fillStyle = primary()
  if (mode.value === 'wave') {
    const wave = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(wave)
    drawWave(c2d, canvas.width, canvas.height, wave)
  } else {
    const freq = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(freq)
    if (mode.value === 'bars') drawBars(c2d, canvas.width, canvas.height, freq)
    else drawRadial(c2d, canvas.width, canvas.height, freq)
  }
}

// the visualizer only animates while the music plays — a paused player is a
// still canvas, not a 60fps clear-loop
watch(() => playing.value, (isPlaying) => {
  if (isPlaying) {
    if (!rafId) rafId = requestAnimationFrame(draw)
  } else {
    cancelAnimationFrame(rafId)
    rafId = 0
    const canvas = canvasRef.value
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  stop() // the window is the player: closing it ends the concert
})
</script>

<style scoped lang="scss">
.media {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.media-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.78rem;

  .media-play {
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: 2px;
    background: none;
    color: var(--bulma-primary);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .media-track {
    color: var(--bulma-primary);
  }

  .media-modes {
    display: flex;
    gap: 0.3rem;
    margin-left: auto;

    button {
      border: none;
      background: none;
      color: hsl(var(--lv-scheme-hs), 55%);
      font: inherit;
      font-size: 0.72rem;
      cursor: pointer;

      &.is-active {
        color: var(--bulma-primary);
      }
    }
  }
}

.media-canvas {
  width: 100%;
  height: 200px;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 5%);
}

.media-note {
  font-size: 0.65rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
