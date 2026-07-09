<template>
  <section class="section">
    <div class="container blog-container">
      <p class="overline mb-2">blog $ ls -t</p>
      <h1 class="title is-2">
        blog<span class="has-text-primary-on-scheme is-family-code">[{{ filtered.length }}]</span>
      </h1>
      <p class="subtitle is-5 has-text-grey mb-4">
        Occasional writing about code, blockchain and this website.
      </p>
      <div class="rss-nudge is-family-code is-size-7 mb-6">
        <AppIcon name="rss" :size="13" />
        <span>subscribe:</span>
        <a href="/rss.xml" class="rss-open">open feed</a>
        <span class="rss-sep">·</span>
        <button class="rss-copy" :class="{ 'is-copied': copied }" @click="copyFeed">
          {{ copied ? 'copied ✓' : 'copy rss url' }}
        </button>
      </div>

      <div v-if="pending" class="blog-list" aria-hidden="true">
        <div v-for="i in 3" :key="i" class="blog-entry">
          <p class="is-skeleton is-size-7 mb-1" style="max-width: 7rem">2026 Jan 01</p>
          <p class="is-skeleton title is-4 mb-1" style="max-width: 22rem">Loading a post title here</p>
          <p class="is-skeleton" style="max-width: 32rem">Loading a short description for this post</p>
        </div>
      </div>

      <div v-else-if="error" class="notification is-danger is-light is-family-code">
        cat: blog/: input/output error — posts failed to load, try a refresh.
      </div>

      <div v-else-if="!posts?.length" class="is-family-code has-text-grey">
        <p>ls: blog/: empty directory</p>
        <p class="is-size-7 mt-2">// first post coming soon(ish) — and this time I mean it</p>
      </div>

      <template v-else>
        <div v-if="activeTag" class="tag-filter is-family-code is-size-7 mb-5">
          <span class="tag-filter-cmd">$ ls -t | grep '#{{ activeTag }}'</span>
          <button class="tag-clear" @click="setTag('')">[clear]</button>
        </div>

        <p v-if="!filtered.length" class="is-family-code has-text-grey">
          grep: no posts tagged #{{ activeTag }}
        </p>

        <div class="blog-list is-loaded">
          <article v-for="post in filtered" :key="post.path" class="blog-entry">
            <p class="is-family-code is-size-7 has-text-grey mb-1">{{ formatDate(post.date) }}</p>
            <h2 class="title is-4 mb-1" :style="{ viewTransitionName: transitionName(post.path) }">
              <NuxtLink :to="post.path" class="blog-link">
                {{ post.title }} <span class="blog-arrow is-family-code">-></span>
              </NuxtLink>
            </h2>
            <p class="has-text-grey">{{ post.description }}</p>
            <div v-if="post.tags?.length" class="tags mt-2">
              <button
                v-for="tag in post.tags"
                :key="tag"
                class="tag is-small is-family-code tag-btn"
                :class="{ 'is-active': tag === activeTag }"
                :style="{ '--tag-h': tagHue(tag) }"
                :aria-pressed="tag === activeTag"
                @click="setTag(tag)"
              >
                #{{ tag }}
              </button>
            </div>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { tagHue } from '~/utils/tagHue'

useHead({ title: 'Blog — Laurens Verspeek' })
useSeoMeta({ description: 'Blog of Laurens Verspeek: code, blockchain and website experiments.' })

const { data: posts, pending, error } = await useAsyncData('blog-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })

// tag filtering, kept shareable in the URL (?tag=games); clicking the active
// tag (or [clear]) removes the filter again
const route = useRoute()
const router = useRouter()
const activeTag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))
const setTag = (tag: string) => {
  router.replace({ query: tag && tag !== activeTag.value ? { tag } : {} })
}
const filtered = computed(() => {
  const all = posts.value ?? []
  return activeTag.value ? all.filter((post) => post.tags?.includes(activeTag.value)) : all
})

// shared-element morph: the list title and the post h1 carry the same name
const transitionName = (path: string) => `post-${path.split('/').pop()}`

// copy the absolute RSS feed URL to paste into a reader
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
const copyFeed = () => {
  if (!import.meta.client) return
  navigator.clipboard?.writeText(`${SITE_URL}/rss.xml`).then(() => {
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), 1800)
  }).catch(() => {})
}
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<style scoped lang="scss">
.blog-container {
  max-width: 44rem;
}

// subtle "subscribe via RSS" affordance
.rss-nudge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  color: var(--bulma-text-weak);

  .rss-open,
  .rss-copy {
    color: var(--bulma-primary-on-scheme);
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }

  .rss-copy.is-copied {
    color: var(--bulma-success);
  }

  .rss-sep {
    opacity: 0.5;
  }
}

// active filter banner, styled as the shell command it pretends to be
.tag-filter {
  display: flex;
  align-items: center;
  gap: 0.7rem;

  .tag-filter-cmd {
    color: var(--bulma-primary-on-scheme);
  }

  .tag-clear {
    border: none;
    background: none;
    padding: 0;
    color: var(--bulma-text-weak);
    font: inherit;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      color: var(--bulma-primary-on-scheme);
    }
  }
}

.tag-btn {
  // each tag wears its own stable tint (hue set inline via --tag-h)
  border: 1px solid hsla(var(--tag-h, 44), 60%, 50%, 0.25);
  background-color: hsla(var(--tag-h, 44), 60%, 50%, 0.08);
  color: hsl(var(--tag-h, 44), 45%, 52%);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: var(--bulma-primary-on-scheme);
    border-color: hsla(var(--lv-primary-hsl), 0.5);
  }

  &.is-active {
    color: var(--bulma-primary-on-scheme);
    border-color: hsla(var(--lv-primary-hsl), 0.7);
    background-color: hsla(var(--lv-primary-hsl), 0.12);
  }
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;

  // fade the resolved list in so it doesn't pop after the skeleton
  &.is-loaded {
    animation: blog-list-in 0.35s ease;
  }
}

@keyframes blog-list-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-list.is-loaded {
    animation: none;
  }
}

.blog-link {
  color: var(--bulma-text-strong);

  .blog-arrow {
    color: var(--bulma-primary-on-scheme);
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    display: inline-block;
  }

  &:hover {
    color: var(--bulma-primary-on-scheme);

    .blog-arrow {
      opacity: 1;
      transform: translateX(4px);
    }
  }
}
</style>
