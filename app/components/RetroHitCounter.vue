<template>
  <p
    v-if="digits"
    class="hit-counter is-family-code is-size-7"
    :title="`${raw} page views — public GoatCounter counter, no cookies`"
    data-testid="hit-counter"
  >
    <span class="hit-label">hits:</span>
    <span class="hit-digits" :aria-label="`${raw} page views`">
      <span v-for="(digit, i) in digits" :key="i" class="hit-digit" aria-hidden="true">{{ digit }}</span>
    </span>
  </p>
</template>

<script setup lang="ts">
// An old-web odometer fed by GoatCounter's public counter endpoint. Renders
// nothing unless analytics is enabled at build time AND the API answers —
// a 90s guestbook-era touch, minus the cookies.
const { goatcounter } = useRuntimeConfig().public

const raw = ref('')
const digits = ref<string[] | null>(null)

onMounted(async () => {
  if (!goatcounter) return
  try {
    const total = await $fetch<{ count: string }>(
      `https://${goatcounter}.goatcounter.com/counter/TOTAL.json`
    )
    raw.value = total.count.trim()
    digits.value = formatHits(total.count)
  } catch {
    // public counters off or network trouble: the footer simply stays quiet
  }
})
</script>

<style scoped lang="scss">
.hit-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0.6rem;
}

.hit-label {
  color: var(--bulma-text-weak);
}

.hit-digits {
  display: inline-flex;
  gap: 2px;
}

// the odometer stays black in both themes — that's the retro charm
.hit-digit {
  min-width: 1.1em;
  padding: 0.1em 0.15em;
  border: 1px solid #333;
  border-radius: 2px;
  background: linear-gradient(180deg, #000 0%, #1a1a1a 45%, #000 100%);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 80%);
  color: var(--bulma-primary);
  text-align: center;
  text-shadow: 0 0 4px rgb(255 186 0 / 45%);
}
</style>
