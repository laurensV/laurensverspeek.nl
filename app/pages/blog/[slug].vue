<template>
  <section class="section">
    <!-- reading progress: a thin scanline across the top of the viewport -->
    <div class="read-progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />

    <div class="post-layout container">
      <div class="post-container">
        <p class="overline mb-4">blog $ cat {{ route.params.slug }}.md</p>

        <template v-if="post">
          <h1 class="title is-2 mb-2" :style="{ viewTransitionName: `post-${route.params.slug}` }">{{ override?.title ?? post.title }}</h1>
          <p class="is-family-code is-size-7 has-text-grey mb-6">
            {{ formatDate(override?.date || post.date) }} · {{ readingTime }} min read
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

          <p v-if="override" class="post-edited-note is-family-code is-size-7">
            ✎ you edited this post in the terminal — this is your copy.
            <code>reseed blog/{{ slugParam }}.md</code> brings the original back.
          </p>

          <div ref="bodyRef" class="content is-medium post-body">
            <!-- an override is the visitor's own markdown, rendered by
                 markdownLite: every text node is escaped before any tag is
                 added, so this stays authored markup over inert text -->
            <div v-if="override" v-html="override.html" />
            <ContentRenderer v-else :value="post" />
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

      <PostToc v-if="tocLinks.length" :links="tocLinks" :active-id="activeHeading" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { tagHue } from '~/utils/tagHue'
import { readingTimeMinutes } from '~/utils/readingTime'
import type { MinimarkRoot } from '~/utils/terminalMarkdown'

const route = useRoute()

// git-derived last-edit date (baked at build); shown only when it post-dates publish
const slugParam = String(route.params.slug)

// captured at setup: unhead may evaluate the jsonld computed after the
// component instance is gone, where useRuntimeConfig() would throw
const postUpdatedMap = useRuntimeConfig().public.postUpdated as Record<string, string>
const updatedDate = computed(() => {
  const updated = postUpdatedMap[slugParam]
  return updated && post.value?.date && updated > post.value.date.slice(0, 10) ? updated : ''
})


const { data: post } = await useAsyncData(`blog-${slugParam}`, () =>
  queryCollection('blog').path(route.path).first()
)

// a post edited through the terminal (vim blog/<slug>.md) really replaces the
// rendered one for this visitor — see useBlogOverrides
const { overrideFor } = useBlogOverrides()
const override = computed(() => overrideFor(slugParam))

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

const ogImage = `${SITE_URL}/og/blog-${slugParam}.png`
useSeo({
  title: `${post.value.title} — Laurens Verspeek`,
  description: post.value.description,
  path: post.value.path,
  image: ogImage,
  type: 'article',
  ogTitle: post.value.title
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

const readingTime = computed(() => readingTimeMinutes(post.value?.body as MinimarkRoot | undefined))

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

const formatDate = (date: string) => {
  const parsed = new Date(date)
  // an override's frontmatter is hand-typed — show it verbatim if unparsable
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// swipe between posts on touch, matching the on-screen order (older on the
// left, newer on the right)
useHorizontalSwipe((direction) => {
  const target = direction === 'left' ? surround.value?.[1] : surround.value?.[0]
  if (target?.path) void navigateTo(target.path)
})

// table of contents + on-screen heading highlight, reading progress, and the
// code-block/heading-anchor garnish all live in composables
const bodyRef = ref<HTMLElement>()
const { tocLinks, activeHeading } = usePostToc(computed(() => post.value?.body.toc?.links), bodyRef)
const { progress } = useReadingProgress()
usePostEnhancements(bodyRef)

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

.post-tag {
  color: hsl(var(--tag-h, 44), 45%, 52%);
}

// the "you edited this" banner for terminal-overridden posts
.post-edited-note {
  margin: -1rem 0 1.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px dashed hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius);
  color: var(--bulma-text-weak);

  code {
    background-color: var(--bulma-scheme-main-bis);
  }
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

  // a wide markdown table scrolls inside its own box instead of being clipped
  // by the page-level overflow-x:clip on a narrow phone
  :deep(table) {
    display: block;
    overflow-x: auto;
  }

  // a copyable "#" deep-link that appears on heading hover/focus
  :deep(h2),
  :deep(h3) {
    scroll-margin-top: 5rem;
  }

  :deep(.heading-anchor) {
    // a wider tap target than the bare "#" (matters most on touch)
    padding: 0 0.35rem;
    margin-left: 0.1rem;
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

  // touch devices have no hover, so the copy affordance would never appear —
  // keep it faintly visible and tappable there
  @media (hover: none) {
    :deep(.heading-anchor) {
      opacity: 0.4;
    }
  }

  :deep(.heading-anchor.is-copied) {
    opacity: 1;
  }

  :deep(.heading-anchor.is-copied)::after {
    content: ' link copied';
    font-size: 0.6em;
    color: var(--bulma-text-weak);
  }

  // inline `code` copies itself on click/tap (see usePostEnhancements)
  :deep(code.inline-copy) {
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }

  :deep(code.inline-copy:hover) {
    box-shadow: inset 0 0 0 1px hsla(var(--lv-primary-hsl), 0.5);
  }

  :deep(code.inline-copy.is-copied) {
    background-color: hsla(var(--lv-primary-hsl), 0.22);
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
