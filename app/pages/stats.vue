<template>
  <section class="section">
    <div class="container stats-container">
      <p class="overline mb-2">stats $ cat visitors.log</p>
      <h1 class="title is-2">Traffic, in public</h1>
      <p class="subtitle is-5 has-text-grey mb-5">
        Cookie-free counters straight from GoatCounter — the same numbers anyone can query.
      </p>

      <div v-if="!enabled" class="stats-off is-family-code">
        <p>$ stats</p>
        <p class="stats-muted">analytics is not enabled on this build — no tracking, and therefore no stats.</p>
        <p class="stats-muted">(enable by building with NUXT_PUBLIC_GOATCOUNTER=&lt;code&gt;)</p>
      </div>

      <div v-else class="stats-board is-family-code" data-testid="stats-board">
        <p class="stats-total">
          <span class="stats-bracket">[</span> site total <span class="stats-bracket">]</span> <b>{{ total || '…' }}</b> views
        </p>

        <div v-if="failed" class="stats-muted">
          could not reach {{ code }}.goatcounter.com — are public counters switched on?
        </div>

        <template v-else>
          <div v-for="row in rows" :key="row.path" class="stats-row">
            <NuxtLink :to="row.path" class="stats-path">{{ row.path }}</NuxtLink>
            <span class="stats-bar" :class="{ 'is-skeleton': row.count === undefined }" aria-hidden="true">
              <span v-if="row.count !== undefined" class="stats-bar-fill" :style="{ width: `${row.share}%` }" />
            </span>
            <span class="stats-count">{{ row.count ?? '' }}</span>
          </div>
          <p class="stats-muted mt-4">
            // public counters, no cookies, no fingerprints ·
            <a :href="`https://${code}.goatcounter.com`" target="_blank" rel="noopener">full dashboard ↗</a>
          </p>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// A public stats page over GoatCounter's tokenless counter endpoints. They
// expose per-path totals only (time series need an API token), so this renders
// honest terminal-style bars per page rather than fake sparklines.
const ogImage = `${SITE_URL}/og/page-stats.png`
useSeo({
  title: 'Stats — Laurens Verspeek',
  description: 'Public, cookie-free visitor stats for laurensverspeek.nl.',
  path: '/stats',
  image: ogImage
})

const { goatcounter: code } = useRuntimeConfig().public
const enabled = computed(() => Boolean(code))

const PATHS = ['/', '/blog', '/projects', '/about', '/uses', '/now', '/contact', '/changelog']

const total = ref('')
const failed = ref(false)
const counts = ref<Record<string, string | null>>({})

const parseCount = (count: string) => Number(count.replace(/\D/g, '')) || 0

const rows = computed(() => {
  const max = Math.max(1, ...PATHS.map((path) => parseCount(counts.value[path] ?? '')))
  return PATHS.map((path) => ({
    path,
    count: counts.value[path],
    share: Math.round((parseCount(counts.value[path] ?? '') / max) * 100)
  }))
})

onMounted(async () => {
  if (!enabled.value) return
  const base = `https://${code}.goatcounter.com/counter`
  try {
    const site = await $fetch<{ count: string }>(`${base}/TOTAL.json`)
    total.value = site.count.trim()
  } catch {
    failed.value = true
    return
  }
  await Promise.all(PATHS.map(async (path) => {
    const hit = await $fetch<{ count: string }>(`${base}/${encodeURIComponent(path)}.json`).catch(() => null)
    counts.value = { ...counts.value, [path]: hit ? hit.count.trim() : '0' }
  }))
})
</script>

<style scoped lang="scss">
.stats-container {
  max-width: 44rem;
}

.stats-off,
.stats-board {
  font-size: 0.85rem;
}

.stats-muted {
  color: var(--bulma-text-weak);

  a {
    color: var(--bulma-primary-on-scheme);
  }
}

.stats-total {
  margin-bottom: 1.25rem;

  .stats-bracket {
    color: var(--bulma-primary-on-scheme);
  }
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.3rem 0;

  .stats-path {
    flex: 0 0 7rem;
    color: var(--bulma-primary-on-scheme);
  }

  .stats-bar {
    flex: 1;
    height: 0.65rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 1px;
    overflow: hidden;

    // while a counter loads, the empty bar breathes with the site-wide shimmer
    &.is-skeleton {
      background-color: hsla(var(--lv-primary-hsl), 0.06);
    }
  }

  .stats-bar-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, hsla(var(--lv-primary-hsl), 0.4), var(--bulma-primary));
    transition: width 0.5s ease;
  }

  .stats-count {
    flex: 0 0 4.5rem;
    text-align: right;
    color: var(--bulma-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stats-row .stats-bar-fill {
    transition: none;
  }
}
</style>
