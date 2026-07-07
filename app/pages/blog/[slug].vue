<template>
  <section class="section">
    <!-- reading progress: a thin scanline across the top of the viewport -->
    <div class="read-progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />

    <div class="post-layout container">
      <div class="post-container">
        <p class="overline mb-4">blog $ cat {{ route.params.slug }}.md</p>

        <template v-if="post">
          <h1 class="title is-2 mb-2">{{ post.title }}</h1>
          <p class="is-family-code is-size-7 has-text-grey mb-6">
            {{ formatDate(post.date) }} · {{ readingTime }} min read
            <template v-if="post.tags?.length">
              · <span v-for="tag in post.tags" :key="tag" class="mr-1">#{{ tag }}</span>
            </template>
          </p>

          <div ref="bodyRef" class="content is-medium post-body">
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

      <!-- sticky table of contents on wide screens -->
      <aside v-if="tocLinks.length" class="post-toc is-family-code" aria-label="Table of contents">
        <p class="toc-title">// contents</p>
        <ul>
          <li v-for="item in tocLinks" :key="item.id" :class="`is-depth-${item.depth}`">
            <a :href="`#${item.id}`" :class="{ 'is-active': activeHeading === item.id }">
              <span class="toc-hash">{{ '#'.repeat(item.depth) }}</span> {{ item.text }}
            </a>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

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

// ---- table of contents (flattened, h2 + h3) ----
interface TocEntry { id: string, text: string, depth: number }

const tocLinks = computed<TocEntry[]>(() => {
  const links = post.value?.body?.toc?.links ?? []
  const flat: TocEntry[] = []
  for (const link of links) {
    flat.push({ id: link.id, text: link.text, depth: link.depth })
    for (const child of link.children ?? []) {
      flat.push({ id: child.id, text: child.text, depth: child.depth })
    }
  }
  return flat
})

// highlight the heading currently on screen
const activeHeading = ref('')
const bodyRef = ref<HTMLElement>()
let headingObserver: IntersectionObserver | undefined

onMounted(() => {
  const headings = bodyRef.value?.querySelectorAll('h2[id], h3[id]')
  if (!headings?.length) return
  headingObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeHeading.value = entry.target.id
      }
    },
    { rootMargin: '0px 0px -70% 0px' }
  )
  headings.forEach((heading) => headingObserver!.observe(heading))
})

onUnmounted(() => headingObserver?.disconnect())

// ---- reading progress ----
const progress = ref(0)

const updateProgress = () => {
  const doc = document.documentElement
  const total = doc.scrollHeight - doc.clientHeight
  progress.value = total > 0 ? Math.min(1, doc.scrollTop / total) : 0
}

useEventListener('scroll', updateProgress, { passive: true })
onMounted(updateProgress)

// ---- copy buttons + language labels on code blocks ----
onMounted(() => {
  const blocks = bodyRef.value?.querySelectorAll('pre')
  blocks?.forEach((pre) => {
    if (pre.querySelector('.code-copy')) return

    const language = /language-(\w+)/.exec(`${pre.className} ${pre.querySelector('code')?.className ?? ''}`)?.[1]
    if (language) {
      const label = document.createElement('span')
      label.className = 'code-lang is-family-code'
      label.textContent = language
      pre.appendChild(label)
    }

    const button = document.createElement('button')
    button.className = 'code-copy is-family-code'
    button.type = 'button'
    button.textContent = '[copy]'
    button.addEventListener('click', () => {
      navigator.clipboard
        .writeText(pre.querySelector('code')?.textContent ?? '')
        .then(() => {
          button.textContent = '[copied!]'
          button.classList.add('is-copied')
          setTimeout(() => {
            button.textContent = '[copy]'
            button.classList.remove('is-copied')
          }, 1600)
        })
        .catch(() => {
          button.textContent = '[nope :(]'
        })
    })
    pre.appendChild(button)
  })
})
</script>

<style scoped lang="scss">
.read-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 40;
  background: linear-gradient(90deg, var(--bulma-primary), hsla(var(--lv-primary-hsl), 0.55));
  transform-origin: left;
  transform: scaleX(0);
  pointer-events: none;
}

.post-layout {
  display: flex;
  justify-content: center;
  gap: 3rem;
}

.post-container {
  max-width: 44rem;
  min-width: 0;
  flex: 1;
}

.post-toc {
  display: none;
  width: 15rem;
  flex-shrink: 0;
  font-size: 0.75rem;

  @media screen and (min-width: 1216px) {
    display: block;
  }

  .toc-title {
    color: var(--bulma-text-weak);
    margin-bottom: 0.75rem;
  }

  ul {
    position: sticky;
    top: 5.5rem;
    list-style: none;
    margin: 0;
    border-left: 1px solid var(--bulma-border-weak);
  }

  li a {
    display: block;
    padding: 0.3rem 0 0.3rem 0.9rem;
    margin-left: -1px;
    border-left: 1px solid transparent;
    color: var(--bulma-text-weak);
    transition: color 0.2s ease, border-color 0.2s ease;

    .toc-hash {
      opacity: 0.5;
    }

    &:hover {
      color: var(--bulma-text-strong);
    }

    &.is-active {
      color: var(--bulma-primary-on-scheme);
      border-left-color: var(--bulma-primary);
    }
  }

  li.is-depth-3 a {
    padding-left: 1.8rem;
  }
}

// keep the sticky rail working: the ul is the sticky element
.post-toc .toc-title {
  position: sticky;
  top: 3.5rem;
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
    position: relative;
    border: 1px solid var(--bulma-border-weak);
    border-radius: var(--bulma-radius);
    padding: 1.25rem;
    font-size: 0.85em;
    overflow-x: auto;
  }

  :deep(.code-lang) {
    position: absolute;
    top: 0.4rem;
    right: 4.2rem;
    font-size: 0.7rem;
    color: var(--bulma-text-weak);
    opacity: 0.7;
  }

  :deep(.code-copy) {
    position: absolute;
    top: 0.3rem;
    right: 0.5rem;
    border: none;
    background: none;
    padding: 0.1rem 0.2rem;
    font-size: 0.7rem;
    color: var(--bulma-text-weak);
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: var(--bulma-primary-on-scheme);
    }

    &.is-copied {
      color: var(--bulma-primary-on-scheme);
    }
  }

  :deep(code):not(pre code) {
    color: var(--bulma-primary-on-scheme);
    background-color: var(--bulma-scheme-main-bis);
  }
}
</style>
