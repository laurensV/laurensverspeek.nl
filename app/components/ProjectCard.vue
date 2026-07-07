<template>
  <div
    ref="cardRef"
    class="card project-card"
    :style="tiltStyle"
    @pointermove="onTilt"
    @pointerleave="resetTilt"
  >
    <div class="card-image project-thumb">
      <template v-if="project.thumbnail && !imageFailed">
        <div v-show="!imageLoaded" class="skeleton-block project-thumb-skeleton" />
        <img
          v-show="imageLoaded"
          class="thumb thumb-default"
          :src="project.thumbnail"
          :alt="`${project.title} thumbnail`"
          loading="lazy"
          @load="imageLoaded = true"
          @error="imageFailed = true"
        >
        <img
          v-if="project.thumbnailHover && imageLoaded"
          class="thumb thumb-hover"
          :src="project.thumbnailHover"
          :alt="`${project.title} preview`"
          loading="lazy"
        >
      </template>
      <div v-else class="thumb-fallback is-family-code">
        <span>&lt;{{ project.slug }} /&gt;</span>
      </div>
      <span class="tag category-tag" :class="categoryColor">{{ project.category }}</span>
    </div>

    <div class="card-content">
      <p class="title is-5 mb-2">{{ project.title }}</p>
      <p class="is-size-6 has-text-grey project-description">{{ project.description }}</p>
      <div class="tags mt-3 mb-0">
        <span v-for="tech in project.tech" :key="tech" class="tag is-small tech-tag is-family-code">
          {{ tech }}
        </span>
      </div>
    </div>

    <footer class="card-footer">
      <a
        v-if="project.source"
        :href="project.source"
        target="_blank"
        rel="noopener"
        class="card-footer-item project-link"
      >
        <AppIcon name="code" :size="15" />
        <span class="ml-2">Source</span>
      </a>
      <a
        v-if="project.url"
        :href="project.url"
        target="_blank"
        rel="noopener"
        class="card-footer-item project-link"
      >
        <AppIcon name="external" :size="15" />
        <span class="ml-2">Visit</span>
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { categories, type Project } from '~/data/projects'

const props = defineProps<{ project: Project }>()

const imageLoaded = ref(false)
const imageFailed = ref(false)

const categoryColor = computed(
  () => categories.find((c) => c.value === props.project.category)?.color ?? 'is-primary'
)

// Subtle 3D tilt following the cursor
const cardRef = ref<HTMLElement>()
const tilt = ref({ x: 0, y: 0 })
const reducedMotion = usePreferredReducedMotion()

const tiltStyle = computed(() => ({
  transform: `perspective(800px) rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`
}))

const onTilt = (event: PointerEvent) => {
  if (reducedMotion.value === 'reduce' || event.pointerType !== 'mouse') return
  const rect = cardRef.value?.getBoundingClientRect()
  if (!rect) return
  const px = (event.clientX - rect.left) / rect.width - 0.5
  const py = (event.clientY - rect.top) / rect.height - 0.5
  tilt.value = { x: -py * 5, y: px * 5 }
}

const resetTilt = () => {
  tilt.value = { x: 0, y: 0 }
}
</script>

<style scoped lang="scss">
.project-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--bulma-border-weak);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
  will-change: transform;

  &:hover {
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.5);
    box-shadow: 0 8px 32px
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12);

    .thumb-hover {
      opacity: 1;
    }
  }
}

.project-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--bulma-radius-large) var(--bulma-radius-large) 0 0;
  background-color: var(--bulma-scheme-main-bis);

  .thumb {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  .thumb-hover {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .project-thumb-skeleton {
    position: absolute;
    inset: 0;
    height: 100%;
  }

  .thumb-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--bulma-primary-on-scheme);
    background: radial-gradient(
      ellipse at center,
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12),
      transparent 75%
    );
  }

  .category-tag {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    text-transform: capitalize;
  }
}

.card-content {
  flex: 1;
}

.project-description {
  color: var(--bulma-text-weak);
}

.tech-tag {
  font-size: 0.7rem;
}

.project-link {
  color: var(--bulma-text-weak);
  transition: color 0.2s, background-color 0.2s;

  &:hover {
    color: var(--bulma-primary-invert);
    background-color: var(--bulma-primary);
  }
}
</style>
