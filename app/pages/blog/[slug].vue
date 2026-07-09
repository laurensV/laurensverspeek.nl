<template>
  <section class="section">
    <!-- reading progress: a thin scanline across the top of the viewport -->
    <div class="read-progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />

    <div class="post-layout container">
      <div class="post-container">
        <p class="overline mb-4">blog $ cat {{ route.params.slug }}.md</p>

        <template v-if="post">
          <h1 class="title is-2 mb-2" :style="{ viewTransitionName: `post-${route.params.slug}` }">{{ post.title }}</h1>
          <p class="is-family-code is-size-7 has-text-grey mb-6">
            {{ formatDate(post.date) }} · {{ readingTime }} min read
            <template v-if="updatedDate"> · <span class="post-updated" title="last edited">updated {{ formatDate(updatedDate) }}</span></template>
            <template v-if="post.tags?.length">
              · <span
                v-for="tag in post.tags"
                :key="tag"
                class="mr-1 post-tag"
                :style="{ '--tag-h': tagHue(tag) }"
              >#{{ tag }}</span>
            </template>
            · <button class="post-share" :class="{ 'is-shared': shared }" @click="share">
              {{ shared ? 'copied ✓' : '[share]' }}
            </button>
          </p>

          <div ref="bodyRef" class="content is-medium post-body">
            <ContentRenderer :value="post" />
          </div>

          <section v-if="related.length" class="post-related mt-6 pt-5">
            <p class="overline mb-4">related $ grep -l --tags</p>
            <ul class="related-list">
              <li v-for="item in related" :key="item.path">
                <NuxtLink :to="item.path" class="related-link">
                  <span class="related-title">{{ item.title }}</span>
                  <span class="related-tags is-family-code">{{ (item.tags ?? []).map((t) => `#${t}`).join(' ') }}</span>
                  <span class="related-arrow is-family-code" aria-hidden="true">-&gt;</span>
                </NuxtLink>
              </li>
            </ul>
          </section>

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
import { tagHue } from '~/utils/tagHue'
import type { MinimarkNode, MinimarkRoot } from '~/utils/terminalMarkdown'

const route = useRoute()

// git-derived last-edit date (baked at build); shown only when it post-dates publish
const slugParam = String(route.params.slug)

const updatedDate = computed(() => {
  const slug = slugParam
  const map = useRuntimeConfig().public.postUpdated as Record<string, string>
  const updated = map[slug]
  return updated && post.value?.date && updated > post.value.date.slice(0, 10) ? updated : ''
})


const { data: post } = await useAsyncData(`blog-${slugParam}`, () =>
  queryCollection('blog').path(route.path).first()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const { data: surround } = await useAsyncData(`blog-surround-${slugParam}`, () =>
  queryCollectionItemSurroundings('blog', route.path, { fields: ['title'] })
)

// related posts: others sharing the most tags with this one (up to 3)
const { data: allPosts } = await useAsyncData('blog-all-tags', () =>
  queryCollection('blog').order('date', 'DESC').all()
)
const related = computed(() => {
  const tags = new Set(post.value?.tags ?? [])
  if (!tags.size) return []
  return (allPosts.value ?? [])
    .filter((p) => p.path !== post.value?.path)
    .map((p) => ({ post: p, shared: (p.tags ?? []).filter((t) => tags.has(t)).length }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3)
    .map((entry) => entry.post)
})

const ogImage = `${SITE_URL}/og/blog-${slugParam}.svg`
useHead({ title: `${post.value.title} — Laurens Verspeek` })
useSeoMeta({
  description: post.value.description,
  ogTitle: post.value.title,
  ogDescription: post.value.description,
  ogType: 'article',
  ogUrl: `${SITE_URL}${post.value.path}`,
  ogImage,
  twitterImage: ogImage,
  twitterTitle: post.value.title
})

useJsonLd(() => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.value?.title,
  description: post.value?.description,
  datePublished: post.value?.date,
  ...(updatedDate.value ? { dateModified: updatedDate.value } : {}),
  keywords: post.value?.tags?.join(', '),
  url: `${SITE_URL}${post.value?.path}`,
  author: { '@type': 'Person', name: 'Laurens Verspeek', url: SITE_URL },
  publisher: { '@type': 'Person', name: 'Laurens Verspeek' },
  mainEntityOfPage: `${SITE_URL}${post.value?.path}`
}))

