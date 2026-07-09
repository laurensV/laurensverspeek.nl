<template>
  <nav v-if="segments.length" class="crumbs is-family-code" aria-label="Breadcrumb">
    <div class="container crumbs-inner">
      <span class="crumbs-prompt" aria-hidden="true">$ pwd<span class="crumbs-arrow"> →</span></span>
      <ol class="crumbs-list">
        <li class="crumbs-item">
          <NuxtLink to="/" class="crumbs-link">~</NuxtLink>
        </li>
        <li v-for="segment in segments" :key="segment.to" class="crumbs-item">
          <span class="crumbs-sep" aria-hidden="true">/</span>
          <NuxtLink v-if="!segment.last" :to="segment.to" class="crumbs-link">{{ segment.label }}</NuxtLink>
          <span v-else class="crumbs-here" aria-current="page">{{ segment.label }}</span>
        </li>
      </ol>
    </div>
  </nav>
</template>

<script setup lang="ts">
// The current URL rendered as `pwd` output: every parent segment is a link.
// Hidden on the home page (~ alone is not much of a trail) and on full-height
// app pages that opt out with `definePageMeta({ breadcrumb: false })` — their
// viewport-sized layouts can't afford the extra strip.
const route = useRoute()

const segments = computed(() => {
  if (route.meta.breadcrumb === false) return []
  const parts = route.path.split('/').filter(Boolean)
  return parts.map((part, i) => ({
    label: part,
    to: `/${parts.slice(0, i + 1).join('/')}`,
    last: i === parts.length - 1
  }))
})

// mirror the visible trail as BreadcrumbList structured data
useHead({
  script: computed(() =>
    segments.value.length
      ? [{
          key: 'breadcrumb-ld',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': [
              { '@type': 'ListItem', 'position': 1, 'name': 'home', 'item': SITE_URL },
              ...segments.value.map((segment, i) => ({
                '@type': 'ListItem' as const,
                'position': i + 2,
                'name': segment.label,
                'item': `${SITE_URL}${segment.to}`
              }))
            ]
          })
        }]
      : []
  )
})
</script>

<style scoped lang="scss">
.crumbs {
  font-size: 0.72rem;
  padding-top: 0.9rem;
  margin-bottom: -1.4rem; // tuck into the section padding below without pushing content
}

.crumbs-inner {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  padding-inline: 1.5rem;
  white-space: nowrap;
  overflow-x: auto;
}

.crumbs-prompt {
  color: var(--bulma-text-weak);
  opacity: 0.7;
  flex-shrink: 0;

  .crumbs-arrow {
    color: var(--bulma-primary-on-scheme);
    opacity: 0.8;
  }
}

.crumbs-list {
  display: flex;
  align-items: baseline;
  list-style: none;
  margin: 0;
  padding: 0;
}

.crumbs-item {
  display: flex;
  align-items: baseline;
}

.crumbs-sep {
  color: var(--bulma-text-weak);
  opacity: 0.55;
  padding-inline: 0.15rem;
}

.crumbs-link {
  color: var(--bulma-text-weak);
  text-decoration: none;
  border-bottom: 1px dotted transparent;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: var(--bulma-primary-on-scheme);
    border-bottom-color: var(--bulma-primary-on-scheme);
  }
}

.crumbs-here {
  color: var(--bulma-text);
}
</style>
