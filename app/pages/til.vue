<template>
  <section class="section">
    <div class="container til-container">
      <p class="overline mb-2">til $ cat *.md</p>
      <h1 class="title is-2">
        til<span class="has-text-primary-on-scheme is-family-code">[{{ entries?.length ?? 0 }}]</span>
      </h1>
      <p class="subtitle is-5 has-text-grey mb-4">
        Today I Learned — short notes on things worth remembering.
      </p>
      <div class="rss-nudge is-family-code is-size-7 mb-6">
        <AppIcon name="rss" :size="13" />
        <span>subscribe:</span>
        <a href="/til.xml" class="rss-open">open feed</a>
        <span class="rss-sep">·</span>
        <button class="rss-copy" :class="{ 'is-copied': copied }" @click="copyFeed">
          {{ copied ? 'copied ✓' : 'copy til url' }}
        </button>
      </div>

      <div v-if="pending" class="til-list" aria-hidden="true">
        <div v-for="i in 3" :key="i" class="til-entry">
          <p class="is-skeleton is-size-7 mb-1" style="max-width: 7rem">2026 Jan 01</p>
          <p class="is-skeleton title is-5 mb-1" style="max-width: 20rem">Loading a TIL title</p>
          <p class="is-skeleton" style="max-width: 30rem">Loading a couple of short lines here</p>
        </div>
      </div>

      <div v-else-if="error" class="notification is-danger is-light is-family-code">
        cat: til/: input/output error — entries failed to load, try a refresh.
      </div>

      <div v-else-if="!entries?.length" class="is-family-code has-text-grey">
        <p>ls: til/: empty directory</p>
      </div>

      <div v-else class="til-list">
        <article v-for="entry in entries" :id="anchorId(entry.id)" :key="entry.id" class="til-entry">
          <p class="is-family-code is-size-7 has-text-grey mb-1">{{ formatDate(entry.date) }}</p>
          <h2 class="title is-5 mb-2">{{ entry.title }}</h2>
          <div class="content til-body">
            <ContentRenderer :value="entry" />
          </div>
          <div v-if="entry.tags?.length" class="tags mt-3">
            <span v-for="tag in entry.tags" :key="tag" class="tag is-family-code">#{{ tag }}</span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { data: entries, pending, error } = await useAsyncData('til-entries', () =>
  queryCollection('til').order('date', 'DESC').all()
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })

// a clean anchor slug from the file id (til/til/2026-…-thing.md → 2026-…-thing)
const anchorId = (id: string) => id.split('/').pop()?.replace(/\.md$/, '') ?? id

const { copied, copy } = useCopyFlag()
const copyFeed = () => copy(`${SITE_URL}/til.xml`)

const ogImage = `${SITE_URL}/og/page-til.png`
useHead({ title: 'TIL — Laurens Verspeek' })
useSeoMeta({
  description: 'Today I Learned — short notes on things worth remembering.',
  ogTitle: 'TIL — Laurens Verspeek',
  ogDescription: 'Short notes on things worth remembering.',
  ogUrl: `${SITE_URL}/til`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})
</script>

<style scoped lang="scss">
.til-container {
  max-width: 46rem;
}

.til-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.til-entry {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bulma-border);

  &:last-child {
    border-bottom: none;
  }
}

.til-body {
  color: var(--bulma-text);
}

.rss-nudge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--bulma-text-weak);

  .rss-open,
  .rss-copy {
    color: var(--bulma-primary);
  }

  .rss-copy {
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;

    &.is-copied {
      color: var(--bulma-success);
    }
  }

  .rss-sep {
    opacity: 0.5;
  }
}

.tags .tag {
  background: hsla(var(--lv-primary-hsl), 0.12);
  color: var(--bulma-primary);
}
</style>
