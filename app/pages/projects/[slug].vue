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
          <div class="detail-thumb mb-4">
            <template v-if="project.thumbnail && !imageFailed">
              <div v-show="!imageLoaded" class="skeleton-block detail-thumb-skeleton" />
              <img
                v-show="imageLoaded"
                :src="project.thumbnailHover ?? project.thumbnail"
                :alt="`${project.title} preview`"
                @load="imageLoaded = true"
                @error="imageFailed = true"
              >
            </template>
            <div v-else class="thumb-fallback is-family-code">
              <span>&lt;{{ project.slug }} /&gt;</span>
            </div>
          </div>
          <p class="is-family-code is-size-7 has-text-grey mb-2">./stack</p>
          <div class="tags">
            <span v-for="tech in project.tech" :key="tech" class="tag is-medium detail-tag">
              {{ tech }}
            </span>
          </div>
        </div>
      </div>

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
  </section>
</template>

<script setup lang="ts">
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

const imageLoaded = ref(false)
const imageFailed = ref(false)

useHead({ title: `${project.title} — Laurens Verspeek` })
useSeoMeta({ description: project.description })
</script>

<style scoped lang="scss">
.project-detail {
  max-width: 64rem;
}

.detail-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--bulma-border-weak);
  border-radius: var(--bulma-radius-large);
  background-color: var(--bulma-scheme-main-bis);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
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
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12),
      transparent 75%
    );
  }
}

.detail-tag {
  border: 1px solid var(--bulma-border-weak);
}

.project-nav {
  border-top: 1px solid var(--bulma-border-weak);
  gap: 1rem;
}
</style>
