<template>
  <div class="gallery is-family-code">
    <div class="gallery-main">
      <img :src="current.src" :alt="current.label" class="gallery-image">
    </div>
    <div class="gallery-bar">
      <button class="gallery-nav" aria-label="Previous" @click="step(-1)">‹</button>
      <span class="gallery-label">{{ current.label }} · {{ index + 1 }}/{{ images.length }}</span>
      <button class="gallery-nav" aria-label="Next" @click="step(1)">›</button>
    </div>
    <div class="gallery-thumbs">
      <button
        v-for="(img, i) in images"
        :key="img.src"
        class="gallery-thumb"
        :class="{ 'is-active': i === index }"
        :aria-label="img.label"
        @click="index = i"
      >
        <img :src="img.src" :alt="img.label">
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

// A small image viewer over the site's own generated art (OG cards + project
// covers) — every one of these is a real prerendered asset in /og.

const images = [
  { src: '/og/default.svg', label: 'laurensverspeek.nl' },
  { src: '/og/life.svg', label: 'game of life' },
  { src: '/og/desktop.svg', label: 'lvOS' },
  ...projects.map((p) => ({ src: `/og/project-${p.slug}.svg`, label: p.title }))
]

const index = ref(0)
const current = computed(() => images[index.value]!)
const step = (delta: number) => {
  index.value = (index.value + delta + images.length) % images.length
}
</script>

<style scoped lang="scss">
.gallery {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(30rem, 70vw);
}

.gallery-main {
  aspect-ratio: 1200 / 630;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.25);
  border-radius: var(--bulma-radius-small);
  overflow: hidden;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.5);
}

.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gallery-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;

  .gallery-label {
    color: hsl(var(--lv-scheme-hs), 80%);
  }

  .gallery-nav {
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }
  }
}

.gallery-thumbs {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;

  .gallery-thumb {
    flex: 0 0 auto;
    width: 3.4rem;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 2px;
    background: none;
    cursor: pointer;
    overflow: hidden;
    line-height: 0;

    img {
      width: 100%;
    }

    &.is-active {
      border-color: var(--bulma-primary);
    }
  }
}
</style>
