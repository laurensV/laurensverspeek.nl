<template>
  <button class="hero-terminal is-family-code" title="Open interactive terminal" @click="open">
    <span class="hero-terminal-bar">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="hero-terminal-title">laurens@{{ profile.domain }}</span>
    </span>
    <span class="hero-terminal-body">
      <span class="line"><span class="prompt">$</span> whoami</span>
      <span class="line output">{{ profile.name }} — full-stack &amp; blockchain dev</span>
      <span class="line"><span class="prompt">$</span> ls ./work</span>
      <span class="line output">nosana/&nbsp;&nbsp;effect-ai/</span>
      <span class="line"><span class="prompt">$</span> cat mission.txt</span>
      <span class="line output">decentralize compute, ship cool things</span>
      <span class="line"><span class="prompt">$</span> <span class="blink-cursor" /></span>
      <span class="line hint">// click to open the interactive terminal</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

const { open } = useTerminal()
</script>

<style scoped lang="scss">
.hero-terminal {
  display: block;
  width: 100%;
  max-width: 26rem;
  padding: 0;
  text-align: left;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.35);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 6%, 0.9);
  box-shadow: 0 0 50px
    hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.1);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 0 70px
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.2);
  }
}

.hero-terminal-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 50%, 0.15);

  .dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background-color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 30%);
  }

  .hero-terminal-title {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 55%);
  }
}

.hero-terminal-body {
  display: block;
  padding: 1rem;
  line-height: 1.7;

  .line {
    display: block;
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 88%);
  }

  .prompt {
    color: var(--bulma-primary);
    font-weight: 600;
  }

  .output {
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 65%);
  }

  .hint {
    margin-top: 0.5rem;
    font-size: 0.72rem;
    color: var(--bulma-primary);
    opacity: 0.7;
  }
}
</style>
