<template>
  <div ref="rootRef">
    <div class="columns is-mobile is-multiline">
      <div v-for="stat in stats" :key="stat.label" class="column is-3-tablet is-6-mobile">
        <div class="box stat-tile has-text-centered">
          <p class="title is-3 mb-1 stat-value">{{ stat.value }}</p>
          <p class="is-family-code is-size-7 has-text-grey">{{ stat.label }}</p>
        </div>
      </div>
    </div>
    <p class="is-family-code is-size-7 has-text-grey">
      // from the <a :href="`https://github.com/${GITHUB_USER}`" target="_blank" rel="noopener">github api</a>, baked at build<span v-if="data.generatedAt"> · updated {{ data.generatedAt }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'

const { data } = useGithubStats()

const YEARS_CODING = new Date().getFullYear() - 2011

// count-up: ease from 0 to the real values — but only once the tiles are
// actually on screen, so the roll isn't wasted above the visitor's scroll
const rootRef = ref<HTMLElement>()
const visible = useElementVisibility(rootRef)
const progress = ref(1)
let played = false
let raf = 0
// data is baked in now (immediate), so the roll only waits on the tiles scrolling
// into view
watch(visible, (seen) => {
  if (!seen || played) return
  played = true
  if (prefersReducedMotion()) return
  cancelAnimationFrame(raf)
  progress.value = 0
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / 900)
    progress.value = 1 - (1 - t) ** 3
    if (t < 1) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => cancelAnimationFrame(raf))

const stats = computed(() => [
  { label: 'public repos', value: format(data.value.publicRepos) },
  { label: 'github stars', value: format(data.value.totalStars) },
  { label: 'followers', value: format(data.value.followers) },
  { label: 'years of code', value: `${Math.round(YEARS_CODING * progress.value)}+` }
])

const format = (value?: number) =>
  value === undefined ? '—' : String(Math.round(value * progress.value))
</script>

<style scoped lang="scss">
.stat-tile {
  height: 100%;
  border: 1px solid var(--bulma-border-weak);
}

.stat-value {
  color: var(--bulma-primary-on-scheme);
}

.stat-error {
  color: var(--bulma-danger);
}
</style>
