<template>
  <button
    v-if="view"
    class="lvos-pet is-family-code"
    :class="{ 'is-fed': fedPulse, 'is-asleep': view.mood === 'asleep' }"
    :style="{ left: `${pos.x}%`, top: `${pos.y}%`, transitionDuration: `${moveMs}ms` }"
    :title="`${view.name} — ${view.moodLine} click to feed`"
    :aria-label="`Feed ${view.name}`"
    @click="feedPet"
  >
    <span class="lvos-pet-face">{{ view.face }}</span>
    <span v-if="fedPulse" class="lvos-pet-heart" aria-hidden="true">♥</span>
    <span class="lvos-pet-name">{{ view.name }}</span>
  </button>
</template>

<script setup lang="ts">
// The tamagotchi, at large: if the visitor adopted a pet (terminal `pet
// adopt`), it wanders the lvOS desktop. Same shared state as the status bar —
// feeding it here counts there. Asleep pets and reduced motion stay put.
const { view, feed } = usePet()

const pos = ref({ x: 72, y: 62 })
const moveMs = ref(0)
const fedPulse = ref(false)

let wanderTimer: ReturnType<typeof setInterval> | undefined
let pulseTimer: ReturnType<typeof setTimeout> | undefined
let still = false

const wander = () => {
  if (still || !view.value || view.value.mood === 'asleep') return
  // amble somewhere nearby, keeping clear of the icon column and taskbar
  const target = {
    x: Math.min(88, Math.max(24, pos.value.x + (Math.random() - 0.5) * 34)),
    y: Math.min(78, Math.max(10, pos.value.y + (Math.random() - 0.5) * 26))
  }
  moveMs.value = 2600
  pos.value = target
}

onMounted(() => {
  still = prefersReducedMotion()
  wanderTimer = setInterval(wander, 3400)
})
onUnmounted(() => {
  clearInterval(wanderTimer)
  clearTimeout(pulseTimer)
})

const feedPet = () => {
  feed()
  fedPulse.value = true
  clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => (fedPulse.value = false), 1200)
}
</script>

<style scoped lang="scss">
.lvos-pet {
  position: absolute;
  z-index: 6; // above the wallpaper, below every window
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.3rem 0.45rem;
  border: none;
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition-property: left, top;
  transition-timing-function: linear;

  .lvos-pet-face {
    white-space: nowrap;
  }

  .lvos-pet-name {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.6rem;
  }

  .lvos-pet-heart {
    position: absolute;
    top: -0.9rem;
    color: var(--bulma-danger);
    animation: lvos-pet-heart 1.2s ease-out forwards;
  }

  &.is-asleep {
    opacity: 0.7;
  }

  &.is-fed .lvos-pet-face {
    animation: lvos-pet-hop 0.5s ease;
  }
}

@keyframes lvos-pet-heart {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-1.2rem);
  }
}

@keyframes lvos-pet-hop {
  30% {
    transform: translateY(-0.4rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lvos-pet {
    transition: none;

    .lvos-pet-heart,
    &.is-fed .lvos-pet-face {
      animation: none;
    }
  }
}
</style>
