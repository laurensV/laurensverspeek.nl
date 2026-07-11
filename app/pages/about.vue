<template>
  <section class="section">
    <div class="container">
      <p class="overline mb-2">about $ cat README.md</p>
      <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap" style="gap: 1rem">
        <h1 class="title is-2 mb-0">About me</h1>
        <div class="is-flex" style="gap: 0.75rem">
          <CmdButton to="/now">now</CmdButton>
          <CmdButton to="/cv" variant="primary">
            <AppIcon name="file" :size="15" />
            view cv
          </CmdButton>
        </div>
      </div>

      <div class="columns mt-2">
        <div class="column is-7">
          <div class="content is-medium">
            <p v-for="(paragraph, i) in profile.bio" :key="i">{{ paragraph }}</p>
            <p>
              When I'm not building products, I'm probably experimenting with a side project —
              like a website that <a href="https://laurensv.github.io/self-coding-website/" target="_blank" rel="noopener">codes itself</a>,
              or the terminal hiding behind the <kbd>~</kbd> key on this very page.
            </p>
          </div>

          <RevealBlock>
            <h2 class="title is-4 mt-6 mb-4">GitHub</h2>
            <GithubStats />
          </RevealBlock>

          <RevealBlock>
            <h2 class="title is-4 mt-6 mb-2">Timeline</h2>
            <p class="is-family-code is-size-7 has-text-grey mb-4">$ git log --graph career</p>
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
          </RevealBlock>
        </div>

        <div class="column is-4 is-offset-1">
          <CodeSnippet title="laurens.ts" class="mb-5" :code="laurensSnippet" />
          <h2 class="title is-4 mb-2">Skills</h2>
          <p class="is-family-code is-size-7 has-text-grey mb-3">$ npm ls --depth=1</p>
          <div class="skill-tree is-family-code">
            <p class="skill-root">laurens@2.0.0</p>
            <p
              v-for="node in skillTree"
              :key="node.key"
              :class="node.isGroup ? 'skill-group' : 'skill-leaf'"
            >
              <span class="tree-glyph">{{ node.prefix }}</span>
              <template v-if="node.isGroup">{{ node.label }}</template>
              <template v-else>
                <span class="skill-name">{{ node.label }}</span><span class="skill-version">@{{ node.version }}</span>
              </template>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

const ogImage = `${SITE_URL}/og/page-about.png`
useHead({ title: 'About — Laurens Verspeek' })
useSeoMeta({
  ogTitle: 'About Laurens',
  ogUrl: `${SITE_URL}/about`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

// deterministic fake commit hash per timeline entry
const commitHash = (input: string) => {
  let hash = 0
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash.toString(16).padStart(7, '0').slice(0, 7)
}

// playful semver-ish "version" per skill, derived deterministically so it's
// stable between renders (this is a package tree, after all)
const skillVersion = (skill: string) => {
  let hash = 0
  for (const char of skill) hash = (hash * 17 + char.charCodeAt(0)) >>> 0
  const major = (hash % 6) + 1
  const minor = (hash >> 3) % 12
  return `${major}.${minor}.0`
}

// flatten skills into an `npm ls` tree with the right ├─ │ └─ box characters
interface SkillNode { key: string, prefix: string, label: string, isGroup: boolean, version?: string }

const skillTree = computed<SkillNode[]>(() => {
  const nodes: SkillNode[] = []
  const groups = profile.skills
  groups.forEach((group, gi) => {
    const lastGroup = gi === groups.length - 1
    nodes.push({
      key: group.group,
      prefix: lastGroup ? '└─ ' : '├─ ',
      label: group.group.toLowerCase(),
      isGroup: true
    })
    const rail = lastGroup ? '   ' : '│  '
    group.items.forEach((skill, si) => {
      const lastItem = si === group.items.length - 1
      nodes.push({
        key: `${group.group}/${skill}`,
        prefix: `${rail}${lastItem ? '└─ ' : '├─ '}`,
        label: skill,
        isGroup: false,
        version: skillVersion(skill)
      })
    })
  })
  return nodes
})

const laurensSnippet = `<span class="tok-kw">const</span> laurens: <span class="tok-type">Developer</span> = {
  location: <span class="tok-str">'The Netherlands'</span>,
  roles: [<span class="tok-str">'head of dev @ Nosana'</span>,
          <span class="tok-str">'full-stack dev'</span>],
  languages: [<span class="tok-str">'TypeScript'</span>,
              <span class="tok-str">'Rust'</span>],
  fuel: <span class="tok-str">'coffee'</span>, <span class="tok-comment">// mostly</span>
  openTo: <span class="tok-str">'interesting problems'</span>,
  contact: () =&gt; <span class="tok-fn">open</span>(<span class="tok-str">'/contact'</span>)
}`
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

.skill-tree {
  font-size: 0.85rem;
  line-height: 1.75;
  white-space: pre;
  overflow-x: auto;

  .skill-root {
    color: var(--bulma-primary-on-scheme);
    font-weight: 600;
  }

  .skill-group {
    color: var(--bulma-text-strong);
  }

  .tree-glyph {
    color: var(--bulma-border);
  }

  .skill-leaf {
    color: var(--bulma-text-weak);
    transition: color 0.15s ease;

    .skill-name {
      color: var(--bulma-text);
    }

    .skill-version {
      color: var(--bulma-text-weak);
      opacity: 0.6;
    }

    &:hover {
      .skill-name {
        color: var(--bulma-primary-on-scheme);
      }

      .skill-version {
        opacity: 1;
      }
    }
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
