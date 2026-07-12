<template>
  <div class="camera is-family-code">
    <div v-if="!running" class="camera-idle">
      <p>ascii camera</p>
      <p class="camera-hint">your webcam, rendered as text. nothing is uploaded — it never leaves this window.</p>
      <button class="camera-btn" @click="start">▶ turn camera on</button>
      <p v-if="failed" class="camera-error">no camera, or permission denied. (totally fair.)</p>
    </div>
    <template v-else>
      <pre class="camera-feed" aria-hidden="true">{{ frame }}</pre>
      <div class="camera-controls">
        <button class="camera-btn" @click="snap">{{ snapped ? 'saved to gallery ✓' : '◉ snap' }}</button>
        <button class="camera-btn" @click="stop">■ turn off</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { framePixelsToAscii } from '~/utils/asciiCam'
import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

// The terminal's asciicam toy, as a window: same pure luminance→glyph engine
// (utils/asciiCam), plus a snap button that renders the current frame into the
// same 'lvos-shots' gallery the screenshot tool and paint feed.

const CAM_W = 72
const CAM_H = 30

const colorMode = useColorMode()
const running = ref(false)
const failed = ref(false)
const snapped = ref(false)
const frame = ref('')

let stream: MediaStream | undefined
let video: HTMLVideoElement | undefined
let raf = 0
const grab = document.createElement('canvas')
grab.width = CAM_W
grab.height = CAM_H

const start = async () => {
  failed.value = false
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  } catch {
    failed.value = true
    return
  }
  video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  await video.play().catch(() => {})
  running.value = true
  const context = grab.getContext('2d', { willReadFrequently: true })!
  const dark = colorMode.value !== 'light'
  const tick = () => {
    if (video) {
      context.drawImage(video, 0, 0, CAM_W, CAM_H)
      const { data } = context.getImageData(0, 0, CAM_W, CAM_H)
      frame.value = framePixelsToAscii(data, CAM_W, CAM_H, dark)
    }
    raf = requestAnimationFrame(tick)
  }
  tick()
}

const stop = () => {
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((track) => track.stop())
  stream = undefined
  video = undefined
  running.value = false
  frame.value = ''
}

// render the ASCII frame onto a canvas so the gallery can show it as an image
const snap = () => {
  const rows = frame.value.split('\n')
  const cell = 8
  const shot = document.createElement('canvas')
  shot.width = CAM_W * cell * 0.62
  shot.height = CAM_H * cell
  const c = shot.getContext('2d')!
  c.fillStyle = '#101014'
  c.fillRect(0, 0, shot.width, shot.height)
  c.fillStyle = '#ffba00'
  c.font = `${cell}px monospace`
  rows.forEach((row, y) => c.fillText(row, 4, (y + 1) * cell))
  const existing = storageGetJson('lvos-shots', isStringArray) ?? []
  if (storageSetJson('lvos-shots', [shot.toDataURL('image/png'), ...existing].slice(0, 6))) {
    snapped.value = true
    setTimeout(() => (snapped.value = false), 1600)
  }
}

onUnmounted(stop)
</script>

<style scoped lang="scss">
.camera {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.camera-idle {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.75rem 0.25rem;
}

.camera-hint {
  color: hsl(var(--lv-scheme-hs), 55%);
  max-width: 26rem;
}

.camera-error {
  color: var(--bulma-danger);
}

.camera-feed {
  margin: 0;
  padding: 0.5rem;
  font-size: 0.5rem;
  line-height: 1;
  background-color: #101014;
  color: #ffba00;
  border-radius: var(--bulma-radius);
  overflow: auto;
}

.camera-controls {
  display: flex;
  gap: 0.5rem;
}

.camera-btn {
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius);
  background: var(--bulma-scheme-main-bis);
  color: var(--bulma-text);
  font: inherit;
  padding: 0.25rem 0.7rem;
  cursor: pointer;

  &:hover {
    border-color: var(--bulma-primary);
    color: var(--bulma-primary-on-scheme);
  }
}
</style>
