<template>
  <section class="section">
    <div class="container now-container">
      <p class="overline mb-2">now $ ps aux | grep laurens</p>
      <h1 class="title is-2">Now</h1>
      <p class="subtitle is-5 has-text-grey mb-6">
        What I'm doing these days — last updated
        <span class="is-family-code">{{ updated }}</span> from {{ now.location }}.
      </p>

      <div class="ps-table is-family-code">
        <div class="ps-head">
          <span>PID</span><span>STAT</span><span>%CPU</span><span class="ps-cmd">COMMAND</span>
        </div>
        <template v-for="(section, si) in now.sections" :key="section.title">
          <p class="ps-group">./{{ section.title.toLowerCase() }}</p>
          <div
            v-for="(item, ii) in section.items"
            :key="item"
            class="ps-row"
          >
            <span class="ps-pid">{{ pid(si, ii) }}</span>
            <span class="ps-stat" :class="`is-${statusOf(si).cls}`">{{ statusOf(si).label }}</span>
            <span class="ps-cpu">{{ cpu(section.title, item) }}</span>
            <span class="ps-cmd">{{ item }}</span>
          </div>
        </template>
      </div>

      <p class="is-family-code is-size-7 has-text-grey mt-6">
        // also available as the `now` command in the terminal
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { now } from '~/data/now'

// derived from git at build time: when app/data/now.ts last actually changed
const updated = useRuntimeConfig().public.nowUpdated

useHead({ title: 'Now — Laurens Verspeek' })
const ogImage = `${SITE_URL}/og/page-now.svg`
useSeoMeta({
  description: 'What Laurens Verspeek is building, learning and tinkering with right now.',
  ogUrl: `${SITE_URL}/now`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

// a process per "now" item — a running program is what a `now` page really is
const pid = (section: number, item: number) => 1000 + section * 111 + item * 7

const STATUSES = [
  { label: 'R', cls: 'run' }, // building → running
  { label: 'S', cls: 'sleep' }, // learning → interruptible sleep
  { label: 'D', cls: 'disk' } // tinkering → uninterruptible
]
const statusOf = (section: number) => STATUSES[section % STATUSES.length]!

// deterministic plausible %CPU so it's stable per item
const cpu = (title: string, item: string) => {
  let hash = 0
  for (const char of title + item) hash = (hash * 13 + char.charCodeAt(0)) >>> 0
  return (hash % 900 / 10 + 1).toFixed(1).padStart(4, ' ')
}
</script>

<style scoped lang="scss">
.now-container {
  max-width: 46rem;
}

.ps-table {
  font-size: 0.85rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  overflow-x: auto;
}

.ps-head,
.ps-row {
  display: grid;
  grid-template-columns: 3.5rem 3rem 3.5rem 1fr;
  gap: 0.75rem;
  padding: 0.35rem 1rem;
  align-items: baseline;
}

.ps-head {
  color: var(--bulma-text-weak);
  border-bottom: 1px solid var(--bulma-border-weak);
  background-color: var(--bulma-scheme-main-bis);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}

.ps-group {
  padding: 0.6rem 1rem 0.2rem;
  color: var(--bulma-primary-on-scheme);
}

.ps-row {
  transition: background-color 0.15s ease;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.05);
  }

  .ps-pid {
    color: var(--bulma-text-weak);
  }

  .ps-stat {
    font-weight: 600;

    &.is-run {
      color: var(--bulma-primary-on-scheme);
    }
    &.is-sleep {
      color: var(--bulma-text-weak);
    }
    &.is-disk {
      color: var(--bulma-text);
    }
  }

  .ps-cpu {
    color: var(--bulma-text-weak);
    text-align: right;
  }

  .ps-cmd {
    color: var(--bulma-text);
    overflow-wrap: break-word;
  }
}

.ps-cmd {
  min-width: 0;
}
</style>
