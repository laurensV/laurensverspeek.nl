<template>
  <div class="gallery is-family-code">
    <div class="gallery-toolbar">
      <button class="gallery-tool" :disabled="zoom <= MIN_ZOOM" aria-label="Zoom out" title="Zoom out" @click="zoomBy(-1)">−</button>
      <button class="gallery-tool gallery-zoom" :title="zoom === 1 ? 'Fit' : 'Reset zoom'" @click="zoom = 1">{{ Math.round(zoom * 100) }}%</button>
      <button class="gallery-tool" :disabled="zoom >= MAX_ZOOM" aria-label="Zoom in" title="Zoom in" @click="zoomBy(1)">+</button>
      <span class="gallery-toolbar-spacer" />
      <a
        class="gallery-tool"
        :href="current.src"
        :download="downloadName"
        title="Download this image"
        aria-label="Download this image"
      >⤓</a>
    </div>
    <div ref="mainRef" class="gallery-main" :class="{ 'is-zoomed': zoom > 1 }" @wheel.prevent="onWheel">
      <img
        :src="current.src"
        :alt="current.label"
        class="gallery-image"
        :style="zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none' } : undefined"
        draggable="false"
      >
    </div>
    <div class="gallery-bar">
      <button class="gallery-nav" aria-label="Previous" @click="step(-1)">‹</button>
      <span class="gallery-label">{{ current.label }} · {{ index + 1 }}/{{ images.length }}</span>
      <button class="gallery-nav" aria-label="Next" @click="step(1)">›</button>
    </div>
    <button class="gallery-wallpaper" @click="setAsWallpaper">
      {{ wallpaperSet ? '✓ set as wallpaper' : 'set as wallpaper' }}
    </button>
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
import { storageGetJson, isStringArray } from '~/utils/safeStorage'

// An image viewer over the site's own generated art (OG cards + project
// covers) plus lvOS screenshots — with zoom (buttons or ctrl+wheel, drag to
// pan via the scroll container) and a download button.

const shots = storageGetJson('lvos-shots', isStringArray) ?? []

const images = [
  ...shots.map((src, i) => ({ src, label: `screenshot ${shots.length - i}` })),
  { src: '/og/default.svg', label: 'laurensverspeek.nl' },
  { src: '/og/life.svg', label: 'game of life' },
  { src: '/og/desktop.svg', label: 'lvOS' },
  ...projects.map((p) => ({ src: `/og/project-${p.slug}.svg`, label: p.title }))
]

const { setCustomWallpaper } = useWallpaper()
const wallpaperSet = ref(false)
const setAsWallpaper = () => {
  wallpaperSet.value = setCustomWallpaper(current.value.src)
}

const index = ref(0)
const current = computed(() => images[index.value]!)
watch(index, () => {
  wallpaperSet.value = false
  zoom.value = 1
})
const step = (delta: number) => {
  index.value = (index.value + delta + images.length) % images.length
}

// ---- zoom ----
const MIN_ZOOM = 1
const MAX_ZOOM = 6
const zoom = ref(1)
const mainRef = ref<HTMLElement>()

const zoomBy = (direction: number) => {
  const next = zoom.value * (direction > 0 ? 1.25 : 0.8)
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100))
}

// wheel zooms (trackpad pinch arrives as ctrl+wheel; plain wheel zooms too —
// the container has nothing else to scroll until you're zoomed in)
const onWheel = (event: WheelEvent) => {
  if (zoom.value > 1 && !event.ctrlKey) {
    // when zoomed, plain wheel pans the scroll container instead
    mainRef.value?.scrollBy({ left: event.deltaX, top: event.deltaY })
    return
  }
  zoomBy(event.deltaY < 0 ? 1 : -1)
}

// screenshots are data URLs; site art keeps its own filename
const downloadName = computed(() => {
  if (current.value.src.startsWith('data:')) return `${current.value.label.replace(/\s+/g, '-')}.png`
  return current.value.src.split('/').pop() ?? 'image'
})
</script>

<style scoped lang="scss">
.gallery {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(30rem, 70vw);
}

.gallery-toolbar {
  display: flex;
  align-items: center;
  gap: 0.3rem;

  .gallery-toolbar-spacer {
    flex: 1;
  }

  .gallery-tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.7rem;
    height: 1.7rem;
    padding: 0 0.4rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.85rem;
    line-height: 1;
    cursor: pointer;
    text-decoration: none;

    &:hover:not(:disabled) {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }
  }

  .gallery-zoom {
    font-size: 0.68rem;
    color: hsl(var(--lv-scheme-hs), 70%);
  }

  // thumb-sized zoom/tool buttons on touch
  @media (pointer: coarse) {
    .gallery-tool {
      min-width: 2.4rem;
      height: 2.4rem;
    }
  }
}

.gallery-main {
  aspect-ratio: 1200 / 630;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.25);
  border-radius: var(--bulma-radius-small);
  overflow: hidden;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.5);

  &.is-zoomed {
    overflow: auto;
    cursor: grab;
  }
}

.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: contain;

  // when zoomed the inline width takes over and the height follows
  .is-zoomed & {
    height: auto;
    object-fit: unset;
  }
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

.gallery-wallpaper {
  align-self: center;
  margin-top: 0.4rem;
  padding: 0.25rem 0.7rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}
</style>
