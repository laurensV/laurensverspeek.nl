<template>
  <section class="section">
    <div class="container changelog-container">
      <p class="overline mb-2">changelog $ git log --graph</p>
      <h1 class="title is-2">
        changelog<span class="changelog-count has-text-primary-on-scheme is-family-code">[{{ commits?.length ?? 0 }}]</span>
      </h1>
      <p class="subtitle is-5 has-text-grey mb-5">
        What changed on this site, straight from the repository — the same history the terminal's
        <code>git log</code> replays.
      </p>

      <div v-if="pending" class="is-family-code has-text-grey">reading history…</div>
      <div v-else-if="!commits?.length" class="is-family-code has-text-grey">
        fatal: not a git repository (this should not happen)
      </div>

      <ol v-else class="changelog is-family-code">
        <li v-for="(commit, i) in visibleCommits" :key="commit.hash" class="changelog-entry">
          <p class="changelog-head">
            <span class="changelog-node" aria-hidden="true">*</span>
            <span class="changelog-hash">{{ commit.hash }}</span>
            <span v-if="i === 0" class="changelog-ref">(HEAD)</span>
            <span class="changelog-date">{{ commit.date }}</span>
          </p>
          <p class="changelog-subject">{{ commit.subject }}</p>
          <p v-if="commit.files.length" class="changelog-stat">
            {{ commit.files.length + (commit.truncated ?? 0) }} file{{ commit.files.length + (commit.truncated ?? 0) === 1 ? '' : 's' }}
            · <span class="changelog-add">+{{ commit.plus }}</span>
            <span class="changelog-del">−{{ commit.minus }}</span>
            <span class="changelog-blocks" :title="`+${commit.plus} −${commit.minus}`" aria-hidden="true">
              <span
                v-for="(kind, b) in diffBlocks(commit)"
                :key="b"
                class="changelog-block"
                :class="`is-${kind}`"
              />
            </span>
          </p>
        </li>
      </ol>

      <button
        v-if="commits && visible < commits.length"
        class="changelog-more is-family-code"
        @click="visible += PAGE"
      >
        $ git log --skip={{ visible }}  <span class="has-text-grey">({{ commits.length - visible }} more commits)</span>
      </button>

      <p class="is-family-code is-size-7 has-text-grey mt-5">
        // press <kbd>~</kbd> and try <code>git show {{ commits?.[0]?.hash }}</code> for the full diffstat
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GitCommit } from '~/utils/terminal/gitLog'

const ogImage = `${SITE_URL}/og/page-changelog.png`
useSeo({
  title: 'Changelog — Laurens Verspeek',
  description: 'The living changelog of laurensverspeek.nl — real commits, baked at build time.',
  path: '/changelog',
  image: ogImage
})

// the same prerendered history the terminal's git command reads
const { data: commits, pending } = await useAsyncData('changelog', () =>
  $fetch<GitCommit[]>('/git-log.json')
)

// the full history is baked in; the page reveals it a screenful at a time
const PAGE = 25
const visible = ref(PAGE)
const visibleCommits = computed(() => commits.value?.slice(0, visible.value) ?? [])

// GitHub-style diffstat squares: five blocks split between green and red in
// proportion to the commit's additions/deletions
const diffBlocks = (commit: GitCommit): ('add' | 'del' | 'idle')[] => {
  const total = commit.plus + commit.minus
  if (!total) return ['idle', 'idle', 'idle', 'idle', 'idle']
  const green = Math.min(5, Math.max(commit.plus > 0 ? 1 : 0, Math.round((commit.plus / total) * 5)))
  return Array.from({ length: 5 }, (_, i) => (i < green ? 'add' : 'del'))
}
</script>

<style scoped lang="scss">
.changelog-container {
  max-width: 44rem;
}

// keep the commit-count badge intact — Bulma's .title word-break would otherwise
// split it mid-number ([6 / 27]) when the heading wraps on a narrow phone
.changelog-count {
  white-space: nowrap;
}

.changelog {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 1px solid hsla(var(--lv-primary-hsl), 0.35);
}

.changelog-entry {
  position: relative;
  padding: 0 0 1.4rem 1.4rem;
  font-size: 0.85rem;
}

.changelog-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.changelog-node {
  position: absolute;
  left: -0.36rem;
  color: var(--bulma-primary);
  background-color: var(--bulma-scheme-main);
  line-height: 1;
}

.changelog-hash {
  color: var(--bulma-primary-on-scheme);
}

.changelog-ref {
  color: var(--bulma-success);
  font-size: 0.75rem;
}

.changelog-date {
  color: var(--bulma-text-weak);
  font-size: 0.75rem;
}

.changelog-subject {
  margin-top: 0.15rem;
  color: var(--bulma-text-strong);
}

.changelog-stat {
  margin-top: 0.1rem;
  color: var(--bulma-text-weak);
  font-size: 0.72rem;

  .changelog-add {
    color: var(--bulma-success);
  }

  .changelog-del {
    color: var(--bulma-danger);
    margin-left: 0.3rem;
  }

  .changelog-blocks {
    display: inline-flex;
    gap: 2px;
    margin-left: 0.5rem;
    vertical-align: baseline;
  }

  .changelog-block {
    width: 7px;
    height: 7px;
    border-radius: 1px;

    &.is-add { background-color: var(--bulma-success); }
    &.is-del { background-color: var(--bulma-danger); }
    &.is-idle { background-color: var(--bulma-border); }
  }
}

.changelog-more {
  margin-top: 1rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background: none;
  color: var(--bulma-primary-on-scheme);
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
  }
}
</style>
