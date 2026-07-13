<template>
  <div v-if="!inSetup" class="boot is-family-code" role="status" aria-label="lvOS boot sequence">
    <pre class="boot-logo">{{ LOGO }}</pre>
    <p v-for="(line, i) in visibleLines" :key="i" class="boot-line" :class="`is-${line.type}`">
      {{ line.text }}<span v-if="i === visibleLines.length - 1" class="boot-caret">█</span>
    </p>
    <button type="button" class="boot-setup-hint" @click="enterSetup">Press DEL — or tap here — to enter SETUP</button>
  </div>
  <DesktopBios v-else @exit="exitSetup" />
</template>

<script setup lang="ts">
import { usePreferredReducedMotion, useEventListener } from '@vueuse/core'

// lvOS POST / BIOS check. Types out a few boot lines, then emits `done` and
// hands off to the desktop. Reduced-motion skips straight to the end. Pressing
// DEL mid-POST pauses the boot and opens the real BIOS setup (DesktopBios).

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
const inSetup = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let nextLine = 0

const tick = () => {
  if (inSetup.value) return // paused inside setup; exitSetup resumes
  if (nextLine >= LINES.length) {
    timer = setTimeout(() => emit('done'), 450)
    return
  }
  visibleLines.value.push(LINES[nextLine]!)
  nextLine++
  timer = setTimeout(tick, nextLine <= 2 ? 260 : 150)
}

onMounted(() => {
  if (reducedMotion.value === 'reduce') {
    visibleLines.value = LINES
    nextLine = LINES.length
    timer = setTimeout(() => emit('done'), 300)
    return
  }
  tick()
})

// DEL during POST (or a tap on the hint) pauses the boot and opens the setup
const enterSetup = () => {
  if (inSetup.value) return
  clearTimeout(timer)
  inSetup.value = true
}
useEventListener('keydown', (event: KeyboardEvent) => {
  if (inSetup.value || event.key !== 'Delete') return
  event.preventDefault()
  enterSetup()
})

const exitSetup = () => {
  inSetup.value = false
  // a real BIOS would reboot; POST resumes where it left off
  timer = setTimeout(tick, 250)
}

onUnmounted(() => clearTimeout(timer))
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
  // reset Bulma's default <pre> chrome (light background + padding) so the logo
  // sits flush on the dark boot screen instead of inside a pale panel
  margin-bottom: 1.5rem;
  padding: 0;
  background: none;
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

.boot-setup-hint {
  position: absolute;
  bottom: 1.5rem;
  left: clamp(1.5rem, 6vw, 6rem);
  padding: 0;
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 45%);
  font: inherit;
  cursor: pointer;

  &:hover {
    color: var(--bulma-primary);
  }

  // a real tap target on touch (POST flashes past, so it's forgiving)
  @media (pointer: coarse) {
    padding: 0.6rem 0;
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
