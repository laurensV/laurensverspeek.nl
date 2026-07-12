<template>
  <!-- sticky table of contents on wide screens -->
  <aside class="post-toc is-family-code" aria-label="Table of contents">
    <p class="toc-title">// contents</p>
    <ul>
      <li v-for="item in links" :key="item.id" :class="`is-depth-${item.depth}`">
        <a :href="`#${item.id}`" :class="{ 'is-active': activeId === item.id }">
          <span class="toc-hash">{{ '#'.repeat(item.depth) }}</span> {{ item.text }}
        </a>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import type { TocEntry } from '~/composables/usePostToc'

defineProps<{ links: TocEntry[], activeId: string }>()
</script>

<style scoped lang="scss">
.post-toc {
  display: none;
  width: 15rem;
  flex-shrink: 0;
  font-size: 0.75rem;

  @media screen and (min-width: 1216px) {
    display: block;
  }

  .toc-title {
    position: sticky;
    top: 3.5rem;
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
</style>
