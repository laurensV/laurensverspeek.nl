<template>
  <div class="project-card">
    <span class="corner is-tl" aria-hidden="true" /><span class="corner is-tr" aria-hidden="true" /><span class="corner is-bl" aria-hidden="true" /><span class="corner is-br" aria-hidden="true" />

    <NuxtLink :to="`/projects/${project.slug}`" class="project-thumb">
      <template v-if="project.thumbnail && !imageFailed">
        <div v-show="!imageLoaded" class="skeleton-block project-thumb-skeleton" />
        <!-- hidden via opacity, not display:none — lazy images inside display:none
             never intersect the viewport and therefore never load -->
        <img
          class="thumb thumb-default"
          :class="{ 'is-loading': !imageLoaded }"
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
      <span class="scanline" aria-hidden="true" />
      <span class="tag category-tag" :class="categoryColor">{{ project.category }}</span>
    </NuxtLink>

    <div class="card-body">
      <p class="is-family-code is-size-7 card-path">
        ~/projects/{{ project.slug }}.md
        <span v-if="stars" class="card-stars" title="GitHub stars">★ {{ stars }}</span>
      </p>
      <p class="title is-5 mb-2">
        <NuxtLink :to="`/projects/${project.slug}`" class="project-title-link" :data-text="project.title">
          {{ project.title }}
        </NuxtLink>
      </p>
      <p class="is-size-6 project-description">{{ project.description }}</p>
      <p class="is-family-code card-tech">
        <span v-for="(tech, i) in project.tech" :key="tech">
          <span class="tech-sep">{{ i === 0 ? '[' : ', ' }}</span>{{ tech }}<span v-if="i === project.tech.length - 1" class="tech-sep">]</span>
        </span>
      </p>
    </div>

    <footer class="card-links is-family-code">
      <a
        v-if="project.source"
        :href="project.source"
        target="_blank"
        rel="noopener"
        class="card-link"
      >
        <span class="card-link-prompt">$</span> git clone
      </a>
      <a
        v-if="project.url"
        :href="project.url"
        target="_blank"
        rel="noopener"
        class="card-link"
      >
        <span class="card-link-prompt">$</span> ./visit
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { categories, type Project } from '~/data/projects'

const props = defineProps<{ project: Project }>()

const imageLoaded = ref(false)
const imageFailed = ref(false)

const { data: github } = useGithubStats()
const stars = computed(() => {
  const repo = githubRepoFromUrl(props.project.source)
  return repo ? github.value?.starsByRepo[repo] : undefined
})

const categoryColor = computed(
  () => categories.find((c) => c.value === props.project.category)?.color ?? 'is-primary'
)
</script>

<style scoped lang="scss">
.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background-color: var(--bulma-scheme-main-bis);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;

  // corner brackets: always faintly present, they light up and reach
  // outward on hover — like a TUI focus frame
  .corner {
    position: absolute;
    width: 0.6rem;
    height: 0.6rem;
    border: 0 solid var(--bulma-border);
    transition: border-color 0.25s ease, transform 0.25s ease;
    pointer-events: none;
    z-index: 2;
  }

  .is-tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
  .is-tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; }
  .is-bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; }
  .is-br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.45);
    // a small lift + shadow, matching the home "what I do" boxes
    transform: translateY(-2px);
    box-shadow: 0 12px 30px hsla(var(--lv-scheme-hs), 4%, 0.32);

    .corner {
      border-color: var(--bulma-primary);
    }

    .is-tl { transform: translate(-3px, -3px); }
    .is-tr { transform: translate(3px, -3px); }
    .is-bl { transform: translate(-3px, 3px); }
    .is-br { transform: translate(3px, 3px); }

    .thumb-hover {
      opacity: 1;
    }

    .scanline {
      animation: card-scan 0.9s ease-out;
    }

    .card-path {
      color: var(--bulma-primary-on-scheme);
    }

    .project-title-link {
      animation: title-glitch 0.35s steps(2, jump-none) 1;
    }
  }
}

.project-thumb {
  display: block;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--bulma-scheme-main-ter);

  .thumb {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;

    &.is-loading {
      opacity: 0;
    }
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
      hsla(var(--lv-primary-hsl), 0.12),
      transparent 75%
    );
  }

  // one bright line sweeps down the image on hover, like a display refresh
  .scanline {
    position: absolute;
    left: 0;
    right: 0;
    top: -12%;
    height: 10%;
    background: linear-gradient(
      to bottom,
      transparent,
      hsla(var(--lv-primary-hsl), 0.35),
      transparent
    );
    opacity: 0;
    pointer-events: none;
  }

  .category-tag {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    text-transform: capitalize;
  }
}

@keyframes card-scan {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(1150%);
  }
}

// quick chromatic split on the title, then back to clean
@keyframes title-glitch {
  0% {
    text-shadow: none;
    transform: none;
  }
  25% {
    text-shadow: -2px 0 #f14668, 2px 0 #3e8ed0;
    transform: translateX(1px);
  }
  60% {
    text-shadow: 2px 0 #f14668, -2px 0 #3e8ed0;
    transform: translateX(-1px);
  }
  100% {
    text-shadow: none;
    transform: none;
  }
}

.card-body {
  flex: 1;
  padding: 1.1rem 1.25rem 0.9rem;
}

.card-path {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--bulma-text-weak);
  transition: color 0.25s ease;

  .card-stars {
    color: var(--bulma-primary-on-scheme);
    white-space: nowrap;
  }
}

.project-title-link {
  display: inline-block;
  color: var(--bulma-text-strong);

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

.project-description {
  color: var(--bulma-text-weak);
}

.card-tech {
  margin-top: 0.75rem;
  font-size: 0.72rem;
  color: var(--bulma-text);

  .tech-sep {
    color: var(--bulma-text-weak);
  }
}

.card-links {
  display: flex;
  border-top: 1px solid var(--bulma-border-weak);
  font-size: 0.78rem;

  .card-link {
    flex: 1;
    padding: 0.65rem 1.25rem;
    color: var(--bulma-text-weak);
    transition: color 0.2s ease, background-color 0.2s ease;

    .card-link-prompt {
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }

    & + .card-link {
      border-left: 1px solid var(--bulma-border-weak);
    }

    &:hover {
      color: var(--bulma-primary-on-scheme);
      background-color: hsla(var(--lv-primary-hsl), 0.08);

      .card-link-prompt {
        opacity: 1;
      }
    }

    // tactile press feedback
    &:active {
      background-color: hsla(var(--lv-primary-hsl), 0.16);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .project-card {
    transition: border-color 0.25s ease;
  }

  .project-card:hover {
    transform: none;

    .corner {
      transform: none;
    }

    .scanline,
    .project-title-link {
      animation: none;
    }
  }
}
</style>
