<template>
  <section class="section">
    <div class="container keyboard-page">
      <p class="overline mb-2">man $ ./shortcuts</p>
      <h1 class="title is-2 mb-2">Keyboard reference</h1>
      <p class="subtitle is-6 has-text-grey mb-5">
        Every shortcut and trick across the site, the terminal and lvOS — one printable card.
      </p>

      <div class="keyboard-grid">
        <section v-for="group in siteShortcuts" :key="group.title" class="keyboard-group">
          <h2 class="keyboard-group-title is-family-code">{{ group.title }}</h2>
          <ShortcutRows :rows="group.rows" keys-width="9rem" />
        </section>
        <section class="keyboard-group">
          <h2 class="keyboard-group-title is-family-code">lvOS desktop</h2>
          <ShortcutRows :rows="desktopShortcuts" keys-width="9rem" />
        </section>
      </div>

      <p class="is-family-code is-size-7 has-text-grey mt-5">
        // press <kbd>?</kbd> anywhere for the same list as an overlay · <button class="keyboard-print" @click="print">[print this page]</button>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { siteShortcuts, desktopShortcuts } from '~/data/shortcuts'

const ogImage = `${SITE_URL}/og/page-keyboard.png`
useSeo({
  title: 'Keyboard reference — Laurens Verspeek',
  description: 'Every keyboard shortcut and trick across laurensverspeek.nl — the site, the terminal and lvOS.',
  path: '/keyboard',
  image: ogImage,
  ogTitle: 'Keyboard reference'
})

const print = () => window.print()
</script>

<style scoped lang="scss">
.keyboard-page {
  max-width: 54rem;
}

.keyboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: 1.5rem 2.5rem;
}

.keyboard-group-title {
  margin-bottom: 0.5rem;
  color: var(--bulma-primary-on-scheme);
  font-size: 0.8rem;
  text-transform: lowercase;
  letter-spacing: 0.08em;
}

.keyboard-print {
  border: none;
  background: none;
  padding: 0;
  color: var(--bulma-primary-on-scheme);
  font: inherit;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

@media print {
  .keyboard-print {
    display: none;
  }
}
</style>
