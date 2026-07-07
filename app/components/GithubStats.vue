<template>
  <div>
    <div class="columns is-mobile is-multiline">
      <div v-for="stat in stats" :key="stat.label" class="column is-3-tablet is-6-mobile">
        <div class="box stat-tile has-text-centered">
          <p
            class="title is-3 mb-1 stat-value"
            :class="{ 'is-skeleton': showSkeleton }"
          >
            {{ stat.value }}
          </p>
          <p class="is-family-code is-size-7 has-text-grey">{{ stat.label }}</p>
        </div>
      </div>
    </div>
    <p v-if="error" class="is-family-code is-size-7 stat-error">
      // github api unreachable — live stats hiding somewhere in the cloud
    </p>
    <p v-else class="is-family-code is-size-7 has-text-grey">
      // live from the <a :href="`https://github.com/${GITHUB_USER}`" target="_blank" rel="noopener">github api</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useMounted } from '@vueuse/core'

const { data, pending, error } = useGithubStats()

// The fetch is client-only; only show skeletons after mount to keep hydration clean
const mounted = useMounted()
const showSkeleton = computed(() => mounted.value && pending.value)

const YEARS_CODING = new Date().getFullYear() - 2011

const stats = computed(() => [
  { label: 'public repos', value: format(data.value?.publicRepos) },
  { label: 'github stars', value: format(data.value?.totalStars) },
  { label: 'followers', value: format(data.value?.followers) },
  { label: 'years of code', value: `${YEARS_CODING}+` }
])

const format = (value?: number) => (value === undefined ? '—' : String(value))
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
