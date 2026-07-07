<template>
  <section class="section">
    <div class="container post-container">
      <p class="overline mb-4">blog $ cat {{ route.params.slug }}.md</p>

      <template v-if="post">
        <h1 class="title is-2 mb-2">{{ post.title }}</h1>
        <p class="is-family-code is-size-7 has-text-grey mb-6">
          {{ formatDate(post.date) }} · {{ readingTime }} min read
          <template v-if="post.tags?.length">
            · <span v-for="tag in post.tags" :key="tag" class="mr-1">#{{ tag }}</span>
          </template>
        </p>

        <div class="content is-medium post-body">
          <ContentRenderer :value="post" />
        </div>

        <nav class="post-nav is-family-code is-size-7 mt-6 pt-5">
          <NuxtLink v-if="surround?.[0]" :to="surround[0].path" class="post-nav-link">
            &lt;- {{ surround[0].title }}
          </NuxtLink>
          <NuxtLink to="/blog" class="post-nav-link">cd ../blog</NuxtLink>
          <NuxtLink v-if="surround?.[1]" :to="surround[1].path" class="post-nav-link">
            {{ surround[1].title }} -&gt;
          </NuxtLink>
        </nav>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryCollection('blog').path(route.path).first()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const { data: surround } = await useAsyncData(`blog-surround-${route.params.slug}`, () =>
  queryCollectionItemSurroundings('blog', route.path, { fields: ['title'] })
)

useHead({ title: `${post.value.title} — Laurens Verspeek` })
useSeoMeta({ description: post.value.description })

// rough reading time from the rendered AST (~200 wpm)
const countWords = (node: unknown): number => {
  if (typeof node === 'string') return node.split(/\s+/).filter(Boolean).length
  if (Array.isArray(node)) return node.reduce<number>((sum, child) => sum + countWords(child), 0)
  if (node && typeof node === 'object' && 'value' in node) {
    return countWords((node as { value: unknown }).value)
  }
  if (node && typeof node === 'object' && 'children' in node) {
    return countWords((node as { children: unknown }).children)
  }
  return 0
}
const readingTime = computed(() => Math.max(1, Math.round(countWords(post.value?.body) / 200)))

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
</script>

<style scoped lang="scss">
.post-container {
  max-width: 44rem;
}

.post-nav {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-top: 1px solid var(--bulma-border-weak);

  .post-nav-link {
    color: var(--bulma-text-weak);

    &:hover {
      color: var(--bulma-primary-on-scheme);
    }
  }
}

.post-body {
  :deep(pre) {
    border: 1px solid var(--bulma-border-weak);
    border-radius: var(--bulma-radius);
    padding: 1.25rem;
    font-size: 0.85em;
    overflow-x: auto;
  }

  :deep(code):not(pre code) {
    color: var(--bulma-primary-on-scheme);
    background-color: var(--bulma-scheme-main-bis);
  }
}
</style>