// rough reading time from the rendered minimark AST (~200 wpm). A node is either
// a text string or an element tuple [tag, props, ...children].
const countWords = (nodes: MinimarkNode[]): number =>
  nodes.reduce((sum, node) =>
    typeof node === 'string'
      ? sum + node.split(/\s+/).filter(Boolean).length
      : sum + countWords(node.slice(2) as MinimarkNode[]), 0)

const readingTime = computed(() => {
  const body = post.value?.body as MinimarkRoot | undefined
  return Math.max(1, Math.round(countWords(body?.value ?? []) / 200))
})

// share: the native sheet where it exists, otherwise copy the url
const { copied: shared, copy } = useCopyFlag()
const share = async () => {
  const url = window.location.href
  const title = post.value?.title ?? document.title
  if ('share' in navigator) {
    await navigator.share({ title, url }).catch(() => {})
    return
  }
  await copy(url)
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })

// ---- table of contents (flattened, h2 + h3) ----
interface TocEntry { id: string, text: string, depth: number }

const tocLinks = computed<TocEntry[]>(() => {
  const links = post.value?.body.toc?.links ?? []
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

// ---- copyable deep-link anchors on section headings ----
onMounted(() => {
  const headings = bodyRef.value?.querySelectorAll<HTMLElement>('h2[id], h3[id]')
  headings?.forEach((heading) => {
    if (heading.querySelector('.heading-anchor')) return
    const anchor = document.createElement('a')
    anchor.className = 'heading-anchor is-family-code'
    anchor.href = `#${heading.id}`
    anchor.setAttribute('aria-label', 'Copy a link to this section')
    anchor.textContent = '#'
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      history.replaceState(null, '', `#${heading.id}`)
      navigator.clipboard
        .writeText(`${location.origin}${location.pathname}#${heading.id}`)
        .then(() => {
          anchor.classList.add('is-copied')
          setTimeout(() => anchor.classList.remove('is-copied'), 1200)
        })
        .catch(() => {})
    })
    heading.appendChild(anchor)
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

.post-tag {
  color: hsl(var(--tag-h, 44), 45%, 52%);
}

.post-share {
  border: none;
  background: none;
  padding: 0;
  color: var(--bulma-primary-on-scheme);
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  &.is-shared {
    color: var(--bulma-success);
  }
}

.post-related {
  border-top: 1px solid var(--bulma-border-weak);

  .related-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .related-link {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--bulma-border-weak);
    color: var(--bulma-text);

    .related-title {
      font-weight: 600;
    }

    .related-tags {
      font-size: 0.72rem;
      color: var(--bulma-text-weak);
    }

    .related-arrow {
      margin-left: auto;
      color: var(--bulma-primary-on-scheme);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    &:hover {
      color: var(--bulma-primary-on-scheme);

      .related-arrow {
        opacity: 1;
        transform: none;
      }
    }
  }
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

  // a copyable "#" deep-link that appears on heading hover/focus
  :deep(h2),
  :deep(h3) {
    scroll-margin-top: 5rem;
  }

  :deep(.heading-anchor) {
    margin-left: 0.4rem;
    color: var(--bulma-primary);
    text-decoration: none;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  :deep(h2:hover) .heading-anchor,
  :deep(h3:hover) .heading-anchor,
  :deep(.heading-anchor:focus-visible) {
    opacity: 0.75;
  }

  :deep(.heading-anchor.is-copied) {
    opacity: 1;
  }

  :deep(.heading-anchor.is-copied)::after {
    content: ' link copied';
    font-size: 0.6em;
    color: var(--bulma-text-weak);
  }

  // render the code as a grid so a highlighted line can span the full width
  // (Shiki keeps the trailing newline inside each .line, which breaks the
  // simpler inline-block approach)
  :deep(pre code) {
    display: grid;
    counter-reset: line;
  }

  // a left gutter of line numbers, drawn with a CSS counter per .line
  :deep(pre code .line) {
    counter-increment: line;
  }

  :deep(pre code .line)::before {
    content: counter(line);
    display: inline-block;
    width: 2ch;
    margin-right: 1.25rem;
    text-align: right;
    color: var(--bulma-text-weak);
    opacity: 0.35;
    user-select: none;
  }

  // lines called out with a `{2,4-6}` fence directive: an accent band + rail so
  // it reads without relying on colour alone
  :deep(.line.highlight) {
    margin: 0 -1.25rem;
    padding: 0 1.25rem 0 calc(1.25rem - 3px);
    border-left: 3px solid var(--bulma-primary);
    background-color: hsla(var(--lv-primary-hsl), 0.1);
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
