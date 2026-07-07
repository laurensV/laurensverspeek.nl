<template>
  <div class="media is-family-code">
    <p class="media-track">♪ chiptune_dreams.mod</p>
    <canvas ref="canvasRef" width="320" height="70" class="media-viz" />
    <div class="media-controls">
      <button @click="toggle">{{ playing ? '⏸ pause' : '▶ play' }}</button>
      <span class="media-note">{{ playing ? 'now playing: pure 8-bit vibes' : 'ready (volume warning: nostalgic)' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// A tiny 8-bit "tracker": a square-wave arpeggio synthesized with WebAudio,
// visualized with an analyser. No audio files were harmed.

const canvasRef = ref<HTMLCanvasElement>()
const playing = ref(false)

let ctx: AudioContext | undefined
let analyser: AnalyserNode | undefined
let noteTimer: ReturnType<typeof setInterval> | undefined
let rafId = 0
let step = 0

// A minor arpeggio ladder — the chiptune classic
const MELODY = [220, 261.63, 329.63, 440, 329.63, 261.63, 246.94, 293.66, 369.99, 493.88, 369.99, 293.66]

const playNote = () => {
  if (!ctx || !analyser) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = MELODY[step % MELODY.length]!
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(analyser)
  analyser.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.2)
  step++
}

const draw = () => {
  rafId = requestAnimationFrame(draw)
  const canvas = canvasRef.value
  const c2d = canvas?.getContext('2d')
  if (!canvas || !c2d || !analyser) return
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  c2d.clearRect(0, 0, canvas.width, canvas.height)
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

const toggle = async () => {
  if (playing.value) {
    stop()
    return
  }
  ctx = new AudioContext()
  analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  playing.value = true
  playNote()
  noteTimer = setInterval(playNote, 200)
  draw()
}

const stop = () => {
  playing.value = false
  clearInterval(noteTimer)
  cancelAnimationFrame(rafId)
  ctx?.close()
  ctx = undefined
  const canvas = canvasRef.value
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

onBeforeUnmount(stop)
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
  border: 1px solid hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
}

.media-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  button {
    padding: 0.25rem 0.8rem;
    border: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .media-note {
    font-size: 0.65rem;
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 55%);
  }
}
</style>
