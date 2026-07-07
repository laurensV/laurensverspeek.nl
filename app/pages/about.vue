<template>
  <section class="section">
    <div class="container">
      <p class="overline mb-2">about $ cat README.md</p>
      <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap" style="gap: 1rem">
        <h1 class="title is-2 mb-0">About me</h1>
        <NuxtLink to="/cv" class="button is-primary is-outlined">
          <span class="icon"><AppIcon name="file" :size="16" /></span>
          <span>View CV</span>
        </NuxtLink>
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
            <h2 class="title is-4 mt-6 mb-4">Timeline</h2>
            <ol class="timeline">
              <li v-for="entry in profile.timeline" :key="entry.title" class="timeline-entry">
                <p class="is-family-code is-size-7 has-text-primary-on-scheme mb-1">
                  {{ entry.period }}
                </p>
                <p class="has-text-weight-semibold mb-1">{{ entry.title }}</p>
                <p class="is-size-6 has-text-grey">{{ entry.description }}</p>
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
.timeline {
  position: relative;
  margin: 0;
  padding-left: 1.5rem;
  list-style: none;
  border-left: 2px solid var(--bulma-border);
}

.timeline-entry {
  position: relative;
  padding-bottom: 2rem;

  &:last-child {
    padding-bottom: 0;
  }

  // Dot on the timeline
  &::before {
    content: '';
    position: absolute;
    left: calc(-1.5rem - 6px);
    top: 0.3rem;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--bulma-primary);
    box-shadow: 0 0 12px
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.6);
  }
}

.skill-tag {
  border: 1px solid var(--bulma-border-weak);
}
</style>
