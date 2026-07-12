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
            <NuxtLink to="/projects" class="see-all is-family-code is-size-6 is-hidden-mobile">
              all projects <span class="see-all-arrow" aria-hidden="true">→</span>
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

    <HomeLatestPosts />

    <HomeWhatIDo />
  </div>
</template>

<script setup lang="ts">
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

</style>
