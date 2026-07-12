<template>
  <section class="section">
    <div class="container status-page">
      <p class="overline mb-2">status $ ping relay</p>
      <h1 class="title is-2 mb-2">Multiplayer status</h1>
      <p class="subtitle is-6 has-text-grey mb-5">
        This site has a live, multiplayer layer over a tiny WebSocket relay. Here's whether it's up — and who's around right now.
      </p>

      <!-- top banner: online vs solo -->
      <div class="status-banner is-family-code" :class="online ? 'is-online' : 'is-solo'" data-testid="status-banner">
        <span class="status-dot" aria-hidden="true" />
        <span v-if="online">multiplayer online — the relay is configured and this page is connected.</span>
        <span v-else>running in solo / offline mode — no relay is configured on this build, so multiplayer features are inert.</span>
      </div>

      <!-- live numbers, only meaningful when the relay is configured -->
      <div v-if="online" class="status-metrics" data-testid="status-metrics">
        <div class="status-metric">
          <span class="status-metric-value">{{ visitors }}</span>
          <span class="status-metric-label">visitor{{ visitors === 1 ? '' : 's' }} online now</span>
        </div>
        <div class="status-metric">
          <span class="status-metric-value">{{ world.online.value }}</span>
          <span class="status-metric-label">pixel-world painter{{ world.online.value === 1 ? '' : 's' }}</span>
        </div>
        <div class="status-metric">
          <span class="status-metric-value">{{ world.recent.value }}</span>
          <span class="status-metric-label">pixels placed recently</span>
        </div>
        <div class="status-metric">
          <span class="status-metric-value">{{ fill === null ? '…' : `${fill}%` }}</span>
          <span class="status-metric-label">pixel board filled</span>
        </div>
      </div>
      <p v-else class="status-solo-note is-family-code has-text-grey">
        // live counts appear here when the site is built with NUXT_PUBLIC_CURSORS_WS=&lt;wss url&gt;
      </p>

      <!-- feature roster -->
      <h2 class="status-subhead is-family-code">features</h2>
      <ul class="status-features">
        <li v-for="feature in features" :key="feature.name" class="status-feature">
          <span class="status-feature-name">{{ feature.name }}</span>
          <span class="status-feature-desc has-text-grey">{{ feature.desc }}</span>
          <span class="status-feature-state is-family-code" :class="online ? 'is-up' : 'is-down'">
            {{ online ? 'available' : 'offline' }}
          </span>
        </li>
      </ul>

      <p class="status-foot is-family-code is-size-7 has-text-grey mt-5">
        // the relay is an optional, external service — the site itself stays fully static and works with it switched off.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
// An honest health page for the site's multiplayer layer. It reuses the existing
// realtime composables rather than opening its own socket: live visitor count
// comes from the globally-mounted LiveCursors (via useLiveVisitors), and the
// pixel-world numbers come from useWorld once we join on mount. Everything reads
// "offline" when NUXT_PUBLIC_CURSORS_WS is unset — no fake zeros.
const ogImage = `${SITE_URL}/og/default.png`
useHead({ title: 'Status — Laurens Verspeek' })
useSeoMeta({
  description: 'Live health of the multiplayer layer on laurensverspeek.nl — relay status, who is online now, and which realtime features are available.',
  ogTitle: 'Multiplayer status',
  ogUrl: `${SITE_URL}/status`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

const relayConfigured = Boolean(useRuntimeConfig().public.cursorsWs)
const online = computed(() => relayConfigured)

// live visitors: LiveCursors is mounted site-wide and owns the socket, so we
// only read the shared count — no join/leave needed here.
const { count: visitors } = useLiveVisitors()

// pixel world: join on mount, leave on unmount, so the relay streams us the
// online/recent counters and the current board.
const world = useWorld()
const { board } = world

// share of non-default (non-zero) pixels — palette index 0 is the empty background
const fill = computed(() => {
  const b = board.value
  if (!b || !b.length) return null
  let painted = 0
  for (let i = 0; i < b.length; i++) if (b[i] !== 0) painted++
  return Math.round((painted / b.length) * 100)
})

onMounted(() => {
  if (relayConfigured) world.enter()
})
onUnmounted(() => {
  if (relayConfigured) world.leave()
})

const features = [
  { name: 'Live cursors', desc: 'see other visitors move around the page' },
  { name: 'Pixel world', desc: 'a shared, cooldown-gated /world canvas' },
  { name: 'Chat (#lounge)', desc: 'a public terminal chat room' },
  { name: 'Hall of fame', desc: 'a shared high-score leaderboard' },
  { name: 'Online games', desc: 'pong, chess and the WPM race, versus real people' },
  { name: 'Visitor globe', desc: 'where everyone online is, by timezone' }
]
</script>

<style scoped lang="scss">
.status-page {
  max-width: 46rem;
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 1.1rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 0.4rem;
  font-size: 0.85rem;
  line-height: 1.4;

  &.is-online {
    border-color: hsla(var(--lv-primary-hsl), 0.5);
    background-color: hsla(var(--lv-primary-hsl), 0.07);
  }
}

.status-dot {
  flex: 0 0 auto;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;

  .is-online & {
    background-color: var(--bulma-primary);
    animation: status-pulse 2s ease-in-out infinite;
  }

  .is-solo & {
    background-color: var(--bulma-text-weak);
  }
}

.status-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.status-metric {
  padding: 1rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 0.4rem;
  text-align: center;

  .status-metric-value {
    display: block;
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1;
    color: var(--bulma-primary-on-scheme);
  }

  .status-metric-label {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--bulma-text-weak);
  }
}

.status-solo-note {
  margin-top: 1.25rem;
  font-size: 0.8rem;
}

.status-subhead {
  margin: 2.25rem 0 0.75rem;
  color: var(--bulma-primary-on-scheme);
  font-size: 0.8rem;
  text-transform: lowercase;
  letter-spacing: 0.08em;
}

.status-features {
  list-style: none;
  margin: 0;
  padding: 0;
}

.status-feature {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--bulma-border-weak);

  &:last-child {
    border-bottom: none;
  }

  .status-feature-name {
    flex: 0 0 9rem;
    font-weight: 600;
  }

  .status-feature-desc {
    flex: 1;
    font-size: 0.85rem;
  }

  .status-feature-state {
    flex: 0 0 auto;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;

    &.is-up {
      color: var(--bulma-primary-on-scheme);
    }

    &.is-down {
      color: var(--bulma-text-weak);
    }
  }
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot { animation: none !important; }
}

@media (max-width: 32rem) {
  .status-feature {
    flex-wrap: wrap;

    .status-feature-name { flex-basis: 100%; }
  }
}
</style>
