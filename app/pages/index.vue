<template>
  <div>
    <section class="hero is-fullheight-with-navbar hero-root">
      <ClientOnly>
        <HeroCrosshair />
      </ClientOnly>
      <div class="hero-body">
        <div class="container">
          <div class="columns is-vcentered">
            <div class="column is-7 hero-intro">
              <p class="overline mb-3">hello-world $</p>
              <h1 class="title is-1 hero-name">
                Laurens <span class="text-gradient">Verspeek</span>
              </h1>
              <p class="subtitle is-4 mt-3 is-family-code hero-role">
                <span class="has-text-grey">&gt;</span> {{ role
                }}<span class="blink-cursor" aria-hidden="true" />
              </p>
              <p class="hero-bio has-text-grey mb-5">
                {{ profile.bio[0] }}
              </p>
              <div class="is-flex is-flex-wrap-wrap mb-4" style="gap: 0.9rem">
                <CmdButton to="/projects" variant="primary" size="medium">
                  view projects
                  <AppIcon name="arrow-right" :size="16" />
                </CmdButton>
                <CmdButton size="medium" @click="open">
                  <AppIcon name="terminal" :size="16" />
                  terminal
                </CmdButton>
              </div>
              <p class="is-family-code is-size-7 hero-hint">
                // psst — try <kbd>~</kbd> for the terminal, <kbd>ctrl</kbd>+<kbd>k</kbd> for the palette
              </p>
            </div>
            <div class="column is-4 is-offset-1 is-hidden-mobile">
              <ClientOnly>
                <HeroLife class="hero-scene-slot" />
              </ClientOnly>
              <HeroTerminal />
            </div>
          </div>
        </div>
      </div>
      <div class="hero-foot has-text-centered pb-5">
        <a class="scroll-hint" href="#featured" aria-label="Scroll to featured projects">
          <AppIcon name="chevron-down" :size="24" />
        </a>
      </div>
    </section>

    <section id="featured" class="section">
      <div class="container">
        <RevealBlock>
          <div class="is-flex is-align-items-baseline is-justify-content-space-between mb-5">
            <div>
              <p class="overline mb-2">featured $</p>
              <h2 class="title is-3">Featured projects</h2>
            </div>
            <NuxtLink to="/projects" class="is-family-code is-size-6 is-hidden-mobile">
              all projects →
            </NuxtLink>
          </div>
        </RevealBlock>
        <RevealBlock :delay="100">
          <ProjectsGrid :projects="featuredProjects" />
        </RevealBlock>
        <div class="has-text-centered mt-4 is-hidden-tablet">
          <CmdButton to="/projects" variant="primary">cd projects/</CmdButton>
        </div>
      </div>
    </section>

    <section v-if="pendingPosts || latestPosts?.length" class="section">
      <div class="container">
        <RevealBlock>
          <div class="is-flex is-align-items-baseline is-justify-content-space-between mb-5">
            <div>
              <p class="overline mb-2">blog $ tail -2</p>
              <h2 class="title is-3">Latest writing</h2>
            </div>
            <NuxtLink to="/blog" class="is-family-code is-size-6 is-hidden-mobile">
              all posts →
            </NuxtLink>
          </div>

          <div v-if="pendingPosts" class="latest-posts" aria-hidden="true">
            <div v-for="i in 2" :key="i" class="latest-post is-loading">
              <span class="is-skeleton is-size-7 latest-post-date">2026 Jan 01</span>
              <span class="is-skeleton latest-post-title">Loading a recent post title</span>
            </div>
          </div>

          <div v-else class="latest-posts is-loaded">
            <NuxtLink
              v-for="post in latestPosts"
              :key="post.path"
              :to="post.path"
              class="latest-post"
            >
              <span class="is-family-code is-size-7 latest-post-date">{{ formatDate(post.date) }}</span>
              <span class="latest-post-title">{{ post.title }}</span>
              <span class="is-family-code latest-post-arrow">-></span>
            </NuxtLink>
          </div>
        </RevealBlock>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <RevealBlock>
          <p class="overline mb-2">what-i-do $</p>
          <h2 class="title is-3 mb-6">What I do</h2>
        </RevealBlock>
        <div class="columns">
          <div v-for="(area, i) in areas" :key="area.title" class="column">
            <RevealBlock :delay="i * 120" class="is-fullheight-reveal">
              <article class="skill-card">
                <header class="skill-card-bar is-family-code">
                  <span class="skill-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span class="skill-file">{{ area.file }}</span>
                </header>
                <div class="skill-card-body">
                  <span class="skill-icon"><AppIcon :name="area.icon" :size="24" /></span>
                  <p class="title is-5 mb-2">{{ area.title }}</p>
                  <p class="has-text-grey">{{ area.description }}</p>
                </div>
              </article>
            </RevealBlock>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '~/components/AppIcon.vue'
import { featuredProjects } from '~/data/projects'
import { profile } from '~/data/profile'

useHead({ title: 'Laurens Verspeek — Full-stack & Blockchain Developer' })

useJsonLd({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  url: SITE_URL,
  jobTitle: 'Full-stack & Blockchain Developer',
  email: `mailto:${profile.email}`,
  sameAs: profile.socials.filter((s) => !s.url.startsWith('mailto:')).map((s) => s.url),
  knowsAbout: profile.skills.flatMap((group) => group.items),
  worksFor: [
    { '@type': 'Organization', name: 'Nosana' },
    { '@type': 'Organization', name: 'Effect.AI' }
  ]
})

