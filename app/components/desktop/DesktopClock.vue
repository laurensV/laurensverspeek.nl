<template>
  <div class="clock is-family-code">
    <svg class="clock-face" viewBox="0 0 100 100" role="img" aria-label="Analog clock">
      <circle class="clock-rim" cx="50" cy="50" r="47" />
      <line
        v-for="tick in 12"
        :key="tick"
        class="clock-tick"
        x1="50"
        y1="6"
        x2="50"
        y2="11"
        :transform="`rotate(${tick * 30} 50 50)`"
      />
      <line class="clock-hand is-hour" x1="50" y1="50" x2="50" y2="28" :transform="`rotate(${hourAngle} 50 50)`" />
      <line class="clock-hand is-min" x1="50" y1="50" x2="50" y2="18" :transform="`rotate(${minAngle} 50 50)`" />
      <line class="clock-hand is-sec" x1="50" y1="54" x2="50" y2="14" :transform="`rotate(${secAngle} 50 50)`" />
      <circle class="clock-pin" cx="50" cy="50" r="2" />
    </svg>
    <p class="clock-digital">{{ digital }}</p>

    <div class="timer">
      <p class="timer-label">timer</p>
      <p class="timer-display" :class="{ 'is-done': timerDone }">{{ timerDisplay }}</p>
      <div class="timer-controls">
        <button v-for="s in [60, 300, 600]" :key="s" @click="addTime(s)">+{{ s / 60 }}m</button>
        <button :disabled="!timerLeft" @click="toggleTimer">{{ timerRunning ? 'pause' : 'start' }}</button>
        <button @click="resetTimer">reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNow, useIntervalFn } from '@vueuse/core'

// Analog + digital clock, plus a countdown timer. The timer counts in real time
// via a per-second interval, so it stays accurate even off-thread.

const now = useNow({ interval: 1000 })

const secAngle = computed(() => now.value.getSeconds() * 6)
const minAngle = computed(() => now.value.getMinutes() * 6 + now.value.getSeconds() * 0.1)
const hourAngle = computed(() => (now.value.getHours() % 12) * 30 + now.value.getMinutes() * 0.5)
const digital = computed(() => now.value.toLocaleTimeString('en-GB'))

// ---- countdown timer ----
const timerLeft = ref(0)
const timerRunning = ref(false)
const timerDone = ref(false)

const timerDisplay = computed(() => {
  const m = Math.floor(timerLeft.value / 60)
  const s = timerLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const { pause, resume } = useIntervalFn(() => {
  if (timerLeft.value <= 0) {
    timerRunning.value = false
    timerDone.value = true
    pause()
    return
  }
  timerLeft.value--
}, 1000, { immediate: false })

const addTime = (seconds: number) => {
  timerDone.value = false
  timerLeft.value += seconds
}

const toggleTimer = () => {
  if (!timerLeft.value) return
  timerRunning.value = !timerRunning.value
  timerDone.value = false
  if (timerRunning.value) resume()
  else pause()
}

const resetTimer = () => {
  timerRunning.value = false
  timerDone.value = false
  timerLeft.value = 0
  pause()
}

onBeforeUnmount(pause)
</script>

<style scoped lang="scss">
.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.clock-face {
  width: 9rem;
  height: 9rem;
}

.clock-rim {
  fill: hsl(var(--lv-scheme-hs), 6%);
  stroke: hsla(var(--lv-primary-hsl), 0.4);
  stroke-width: 1.5;
}

.clock-tick {
  stroke: hsl(var(--lv-scheme-hs), 45%);
  stroke-width: 1;
}

.clock-hand {
  stroke-linecap: round;

  &.is-hour {
    stroke: hsl(var(--lv-scheme-hs), 88%);
    stroke-width: 2.5;
  }
  &.is-min {
    stroke: hsl(var(--lv-scheme-hs), 88%);
    stroke-width: 1.8;
  }
  &.is-sec {
    stroke: var(--bulma-primary);
    stroke-width: 1;
  }
}

.clock-pin {
  fill: var(--bulma-primary);
}

.clock-digital {
  color: var(--bulma-primary);
  font-size: 1.1rem;
  letter-spacing: 0.05em;
}

.timer {
  width: 100%;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  text-align: center;

  .timer-label {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.7rem;
  }

  .timer-display {
    color: hsl(var(--lv-scheme-hs), 88%);
    font-size: 1.6rem;

    &.is-done {
      color: var(--bulma-primary);
      animation: timer-flash 0.8s steps(2, start) infinite;
    }
  }

  .timer-controls {
    display: flex;
    justify-content: center;
    gap: 0.3rem;
    margin-top: 0.4rem;

    button {
      padding: 0.2rem 0.5rem;
      border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
      border-radius: var(--bulma-radius-small);
      background: none;
      color: hsl(var(--lv-scheme-hs), 80%);
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: hsla(var(--lv-primary-hsl), 0.5);
        color: var(--bulma-primary);
      }

      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }
  }
}

@keyframes timer-flash {
  to {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .timer-display.is-done {
    animation: none;
  }
}
</style>
