<template>
  <div class="blog-app">
    <!-- reader -->
    <template v-if="post">
      <div class="blog-app-bar is-family-code">
        <button class="blog-back" @click="selectedPath = null">&lt;- cd ..</button>
        <span class="blog-file">{{ slugOf(post.path) }}.md</span>
      </div>
      <p class="is-family-code has-text-primary-on-scheme mb-1"># {{ override?.title ?? post.title }}</p>
      <p class="is-family-code blog-meta mb-3">
        {{ override?.date || post.date }}<template v-if="post.tags?.length"> · {{ post.tags.map((t) => `#${t}`).join(' ') }}</template>
        <template v-if="override"> · ✎ your edit (reseed blog/{{ slugOf(post.path) }}.md restores)</template>
      </p>
      <div class="content is-small blog-body">
        <!-- overrides come from markdownLite, which escapes every text node
             before adding markup — same trust story as the terminal output -->
        <div v-if="override" v-html="override.html" />
        <ContentRenderer v-else :value="post" />
      </div>
    </template>

    <!-- list -->
    <template v-else>
      <p v-if="pending" class="is-family-code blog-meta">loading ~/blog ...</p>
      <p v-else-if="!posts?.length" class="is-family-code blog-meta">ls: blog/: empty directory</p>
      <template v-else>
        <button
          v-for="entry in posts"
          :key="entry.path"
          class="blog-entry is-family-code"
          @click="selectedPath = entry.path"
        >
          <AppIcon name="book" :size="14" />
          <span class="blog-entry-title">
            <span>{{ slugOf(entry.path) }}.md<span v-if="editedSlugs.includes(slugOf(entry.path))" class="blog-entry-edited"> ✎ edited</span></span>
            <span class="blog-entry-desc">{{ entry.description }}</span>
          </span>
          <span class="blog-entry-date">{{ entry.date }}</span>
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
// lvOS blog reader: renders the actual markdown posts inside a desktop window.

const props = defineProps<{ openPath?: string | null }>()

const selectedPath = ref<string | null>(props.openPath ?? null)

watch(
  () => props.openPath,
  (path) => (selectedPath.value = path ?? null)
)

const { data: posts, pending } = useLazyAsyncData('desktop-blog-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const post = computed(
  () => posts.value?.find((p) => p.path === selectedPath.value) ?? null
)

const slugOf = (path: string) => path.split('/').pop() ?? path

// posts edited via the terminal replace the rendered copy here too
const { overrideFor, editedSlugs } = useBlogOverrides()
const override = computed(() =>
  post.value ? overrideFor(slugOf(post.value.path)) : null
)
</script>

<style scoped lang="scss">
.blog-app {
  font-size: 0.82rem;
}

.blog-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.72rem;

  .blog-back {
    border: none;
    background: none;
    padding: 0;
    color: var(--bulma-primary);
    font: inherit;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .blog-file {
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.blog-meta {
  font-size: 0.72rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}

.blog-entry-edited {
  color: var(--bulma-primary);
  font-size: 0.65rem;
}

.blog-entry {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;

  .blog-entry-title {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .blog-entry-desc {
      font-size: 0.68rem;
      color: hsl(var(--lv-scheme-hs), 55%);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .blog-entry-date {
    margin-left: auto;
    flex-shrink: 0;
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}

// the lvOS window is always dark — pin readable colors regardless of site theme
.blog-body {
  color: hsl(var(--lv-scheme-hs), 85%);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(strong) {
    color: hsl(var(--lv-scheme-hs), 95%);
  }

  :deep(a) {
    color: var(--bulma-primary);
  }

  :deep(pre) {
    padding: 0.75rem;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
    border-radius: var(--bulma-radius-small);
    background-color: hsl(var(--lv-scheme-hs), 6%);
    color: hsl(var(--lv-scheme-hs), 85%);
    font-size: 0.72rem;
  }

  :deep(code):not(pre code) {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
    color: var(--bulma-primary);
  }
}
</style>
