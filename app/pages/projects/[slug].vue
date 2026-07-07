<template>
  <section class="section">
    <div class="container project-detail">
      <p class="overline mb-2">projects $ cat {{ project.slug }}.md</p>

      <div class="is-flex is-align-items-center is-flex-wrap-wrap mb-2" style="gap: 0.75rem">
        <h1 class="title is-2 mb-0">{{ project.title }}</h1>
        <span class="tag" :class="categoryColor">{{ project.category }}</span>
      </div>

      <p class="is-family-code is-size-6 has-text-grey mb-5">
        <span v-if="project.year">{{ project.year }}</span>
        <span v-if="project.year && project.role"> · </span>
        <span v-if="project.role">{{ project.role }}</span>
      </p>

      <div class="columns">
        <div class="column is-7">
          <div class="content is-medium">
            <p v-for="(paragraph, i) in story" :key="i">{{ paragraph }}</p>
          </div>

          <div class="is-flex is-flex-wrap-wrap mt-5" style="gap: 0.75rem">
            <CmdButton v-if="project.url" :href="project.url" variant="primary">
              <AppIcon name="external" :size="15" />
              visit project
            </CmdButton>
            <CmdButton v-if="project.source" :href="project.source">
              <AppIcon name="code" :size="15" />
              git clone
            </CmdButton>
          </div>
        </div>

        <div class="column is-4 is-offset-1">
          <component
            :is="project.thumbnail && !imageFailed ? 'button' : 'div'"
            class="detail-thumb mb-4"
            :class="{ 'is-zoomable': project.thumbnail && !imageFailed }"
            :aria-label="project.thumbnail && !imageFailed ? 'Enlarge preview' : undefined"
            @click="project.thumbnail && !imageFailed && (lightboxOpen = true)"
          >
            <template v-if="project.thumbnail && !imageFailed">
              <div v-show="!imageLoaded" class="skeleton-block detail-thumb-skeleton" />
              <img
                v-show="imageLoaded"
                :src="project.thumbnailHover ?? project.thumbnail"
                :alt="`${project.title} preview`"
                @load="imageLoaded = true"
                @error="imageFailed = true"
              >
              <span v-show="imageLoaded" class="detail-thumb-zoom is-family-code" aria-hidden="true">[ click to zoom ]</span>
            </template>
            <div v-else class="thumb-fallback is-family-code">
              <span>&lt;{{ project.slug }} /&gt;</span>
            </div>
          </component>
          <p class="is-family-code is-size-7 has-text-grey mb-2">$ cat package.json</p>
          <pre class="detail-pkg is-family-code">{{ packageJson }}</pre>
        </div>
      </div>

      <section v-if="related.length" class="related mt-6">
        <p class="overline mb-3">related $ ls ./{{ project.category }}</p>
        <div class="columns is-multiline">
          <div v-for="rel in related" :key="rel.slug" class="column is-one-third">
            <ProjectCard :project="rel" />
          </div>
        </div>
      </section>

      <nav class="project-nav is-flex is-justify-content-space-between mt-6 pt-5">
        <NuxtLink v-if="previous" :to="`/projects/${previous.slug}`" class="is-family-code">
          ← {{ previous.title }}
        </NuxtLink>
        <NuxtLink to="/projects" class="is-family-code">cd ..</NuxtLink>
        <NuxtLink v-if="next" :to="`/projects/${next.slug}`" class="is-family-code">
          {{ next.title }} →
        </NuxtLink>
      </nav>
    </div>

    <!-- image lightbox -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxOpen" class="lightbox" role="dialog" aria-modal="true" aria-label="Project preview" @click="lightboxOpen = false">
          <button class="lightbox-close" aria-label="Close preview">×</button>
          <img :src="project.thumbnailHover ?? project.thumbnail" :alt="`${project.title} preview`">
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { categories, projects } from '~/data/projects'

const route = useRoute()

const index = projects.findIndex((p) => p.slug === route.params.slug)
if (index === -1) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
}

const project = projects[index]!
const previous = projects[index - 1]
const next = projects[index + 1]

const story = computed(() => project.story ?? [project.description])
const categoryColor = computed(
  () => categories.find((c) => c.value === project.category)?.color ?? 'is-primary'
)

// up to three other projects in the same category
const related = computed(() =>
  projects.filter((p) => p.slug !== project.slug && p.category === project.category).slice(0, 3)
)

// the project's metadata rendered as a package.json — a developer's fact sheet
const packageJson = computed(() => {
  const name = project.slug
  const links: Record<string, string> = {}
  if (project.url) links.homepage = project.url
  if (project.source) links.repository = project.source
  const pkg = {
    name,
    version: project.year?.includes('now') ? '1.0.0-active' : '1.0.0',
    description: project.description,
    category: project.category,
    ...(project.role ? { role: project.role } : {}),
    keywords: project.tech,
    ...links
  }
  return JSON.stringify(pkg, null, 2)
})

const imageLoaded = ref(false)
const imageFailed = ref(false)
const lightboxOpen = ref(false)

onKeyStroke('Escape', () => {
  if (lightboxOpen.value) lightboxOpen.value = false
})

const ogImage = `${SITE_URL}/og/project-${project.slug}.svg`
useHead({ title: `${project.title} — Laurens Verspeek` })
useSeoMeta({
  description: project.description,
  ogTitle: project.title,
  ogDescription: project.description,
  ogType: 'article',
  ogUrl: `${SITE_URL}/projects/${project.slug}`,
  ogImage,
  twitterImage: ogImage,
  twitterTitle: project.title
})

useJsonLd({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: project.title,
  description: project.description,
  url: project.url ?? `${SITE_URL}/projects/${project.slug}`,
  ...(project.source ? { codeRepository: project.source } : {}),
  keywords: project.tech.join(', '),
  author: { '@type': 'Person', name: 'Laurens Verspeek', url: SITE_URL }
})
</script>

<style scoped lang="scss">
.project-detail {
  max-width: 64rem;
}

.detail-thumb {
  display: block;
  width: 100%;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--bulma-border-weak);
  border-radius: var(--bulma-radius-large);
  background-color: var(--bulma-scheme-main-bis);

  &.is-zoomable {
    cursor: zoom-in;

    &:hover .detail-thumb-zoom {
      opacity: 1;
    }

    &:hover img {
      transform: scale(1.03);
    }
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    transition: transform 0.35s ease;
  }

  .detail-thumb-zoom {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    padding: 0.1rem 0.4rem;
    font-size: 0.65rem;
    color: var(--bulma-primary-on-scheme);
    background-color: hsla(var(--lv-scheme-hs), 6%, 0.75);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .detail-thumb-skeleton {
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
}

.detail-pkg {
  padding: 1rem 1.1rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: var(--bulma-radius);
  background-color: var(--bulma-scheme-main-bis);
  color: var(--bulma-text);
  font-size: 0.72rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.related {
  border-top: 1px solid var(--bulma-border-weak);
  padding-top: 1.5rem;
}

.project-nav {
  border-top: 1px solid var(--bulma-border-weak);
  gap: 1rem;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.85);
  backdrop-filter: blur(6px);
  cursor: zoom-out;

  img {
    max-width: min(64rem, 100%);
    max-height: 90vh;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius);
    box-shadow: 0 24px 60px hsla(var(--lv-scheme-hs), 2%, 0.6);
  }

  .lightbox-close {
    position: absolute;
    top: 1.25rem;
    right: 1.5rem;
    border: none;
    background: none;
    color: hsl(var(--lv-scheme-hs), 85%);
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary);
    }
  }
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
