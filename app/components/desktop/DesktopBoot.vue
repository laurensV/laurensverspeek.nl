<template>
  <div class="boot is-family-code" role="status" aria-label="lvOS boot sequence">
    <pre class="boot-logo">{{ LOGO }}</pre>
    <p v-for="(line, i) in visibleLines" :key="i" class="boot-line" :class="`is-${line.type}`">
      {{ line.text }}<span v-if="i === visibleLines.length - 1" class="boot-caret">█</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'

// lvOS POST / BIOS check. Types out a few boot lines, then emits `done` and
// hands off to the desktop. Reduced-motion skips straight to the end.

const emit = defineEmits<{ done: [] }>()

const LOGO = String.raw` _       ______  _____
| |     / / __ \/ ___/
| | /| / / / / /\__ \
| |/ |/ / /_/ /___/ /
|__/|__/\____//____/   BIOS v2.0`

interface BootLine { text: string, type: 'ok' | 'info' | 'primary' }

const LINES: BootLine[] = [
  { text: 'lvOS BIOS (C) 2026 laurensverspeek.nl', type: 'info' },
  { text: 'Detecting hardware ...', type: 'info' },
  { text: 'CPU: WebKit/Blink @ 60fps ....................... [OK]', type: 'ok' },
  { text: 'Memory: unlimited localStorage ................. [OK]', type: 'ok' },
  { text: 'Display: 1 canvas, retina-ready ................ [OK]', type: 'ok' },
  { text: 'Input: keyboard, pointer, ~ key ............... [OK]', type: 'ok' },
  { text: 'Mounting /home/visitor ........................ [OK]', type: 'ok' },
  { text: 'Starting window manager ....................... [OK]', type: 'ok' },
  { text: 'Loading desktop environment ...', type: 'primary' }
]

const visibleLines = ref<BootLine[]>([])
const reducedMotion = usePreferredReducedMotion()

onMounted(() => {
  if (reducedMotion.value === 'reduce') {
    visibleLines.value = LINES
    setTimeout(() => emit('done'), 300)
    return
  }
  let i = 0
  const tick = () => {
    if (i >= LINES.length) {
      setTimeout(() => emit('done'), 450)
      return
    }
    visibleLines.value.push(LINES[i]!)
    i++
    setTimeout(tick, i <= 2 ? 260 : 150)
  }
  tick()
})
</script>

<style scoped lang="scss">
.boot {
  position: fixed;
  inset: 0;
  z-index: 96;
  padding: 2.5rem clamp(1.5rem, 6vw, 6rem);
  background-color: hsl(var(--lv-scheme-hs), 4%);
  color: hsl(var(--lv-scheme-hs), 82%);
  font-size: 0.85rem;
  line-height: 1.7;
  overflow: hidden;
}

.boot-logo {
  margin-bottom: 1.5rem;
  color: var(--bulma-primary);
  font-size: 0.85rem;
  line-height: 1.2;
}

.boot-line {
  &.is-ok {
    color: hsl(var(--lv-scheme-hs), 82%);
  }
  &.is-info {
    color: hsl(var(--lv-scheme-hs), 60%);
  }
  &.is-primary {
    color: var(--bulma-primary);
  }
}

.boot-caret {
  margin-left: 0.15rem;
  color: var(--bulma-primary);
  animation: boot-blink 1s steps(2, start) infinite;
}

@keyframes boot-blink {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .boot-caret {
    animation: none;
  }
}
</style>
