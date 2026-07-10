<template>
  <section class="section">
    <div class="container uses-container">
      <p class="overline mb-2">uses $ which --all</p>
      <h1 class="title is-2">Uses</h1>
      <p class="subtitle is-5 has-text-grey mb-2">
        The gear, software and stack I use to build things.
      </p>
      <p class="is-family-code is-size-7 has-text-grey mb-6">
        {{ totalItems }} packages installed, 0 vulnerabilities found
      </p>

      <RevealBlock v-for="(group, gi) in uses" :key="group.group" :delay="gi * 80" class="mb-6">
        <p class="is-family-code has-text-primary-on-scheme mb-3">./{{ kebab(group.group) }}</p>
        <div class="columns is-multiline">
          <div v-for="item in group.items" :key="item.name" class="column is-half">
            <component
              :is="item.url ? 'a' : 'div'"
              v-bind="item.url ? { href: item.url, target: '_blank', rel: 'noopener' } : {}"
              class="uses-item"
            >
              <span class="uses-icon">
                <AppIcon :name="item.icon ?? 'box'" :size="20" />
              </span>
              <span class="uses-text">
                <span class="uses-name">
                  {{ item.name }}
                  <AppIcon v-if="item.url" name="external" :size="12" class="uses-ext" />
                </span>
                <span v-if="item.note" class="uses-note">{{ item.note }}</span>
              </span>
              <span class="uses-status is-family-code" aria-hidden="true">
                <span class="status-idle">[--]</span>
                <span class="status-ok">[ok]</span>
              </span>
            </component>
          </div>
        </div>
      </RevealBlock>

      <p class="is-family-code is-size-7 has-text-grey">
        // also available as the `uses` command in the terminal
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { uses } from '~/data/uses'

useHead({ title: 'Uses — Laurens Verspeek' })
const ogImage = `${SITE_URL}/og/page-uses.svg`
useSeoMeta({
  description: 'The gear, software and stack Laurens Verspeek uses to build things.',
  ogUrl: `${SITE_URL}/uses`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

const kebab = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const totalItems = uses.reduce((sum, group) => sum + group.items.length, 0)
</script>

<style scoped lang="scss">
.uses-container {
  max-width: 56rem;
}

.uses-item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  height: 100%;
  padding: 0.9rem 1.1rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  color: inherit;
  transition: border-color 0.25s ease, background-color 0.25s ease;

  .uses-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.4rem;
    height: 2.4rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 2px;
    color: var(--bulma-text-weak);
    transition: color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .uses-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .uses-name {
    font-weight: 600;
    color: var(--bulma-text-strong);

    .uses-ext {
      color: var(--bulma-text-weak);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
  }

  .uses-note {
    font-size: 0.85rem;
    color: var(--bulma-text-weak);
  }

  // health check in the corner: [--] flips to a primary [ok] on hover
  .uses-status {
    position: relative;
    margin-left: auto;
    flex-shrink: 0;
    font-size: 0.7rem;
    color: var(--bulma-text-weak);

    .status-ok {
      position: absolute;
      inset: 0;
      color: var(--bulma-primary-on-scheme);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .status-idle {
      transition: opacity 0.2s ease;
    }
  }

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.5);
    background-color: hsla(var(--lv-primary-hsl), 0.04);

    .uses-icon {
      color: var(--bulma-primary-on-scheme);
      border-color: hsla(var(--lv-primary-hsl), 0.5);
      box-shadow: 0 0 14px hsla(var(--lv-primary-hsl), 0.25);
    }

    .uses-ext {
      opacity: 1;
    }

    .status-idle {
      opacity: 0;
    }

    .status-ok {
      opacity: 1;
    }
  }
}
</style>
