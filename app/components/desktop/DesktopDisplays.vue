<template>
  <div class="displays is-family-code">
    <div class="displays-mock">
      <div class="displays-screen">
        <span class="displays-res">{{ width }} × {{ height }}</span>
      </div>
      <span class="displays-name">lvOS virtual display</span>
    </div>

    <dl class="displays-info">
      <div><dt>resolution</dt><dd>{{ width }} × {{ height }}</dd></div>
      <div><dt>scaling</dt><dd>{{ scaling }}% ({{ dpr }}× dpr)</dd></div>
      <div><dt>refresh</dt><dd>{{ refresh }} Hz</dd></div>
      <div><dt>colour</dt><dd>{{ colorDepth }}-bit</dd></div>
    </dl>

    <div class="displays-night">
      <label class="displays-toggle">
        <input v-model="nightLight.enabled.value" type="checkbox">
        <span>Night light</span>
      </label>
      <p class="displays-hint">warms the whole desktop to ease late-night pixel-pushing</p>
      <label class="displays-warmth" :class="{ 'is-disabled': !nightLight.enabled.value }">
        <span>warmth</span>
        <input
          v-model.number="nightLight.warmth.value"
          type="range"
          min="0"
          max="100"
          :disabled="!nightLight.enabled.value"
          aria-label="Night light warmth"
        >
        <span class="displays-warmth-pct">{{ nightLight.warmth.value }}%</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
// The lvOS Displays panel: a real read-out of the browser's screen (resolution,
// device-pixel-ratio as "scaling", colour depth) plus the night-light control.
const nightLight = useNightLight()

const width = ref(0)
const height = ref(0)
const dpr = ref(1)
const colorDepth = ref(24)
const refresh = ref(60)
const scaling = computed(() => Math.round(dpr.value * 100))

const measure = () => {
  width.value = window.innerWidth
  height.value = window.innerHeight
  dpr.value = Math.round((window.devicePixelRatio || 1) * 100) / 100
  colorDepth.value = window.screen.colorDepth
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onUnmounted(() => window.removeEventListener('resize', measure))
</script>

<style scoped lang="scss">
.displays {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 15rem;
  font-size: 0.75rem;
}

.displays-mock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;

  .displays-screen {
    width: 9rem;
    height: 5.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius);
    background:
      radial-gradient(40rem 20rem at 60% 20%, hsla(var(--lv-primary-hsl), 0.18), transparent),
      hsl(var(--lv-scheme-hs), 8%);
    box-shadow: inset 0 0 20px hsla(var(--lv-scheme-hs), 2%, 0.6);
  }

  .displays-res {
    color: var(--bulma-primary);
    font-size: 0.7rem;
  }

  .displays-name {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.65rem;
  }
}

.displays-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  div {
    display: flex;
    justify-content: space-between;
  }

  dt {
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  dd {
    color: hsl(var(--lv-scheme-hs), 88%);
  }
}

.displays-night {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  padding-top: 0.7rem;
}

.displays-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: hsl(var(--lv-scheme-hs), 88%);

  input {
    accent-color: var(--bulma-primary);
  }
}

.displays-hint {
  margin: 0.2rem 0 0.5rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.65rem;
}

.displays-warmth {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--lv-scheme-hs), 55%);

  &.is-disabled {
    opacity: 0.5;
  }

  input[type='range'] {
    flex: 1;
    accent-color: var(--bulma-primary);
  }

  .displays-warmth-pct {
    width: 2.5rem;
    text-align: right;
    color: var(--bulma-primary);
  }
}
</style>
