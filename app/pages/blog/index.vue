<template>
  <section class="section">
    <div class="container blog-container">
      <p class="overline mb-2">blog $ ls -t</p>
      <h1 class="title is-2">
        blog<span class="has-text-primary-on-scheme is-family-code">[{{ posts?.length ?? 0 }}]</span>
      </h1>
      <p class="subtitle is-5 has-text-grey mb-6">
        Occasional writing about code, blockchain and this website.
        <a href="/rss.xml" class="is-family-code is-size-7">[rss]</a>
      </p>

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

      <div v-else class="blog-list is-loaded">
        <article v-for="post in posts" :key="post.path" class="blog-entry">
          <p class="is-family-code is-size-7 has-text-grey mb-1">{{ formatDate(post.date) }}</p>
          <h2 class="title is-4 mb-1">
            <NuxtLink :to="post.path" class="blog-link">
              {{ post.title }} <span class="blog-arrow is-family-code">-></span>
            </NuxtLink>
          </h2>
          <p class="has-text-grey">{{ post.description }}</p>
          <div v-if="post.tags?.length" class="tags mt-2">
            <span v-for="tag in post.tags" :key="tag" class="tag is-small is-family-code">
              #{{ tag }}
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
useHead({ title: 'Blog — Laurens Verspeek' })
useSeoMeta({ description: 'Blog of Laurens Verspeek: code, blockchain and website experiments.' })

const { data: posts, pending, error } = await useAsyncData('blog-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
</script>

<style scoped lang="scss">
.blog-container {
  max-width: 44rem;
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
