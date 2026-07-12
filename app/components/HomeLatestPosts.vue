<template>
  <section v-if="pendingPosts || latestPosts?.length" class="section">
    <div class="container">
      <RevealBlock>
        <div class="is-flex is-align-items-baseline is-justify-content-space-between mb-5">
          <div>
            <p class="overline mb-2">blog $ tail -2</p>
            <h2 class="title is-3">Latest writing</h2>
          </div>
          <NuxtLink to="/blog" class="see-all is-family-code is-size-6 is-hidden-mobile">
            all posts <span class="see-all-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </div>

        <div v-if="pendingPosts" class="latest-posts" aria-hidden="true">
          <div v-for="i in 2" :key="i" class="latest-post is-loading">
            <span class="is-skeleton is-size-7 latest-post-date">2026 Jan 01</span>
            <span class="is-skeleton latest-post-title">Loading a recent post title</span>
          </div>
        </div>

        <div v-else class="latest-posts is-loaded">
          <NuxtLink
            v-for="post in latestPosts"
            :key="post.path"
            :to="post.path"
            class="latest-post"
          >
            <span class="is-family-code is-size-7 latest-post-date">{{ formatDate(post.date) }}</span>
            <span class="latest-post-title">{{ post.title }}</span>
            <span class="is-family-code latest-post-arrow">-></span>
          </NuxtLink>
        </div>
      </RevealBlock>
    </div>
  </section>
</template>

<script setup lang="ts">
// The two most recent blog posts on the homepage; the section hides itself if
// the blog is empty or the fetch fails.
const { data: latestPosts, pending: pendingPosts } = useLazyAsyncData('latest-posts', () =>
  queryCollection('blog').order('date', 'DESC').limit(2).all()
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
</script>

<style scoped lang="scss">
.latest-posts {
  display: flex;
  flex-direction: column;

  // fade the resolved list in so it doesn't pop after the skeleton
  &.is-loaded {
    animation: list-fade-in 0.35s ease;
  }
}

@keyframes list-fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .latest-posts.is-loaded {
    animation: none;
  }
}

.latest-post {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text);

  &:first-child {
    border-top: 1px solid var(--bulma-border-weak);
  }

  .latest-post-date {
    flex-shrink: 0;
    color: var(--bulma-text-weak);
  }

  .latest-post-title {
    font-weight: 600;
  }

  .latest-post-arrow {
    margin-left: auto;
    color: var(--bulma-primary-on-scheme);
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  &:hover {
    color: var(--bulma-primary-on-scheme);

    .latest-post-arrow {
      opacity: 1;
      transform: none;
    }
  }
}

@media screen and (max-width: 768px) {
  .latest-post {
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
  }
}
</style>
