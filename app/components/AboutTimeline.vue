<template>
  <ol class="gitlog">
    <li
      v-for="(entry, i) in profile.timeline"
      :key="entry.title"
      class="gitlog-entry"
    >
      <RevealBlock :delay="i * 120">
        <p class="gitlog-head is-family-code">
          <span class="gitlog-node" aria-hidden="true">*</span>
          <span class="gitlog-hash">{{ commitHash(entry.title) }}</span>
          <span v-if="i === 0" class="gitlog-ref">(HEAD -&gt; now)</span>
          <span v-else-if="i === profile.timeline.length - 1" class="gitlog-ref">(initial commit)</span>
          <span class="gitlog-period">{{ entry.period }}</span>
        </p>
        <div class="gitlog-body">
          <p class="has-text-weight-semibold mb-1">{{ entry.title }}</p>
          <p class="is-size-6 has-text-grey">{{ entry.description }}</p>
          <details v-if="entry.stack" class="gitlog-more is-family-code">
            <summary>git show --stat</summary>
            <div class="gitlog-diff">
              <span class="diff-file">diff --git a/{{ commitHash(entry.title) }} b/{{ commitHash(entry.title) }}</span>
              <span v-for="tech in entry.stack" :key="tech" class="diff-add">+ {{ tech }}</span>
            </div>
          </details>
        </div>
      </RevealBlock>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

// The career timeline rendered as `git log --graph`: commit nodes on a branch
// line that draws itself in as you scroll (native animation-timeline, no JS).

// deterministic fake commit hash per timeline entry
const commitHash = (input: string) => {
  let hash = 0
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash.toString(16).padStart(7, '0').slice(0, 7)
}
</script>

<style scoped lang="scss">
// career as git log --graph: commit nodes on a branch line
.gitlog {
  margin: 0;
  list-style: none;
}

.gitlog-entry {
  position: relative;
  padding: 0 0 1.75rem 1.6rem;

  // the branch line, running through the * nodes
  &::before {
    content: '';
    position: absolute;
    left: 0.32rem;
    top: 0.4rem;
    bottom: -0.4rem;
    width: 1px;
    background-color: var(--bulma-border);
  }

  // native scroll-driven animation: each entry's segment of the branch line
  // draws itself in amber as the entry scrolls through the viewport — no JS,
  // and browsers without animation-timeline just keep the static line
  &::after {
    content: '';
    position: absolute;
    left: 0.32rem;
    top: 0.4rem;
    bottom: -0.4rem;
    width: 1px;
    background-color: var(--bulma-primary);
    transform: scaleY(0);
    transform-origin: top;
  }

  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      &::after {
        animation: gitlog-draw linear both;
        animation-timeline: view();
        animation-range: entry 0% cover 55%;
      }

      .gitlog-node {
        animation: gitlog-node-pop linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 80%;
      }
    }
  }

  &:last-child::after {
    display: none;
  }

  &:last-child {
    padding-bottom: 0;

    &::before {
      display: none;
    }
  }

  .gitlog-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
    font-size: 0.8rem;
  }

  .gitlog-node {
    position: absolute;
    left: 0;
    color: var(--bulma-primary);
    font-weight: 700;
    text-shadow: 0 0 10px hsla(var(--lv-primary-hsl), 0.7);
  }

  .gitlog-hash {
    color: var(--bulma-primary-on-scheme);
  }

  .gitlog-ref {
    color: var(--bulma-text-weak);
  }

  .gitlog-period {
    margin-left: auto;
    color: var(--bulma-text-weak);
    font-size: 0.75rem;
  }

  // expandable git-show-style stack "diff" per commit
  .gitlog-more {
    margin-top: 0.5rem;
    font-size: 0.78rem;

    summary {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--bulma-text-weak);
      cursor: pointer;
      list-style: none;
      transition: color 0.15s ease;

      &::-webkit-details-marker { display: none; }
      &::before { content: '▸'; font-size: 0.7em; }
      &:hover { color: var(--bulma-primary-on-scheme); }
    }

    &[open] summary {
      color: var(--bulma-primary-on-scheme);
      &::before { content: '▾'; }
    }

    .gitlog-diff {
      margin-top: 0.4rem;
      padding: 0.5rem 0.7rem;
      border-left: 2px solid hsla(var(--lv-primary-hsl), 0.35);
      background-color: var(--bulma-scheme-main-bis);
      border-radius: 0 2px 2px 0;
    }

    .diff-file {
      display: block;
      color: var(--bulma-text-weak);
      margin-bottom: 0.2rem;
    }

    .diff-add {
      display: block;
      color: var(--bulma-success);
    }
  }

  &:hover .gitlog-node {
    animation: gitlog-pulse 1s ease infinite;
  }
}

@keyframes gitlog-pulse {
  50% {
    text-shadow: 0 0 16px hsla(var(--lv-primary-hsl), 1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gitlog-entry:hover .gitlog-node {
    animation: none;
  }
}

@keyframes gitlog-draw {
  to {
    transform: scaleY(1);
  }
}

@keyframes gitlog-node-pop {
  from {
    color: var(--bulma-border);
  }
  to {
    color: var(--bulma-primary);
  }
}
</style>
