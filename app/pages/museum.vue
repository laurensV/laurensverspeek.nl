<template>
  <section class="section">
    <div class="container museum-container">
      <p class="overline mb-2">museum $ tour --all</p>
      <h1 class="title is-2">The Museum</h1>
      <p class="subtitle is-5 has-text-grey mb-2">
        Every feature and easter egg this site ships, catalogued like exhibits.
      </p>
      <p class="is-family-code is-size-7 has-text-grey mb-4">
        {{ exhibitCount }} pieces on display · admission free · flash photography encouraged
      </p>

      <div class="museum-modes mb-5 is-family-code">
        <button class="museum-mode" :class="{ 'is-active': mode === 'catalog' }" @click="mode = 'catalog'">[ catalog ]</button>
        <button class="museum-mode" :class="{ 'is-active': mode === 'walk' }" @click="mode = 'walk'">[ walk the floor ]</button>
      </div>

      <ClientOnly v-if="mode === 'walk'">
        <MuseumWalk />
      </ClientOnly>

      <RevealBlock v-for="(wing, wi) in museum" v-show="mode === 'catalog'" :key="wing.title" :delay="wi * 60" class="mb-6">
        <p class="is-family-code has-text-primary-on-scheme mb-1">
          ## {{ wing.title }}
        </p>
        <p class="is-size-7 has-text-grey mb-3 museum-intro">{{ wing.intro }}</p>
        <div class="columns is-multiline">
          <div v-for="exhibit in wing.exhibits" :key="exhibit.name" class="column is-half">
            <div class="museum-plaque">
              <p class="museum-name">
                {{ exhibit.name }}
                <span class="museum-how is-family-code">{{ exhibit.how }}</span>
              </p>
              <p class="museum-blurb">{{ exhibit.blurb }}</p>
            </div>
          </div>
        </div>
      </RevealBlock>

      <p class="is-family-code is-size-7 has-text-grey">
        // the gift shop is the <NuxtLink to="/contact">contact page</NuxtLink> —
        and `secrets` in the terminal lists what this label left out
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { museum, exhibitCount } from '~/data/museum'

// two ways through the collection: the catalog, or walking the actual floor
const mode = ref<'catalog' | 'walk'>('catalog')

const ogImage = `${SITE_URL}/og/page-museum.svg`
useHead({ title: 'The Museum — Laurens Verspeek' })
useSeoMeta({
  description: 'Every feature and easter egg on laurensverspeek.nl, catalogued like museum exhibits.',
  ogTitle: 'The Museum',
  ogUrl: `${SITE_URL}/museum`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
</script>

<style scoped lang="scss">
.museum-container {
  max-width: 60rem;
}

.museum-intro {
  font-style: italic;
}

.museum-modes {
  display: flex;
  gap: 0.75rem;
}

.museum-mode {
  padding: 0.3rem 0.2rem;
  border: none;
  background: none;
  color: var(--bulma-text-weak);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;

  &.is-active,
  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

.museum-plaque {
  height: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--bulma-border-weak);
  border-left: 3px solid hsla(var(--lv-primary-hsl), 0.55);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 50%, 0.03);
}

.museum-name {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.3rem;
  font-weight: 600;
  color: var(--bulma-text-strong);
}

.museum-how {
  font-size: 0.68rem;
  font-weight: 400;
  padding: 0.05rem 0.45rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-small);
  color: var(--bulma-primary-on-scheme);
  white-space: nowrap;
}

.museum-blurb {
  font-size: 0.85rem;
  color: var(--bulma-text);
  line-height: 1.55;
}
</style>