const { open } = useTerminal()
const { text: role } = useTypewriter(profile.roles)

// two most recent posts; the section hides itself if the blog is empty or fails
const { data: latestPosts, pending: pendingPosts } = useLazyAsyncData('latest-posts', () =>
  queryCollection('blog').order('date', 'DESC').limit(2).all()
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })

const areas: { icon: IconName; title: string; description: string; file: string }[] = [
  {
    icon: 'globe',
    title: 'Full-stack Web',
    file: 'full-stack.ts',
    description:
      'From pixel-perfect Vue and Nuxt frontends to scalable Node.js backends — I build complete products, end to end.'
  },
  {
    icon: 'layers',
    title: 'Blockchain',
    file: 'blockchain.sol',
    description:
      'Smart contracts, token economics and decentralized infrastructure on Solana and EOS. Co-founded two blockchain companies.'
  },
  {
    icon: 'cpu',
    title: 'AI & Research',
    file: 'ai-research.py',
    description:
      'Decentralized GPU compute for AI inference at Nosana, and a research background in genetic algorithms for web design.'
  }
]
</script>

<style scoped lang="scss">
.hero-root {
  position: relative;
}

// keep hero content above the crosshair overlay
.hero-root .hero-body {
  position: relative;
  z-index: 2;
}

.hero-name {
  font-size: clamp(2.75rem, 7vw, 4.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero-role {
  min-height: 2.2rem;
}

.hero-bio {
  max-width: 34rem;
  font-size: 1.1rem;
}

.hero-hint {
  color: var(--bulma-text-weak);

  kbd {
    padding: 0.05em 0.4em;
    border: 1px solid var(--bulma-border);
    border-radius: var(--bulma-radius-small);
    background-color: var(--bulma-scheme-main-bis);
  }
}

// Float the constellation above the terminal card, fading at its edges so it
// reads as untethered rather than a hard-edged panel.
.hero-scene-slot {
  margin-top: -1.5rem;
  margin-bottom: -1rem;
  -webkit-mask-image: radial-gradient(closest-side, #000 58%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 58%, transparent 100%);
}

// staggered entrance for the hero copy on first paint
.hero-intro > * {
  animation: hero-in 0.55s ease backwards;
}
.hero-intro > *:nth-child(1) { animation-delay: 0.05s; }
.hero-intro > *:nth-child(2) { animation-delay: 0.12s; }
.hero-intro > *:nth-child(3) { animation-delay: 0.19s; }
.hero-intro > *:nth-child(4) { animation-delay: 0.26s; }
.hero-intro > *:nth-child(5) { animation-delay: 0.33s; }
.hero-intro > *:nth-child(6) { animation-delay: 0.40s; }

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-intro > * {
    animation: none;
  }
}

.scroll-hint {
  display: inline-block;
  color: var(--bulma-text-weak);
  animation: bob 2s ease-in-out infinite;

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-hint {
    animation: none;
  }
}

.is-fullheight-reveal {
  height: 100%;
}

.latest-posts {
  display: flex;
  flex-direction: column;

  // fade the resolved list in so it doesn't pop after the skeleton
  &.is-loaded {
    animation: list-fade-in 0.35s ease;
  }
}

@keyframes list-fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .latest-posts.is-loaded {
    animation: none;
  }
}

.latest-post {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text);

  &:first-child {
    border-top: 1px solid var(--bulma-border-weak);
  }

  .latest-post-date {
    flex-shrink: 0;
    color: var(--bulma-text-weak);
  }

  .latest-post-title {
    font-weight: 600;
  }

  .latest-post-arrow {
    margin-left: auto;
    color: var(--bulma-primary-on-scheme);
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  &:hover {
    color: var(--bulma-primary-on-scheme);

    .latest-post-arrow {
      opacity: 1;
      transform: none;
    }
  }
}

@media screen and (max-width: 768px) {
  .latest-post {
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
  }
}

// "what I do" cards styled as little terminal windows — square corners, a
// title bar with traffic-light dots and a source filename, matching the TUI
// language of the project cards and lvOS windows.
.skill-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background-color: var(--bulma-scheme-main-bis);
  overflow: hidden;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.5);
    box-shadow: 0 10px 30px hsla(var(--lv-scheme-hs), 4%, 0.28);

    .skill-file {
      color: var(--bulma-primary-on-scheme);
    }

    .skill-dots i:nth-child(1) { background-color: #f14668; }
    .skill-dots i:nth-child(2) { background-color: #ffba00; }
    .skill-dots i:nth-child(3) { background-color: #48c78e; }
  }
}

.skill-card-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--bulma-border-weak);
  background-color: var(--bulma-scheme-main-ter);
  font-size: 0.72rem;

  .skill-dots {
    display: inline-flex;
    gap: 0.3rem;

    i {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background-color: var(--bulma-border);
      transition: background-color 0.25s ease;
    }
  }

  .skill-file {
    color: var(--bulma-text-weak);
    transition: color 0.25s ease;
  }
}

.skill-card-body {
  flex: 1;
  padding: 1.25rem 1.35rem 1.4rem;

  .skill-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.6rem;
    height: 2.6rem;
    margin-bottom: 0.9rem;
    border-radius: 2px;
    background-color: hsla(var(--lv-primary-hsl), 0.12);
    color: var(--bulma-primary);
  }
}
</style>
