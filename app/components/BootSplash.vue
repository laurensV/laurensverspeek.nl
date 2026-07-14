<template>
  <Transition name="boot">
    <div
      v-if="visible"
      class="boot-splash is-family-code"
      role="status"
      aria-label="Loading"
      @click="finish"
      @keydown="finish"
    >
      <div class="boot-log">
        <p v-for="(line, i) in shownLines" :key="i" class="boot-line">
          <span class="boot-ok">[ ok ]</span> {{ line }}
        </p>
        <p v-if="done" class="boot-line boot-ready">
          laurensverspeek.nl {{ buildVersion }} ready — press any key
        </p>
      </div>
      <p class="boot-skip">click or press any key to skip</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { registerBootProc, unregisterBootProc } from '~/utils/terminal/effectProcs'
import { playBootChime } from '~/utils/bootChime'
import { projects } from '~/data/projects'

const { volume, muted } = useVolume()
const buildVersion = useRuntimeConfig().public.buildVersion

const BOOT_LINES = [
  `BIOS laurensverspeek.nl ${buildVersion}`,
  'loading kernel modules... vue@3 nuxt@4 bulma@1',
  `mounting ~/projects (${projects.length} entries)`,
  'starting flow-field.service',
  'starting terminal.service on tty~',
  'establishing uplink to github.com',
  'easter_eggs.service loaded (try: help)'
]

const STORAGE_KEY = 'lv-booted'

const visible = ref(false)
const shownLines = ref<string[]>([])
const done = ref(false)

// `reboot` in the terminal replays the boot sequence on demand
const replayRequested = useState(STATE_KEYS.bootReplay, () => false)

let timers: ReturnType<typeof setTimeout>[] = []

const finish = () => {
  timers.forEach(clearTimeout)
  timers = []
  visible.value = false
}

const play = () => {
  shownLines.value = []
  done.value = false
  visible.value = true
  // startup chime, unless muted or silenced — sounds on user-triggered boots
  // (`reboot`, entering lvOS); autoplay policy quietly blocks it on a gesture-less
  // first visit. quiet-boot skips play() entirely, so it's covered too.
  if (!muted.value && volume.value > 0) playBootChime(volume.value / 100)
  BOOT_LINES.forEach((line, i) => {
    timers.push(setTimeout(() => shownLines.value.push(line), 120 + i * 160))
  })
  timers.push(setTimeout(() => (done.value = true), 120 + BOOT_LINES.length * 160))
  timers.push(setTimeout(finish, 900 + BOOT_LINES.length * 160))
}

onMounted(() => {
  // a seat in the shared process table while the splash is on screen: it's a
  // fullscreen takeover like the screensaver, so `kill 200` finishes it
  registerBootProc({ running: () => visible.value, stop: finish })
  // once per browser session, never for reduced motion (OS query OR the manual
  // switch) or repeat visitors in-session
  if (prefersReducedMotion() || sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.setItem(STORAGE_KEY, '1')
  play()
})

onBeforeUnmount(unregisterBootProc)

watch(replayRequested, (requested) => {
  if (requested) {
    replayRequested.value = false
    play()
  }
})

useEventListener(document, 'keydown', () => visible.value && finish())
</script>

<style scoped lang="scss">
.boot-splash {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2rem;
  background-color: hsl(var(--lv-scheme-hs), 4%);
  color: hsl(var(--lv-scheme-hs), 85%);
  cursor: pointer;
}

.boot-line {
  font-size: 0.9rem;
  line-height: 1.7;

  .boot-ok {
    color: var(--bulma-success);
  }
}

.boot-ready {
  margin-top: 0.75rem;
  color: var(--bulma-primary);
}

.boot-skip {
  font-size: 0.7rem;
  color: hsl(var(--lv-scheme-hs), 45%);
  text-align: center;
}

.boot-leave-active {
  transition: opacity 0.3s ease;
}

.boot-leave-to {
  opacity: 0;
}
</style>
