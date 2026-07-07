<template>
  <div class="browser is-family-code">
    <div class="browser-bar">
      <button title="Reload" @click="reload">⟳</button>
      <select v-model="url" class="browser-url">
        <option v-for="page in PAGES" :key="page" :value="page">
          lv://{{ page === '/' ? 'home' : page.slice(1) }}
        </option>
      </select>
    </div>
    <iframe
      :key="frameKey"
      :src="url"
      class="browser-frame"
      title="lv browser"
      sandbox="allow-scripts allow-same-origin"
    />
    <p class="browser-note">lv browser 2.0 — the web, but it's just this site</p>
  </div>
</template>

<script setup lang="ts">
// A browser inside the site inside the browser. Browserception.
const PAGES = ['/', '/projects', '/blog', '/about', '/uses', '/now']

const url = ref('/blog')
const frameKey = ref(0)

const reload = () => frameKey.value++
</script>

<style scoped lang="scss">
.browser {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.browser-bar {
  display: flex;
  gap: 0.5rem;

  button {
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: inherit;
    font: inherit;
    padding: 0.15rem 0.5rem;
    cursor: pointer;
  }

  .browser-url {
    flex: 1;
    padding: 0.15rem 0.5rem;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
    border-radius: var(--bulma-radius-small);
    background-color: hsla(var(--lv-scheme-hs), 14%, 0.9);
    color: inherit;
    font: inherit;
    font-size: 0.75rem;
  }
}

.browser-frame {
  width: 100%;
  height: 20rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 10%);
}

.browser-note {
  font-size: 0.65rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
