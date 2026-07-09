<template>
  <div class="route-progress" :class="{ 'is-active': visible }" aria-hidden="true">
    <div class="route-progress-bar" :style="{ transform: `scaleX(${progress})`, opacity: visible ? 1 : 0 }" />
  </div>
</template>

<script setup lang="ts">
// A thin top loading bar tied to Nuxt's navigation lifecycle. It creeps toward
// ~90% while a route resolves, then completes and fades. Reduced motion still
// shows the bar (it just doesn't ease).

const progress = ref(0)
const visible = ref(false)
let creepTimer: ReturnType<typeof setInterval> | undefined
let doneTimer: ReturnType<typeof setTimeout> | undefined

const start = () => {
  clearTimeout(doneTimer)
  clearInterval(creepTimer)
  visible.value = true
  progress.value = 0.08
  creepTimer = setInterval(() => {
    // ease toward 0.9 but never quite reach it until finish()
    progress.value += (0.9 - progress.value) * 0.25
  }, 180)
}

const finish = () => {
  clearInterval(creepTimer)
  progress.value = 1
  doneTimer = setTimeout(() => {
    visible.value = false
    progress.value = 0
  }, 250)
}

const nuxtApp = useNuxtApp()
nuxtApp.hook('page:start', start)
nuxtApp.hook('page:finish', finish)
// content-heavy pages resolve via app:suspense too
nuxtApp.hook('app:suspense:resolve', finish)

onUnmounted(() => {
  clearInterval(creepTimer)
  clearTimeout(doneTimer)
})
</script>

<style scoped lang="scss">
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 200;
  pointer-events: none;
}

.route-progress-bar {
  height: 100%;
  transform-origin: left center;
  transform: scaleX(0);
  background: linear-gradient(90deg, hsla(var(--lv-primary-hsl), 0.6), var(--bulma-primary));
  box-shadow: 0 0 8px hsla(var(--lv-primary-hsl), 0.6);
  transition: transform 0.18s ease, opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .route-progress-bar {
    transition: opacity 0.25s ease;
  }
}
</style>
