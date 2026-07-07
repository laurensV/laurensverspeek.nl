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
                  </div>
                </RevealBlock>
              </li>
            </ol>
          </RevealBlock>
        </div>

        <div class="column is-4 is-offset-1">
          <CodeSnippet title="laurens.ts" class="mb-5" :code="laurensSnippet" />
          <h2 class="title is-4 mb-4">Skills</h2>
          <div v-for="group in profile.skills" :key="group.group" class="mb-4">
            <p class="is-family-code is-size-7 has-text-grey mb-2">./{{ group.group.toLowerCase() }}</p>
            <div class="tags">
              <span v-for="skill in group.items" :key="skill" class="tag is-medium skill-tag">
                {{ skill }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

useHead({ title: 'About — Laurens Verspeek' })

// deterministic fake commit hash per timeline entry
const commitHash = (input: string) => {
  let hash = 0
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash.toString(16).padStart(7, '0').slice(0, 7)
}

const laurensSnippet = `<span class="tok-kw">const</span> laurens: <span class="tok-type">Developer</span> = {
  location: <span class="tok-str">'The Netherlands'</span>,
  roles: [<span class="tok-str">'CTO @ Nosana'</span>,
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

.skill-tag {
  border: 1px solid var(--bulma-border-weak);
}
</style>
