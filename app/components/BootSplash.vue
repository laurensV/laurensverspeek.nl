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
          laurensverspeek.nl 2.0 ready — press any key
        </p>
      </div>
      <p class="boot-skip">click or press any key to skip</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion, useEventListener } from '@vueuse/core'

const BOOT_LINES = [
  'BIOS laurensverspeek.nl v2.0.0',
  'loading kernel modules... vue@3 nuxt@4 bulma@1',
  'mounting ~/projects (8 entries)',
  'starting particle-network.service',
  'starting terminal.service on tty~',
  'establishing uplink to github.com',
  'easter_eggs.service loaded (try: help)'
]

const STORAGE_KEY = 'lv-booted'

const visible = ref(false)
const shownLines = ref<string[]>([])
const done = ref(false)
const reducedMotion = usePreferredReducedMotion()

let timers: ReturnType<typeof setTimeout>[] = []

const finish = () => {
  timers.forEach(clearTimeout)
  timers = []
  visible.value = false
}

onMounted(() => {
  // once per browser session, never for reduced motion or repeat visitors in-session
  if (reducedMotion.value === 'reduce' || sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.setItem(STORAGE_KEY, '1')

  visible.value = true
  BOOT_LINES.forEach((line, i) => {
    timers.push(setTimeout(() => shownLines.value.push(line), 120 + i * 160))
  })
  timers.push(setTimeout(() => (done.value = true), 120 + BOOT_LINES.length * 160))
  timers.push(setTimeout(finish, 900 + BOOT_LINES.length * 160))
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
  background-color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 4%);
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 85%);
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
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 45%);
  text-align: center;
}

.boot-leave-active {
  transition: opacity 0.3s ease;
}

.boot-leave-to {
  opacity: 0;
}
</style>
