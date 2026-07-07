<template>
  <section class="section">
    <div class="container post-container">
      <p class="overline mb-4">blog $ cat {{ route.params.slug }}.md</p>

      <template v-if="post">
        <h1 class="title is-2 mb-2">{{ post.title }}</h1>
        <p class="is-family-code is-size-7 has-text-grey mb-6">
          {{ formatDate(post.date) }}
          <template v-if="post.tags?.length">
            · <span v-for="tag in post.tags" :key="tag" class="mr-1">#{{ tag }}</span>
          </template>
        </p>

        <div class="content is-medium post-body">
          <ContentRenderer :value="post" />
        </div>

        <NuxtLink to="/blog" class="is-family-code">&lt;- cd ../blog</NuxtLink>
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

useHead({ title: `${post.value.title} — Laurens Verspeek` })
useSeoMeta({ description: post.value.description })

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
</script>

<style scoped lang="scss">
.post-container {
  max-width: 44rem;
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
