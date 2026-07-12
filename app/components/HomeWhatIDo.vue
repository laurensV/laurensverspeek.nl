<template>
  <section class="section">
    <div class="container">
      <RevealBlock>
        <p class="overline mb-2">what-i-do $</p>
        <ScrambleHeading tag="h2" class="title is-3 mb-6" text="What I do" />
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
</template>

<script setup lang="ts">
import type { IconName } from '~/utils/icons'

// The three "what I do" cards, styled as little terminal windows to match the
// TUI language of the project cards and lvOS windows.
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
.is-fullheight-reveal {
  height: 100%;
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
