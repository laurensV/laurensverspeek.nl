<template>
  <section class="section">
    <div class="container now-container">
      <p class="overline mb-2">now $ ps aux | grep laurens</p>
      <h1 class="title is-2">Now</h1>
      <p class="subtitle is-5 has-text-grey mb-6">
        What I'm doing these days — last updated
        <span class="is-family-code">{{ now.updated }}</span> from {{ now.location }}.
      </p>

      <div v-for="section in now.sections" :key="section.title" class="mb-5">
        <p class="is-family-code has-text-primary-on-scheme mb-2">./{{ section.title.toLowerCase() }}</p>
        <ul class="now-list">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </div>

      <p class="is-family-code is-size-7 has-text-grey mt-6">
        // also available as the `now` command in the terminal
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { now } from '~/data/now'

useHead({ title: 'Now — Laurens Verspeek' })
useSeoMeta({ description: 'What Laurens Verspeek is building, learning and tinkering with right now.' })
</script>

<style scoped lang="scss">
.now-container {
  max-width: 44rem;
}

.now-list {
  li {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--bulma-border-weak);

    &::before {
      content: '- ';
      font-family: var(--bulma-family-code, monospace);
      color: var(--bulma-primary-on-scheme);
    }
  }
}
</style>
