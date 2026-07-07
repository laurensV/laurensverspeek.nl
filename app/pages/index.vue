<template>
  <div>
    <section class="hero is-fullheight-with-navbar">
      <div class="hero-body">
        <div class="container">
          <div class="columns is-vcentered">
            <div class="column is-7">
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
              <div class="buttons">
                <NuxtLink to="/projects" class="button is-primary is-medium">
                  <span>View projects</span>
                  <span class="icon"><AppIcon name="arrow-right" :size="18" /></span>
                </NuxtLink>
                <button class="button is-medium is-outlined is-primary" @click="open">
                  <span class="icon"><AppIcon name="terminal" :size="18" /></span>
                  <span class="is-family-code">terminal</span>
                </button>
              </div>
              <p class="is-family-code is-size-7 hero-hint">
                // psst — try <kbd>~</kbd> for the terminal, <kbd>ctrl</kbd>+<kbd>k</kbd> for the palette
              </p>
            </div>
            <div class="column is-4 is-offset-1 is-hidden-mobile">
              <ClientOnly>
                <HeroScene class="hero-scene-slot" />
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
          <NuxtLink to="/projects" class="button is-primary is-outlined is-family-code">
            all projects →
          </NuxtLink>
        </div>
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
              <div class="box focus-area">
                <span class="icon has-text-primary-on-scheme mb-3">
                  <AppIcon :name="area.icon" :size="28" />
                </span>
                <p class="title is-5 mb-2">{{ area.title }}</p>
                <p class="has-text-grey">{{ area.description }}</p>
              </div>
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

const { open } = useTerminal()
const { text: role } = useTypewriter(profile.roles)

const areas: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'globe',
    title: 'Full-stack Web',
    description:
      'From pixel-perfect Vue and Nuxt frontends to scalable Node.js backends — I build complete products, end to end.'
  },
  {
    icon: 'layers',
    title: 'Blockchain',
    description:
      'Smart contracts, token economics and decentralized infrastructure on Solana and EOS. Co-founded two blockchain companies.'
  },
  {
    icon: 'cpu',
    title: 'AI & Research',
    description:
      'Decentralized GPU compute for AI inference at Nosana, and a research background in genetic algorithms for web design.'
  }
]
</script>

<style scoped lang="scss">
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

// Let the 3D block overlap the terminal card slightly
.hero-scene-slot {
  margin-top: -5rem;
  margin-bottom: -2.5rem;
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

.focus-area {
  height: 100%;
  border: 1px solid var(--bulma-border-weak);
  transition: border-color 0.25s ease, transform 0.25s ease;

  &:hover {
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.5);
    transform: translateY(-4px);
  }
}
</style>
