<template>
  <section class="section">
    <div class="container uses-container">
      <p class="overline mb-2">uses $ which --all</p>
      <h1 class="title is-2">Uses</h1>
      <p class="subtitle is-5 has-text-grey mb-6">
        The gear, software and stack I use to build things.
        Inspired by <a href="https://uses.tech" target="_blank" rel="noopener">uses.tech</a>.
      </p>

      <div v-for="group in uses" :key="group.group" class="mb-6">
        <p class="is-family-code has-text-primary-on-scheme mb-3">./{{ kebab(group.group) }}</p>
        <div class="columns is-multiline">
          <div v-for="item in group.items" :key="item.name" class="column is-half">
            <div class="box uses-item">
              <p class="has-text-weight-semibold">
                <a v-if="item.url" :href="item.url" target="_blank" rel="noopener">
                  {{ item.name }}
                </a>
                <template v-else>{{ item.name }}</template>
              </p>
              <p v-if="item.note" class="is-size-6 has-text-grey">{{ item.note }}</p>
            </div>
          </div>
        </div>
      </div>

      <p class="is-family-code is-size-7 has-text-grey">
        // also available as the `uses` command in the terminal
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { uses } from '~/data/uses'

useHead({ title: 'Uses — Laurens Verspeek' })
useSeoMeta({ description: 'The gear, software and stack Laurens Verspeek uses to build things.' })

const kebab = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
</script>

<style scoped lang="scss">
.uses-container {
  max-width: 56rem;
}

.uses-item {
  height: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid var(--bulma-border-weak);
  transition: border-color 0.25s ease;

  &:hover {
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.5);
  }
}
</style>
