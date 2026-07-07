<template>
  <div class="settings is-family-code">
    <p class="settings-section"># appearance</p>
    <div class="settings-row">
      <span class="settings-label">site theme</span>
      <div class="settings-options">
        <button
          v-for="option in ['dark', 'light', 'system']"
          :key="option"
          :class="{ 'is-active': colorMode.preference === option }"
          @click="colorMode.preference = option"
        >[{{ option }}]</button>
      </div>
    </div>
    <p class="settings-note">// yes, this changes the real site behind the desktop</p>

    <p class="settings-section mt-4"># effects</p>
    <div class="settings-row">
      <span class="settings-label">crt scanlines</span>
      <div class="settings-options">
        <button :class="{ 'is-active': crtActive }" @click="toggleCrt(true)">[on]</button>
        <button :class="{ 'is-active': !crtActive }" @click="toggleCrt(false)">[off]</button>
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">party mode</span>
      <div class="settings-options">
        <button :class="{ 'is-active': partyActive }" @click="partyActive = true">[on]</button>
        <button :class="{ 'is-active': !partyActive }" @click="partyActive = false">[off]</button>
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">matrix rain</span>
      <div class="settings-options">
        <button @click="enterMatrix">[follow the white rabbit]</button>
      </div>
    </div>

    <p class="settings-section mt-4"># system</p>
    <p class="settings-note">
      lvOS 2.0 · kernel nuxt 4 · {{ windowCount }} window(s) open<br>
      settings are applied instantly and some persist in localStorage
    </p>
  </div>
</template>

<script setup lang="ts">
import type { DesktopWindow } from '~/composables/useWindowManager'

// lvOS settings that actually control the real site: theme, CRT, party mode.

const colorMode = useColorMode()
const { crtActive, matrixActive, desktopActive, toggleCrt } = useSiteEffects()
const partyActive = useState('fx-party', () => false)

// read the shared window state directly — no need for the manager's listeners
const windows = useState<DesktopWindow[]>('lvos-windows', () => [])
const windowCount = computed(() => windows.value.length)

const enterMatrix = () => {
  desktopActive.value = false
  matrixActive.value = true
}
</script>

<style scoped lang="scss">
.settings {
  font-size: 0.78rem;
}

.settings-section {
  color: var(--bulma-primary);
  margin-bottom: 0.5rem;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3rem 0;

  .settings-label {
    color: hsl(var(--lv-scheme-hs), 80%);
  }
}

.settings-options {
  display: flex;
  gap: 0.35rem;

  button {
    border: none;
    background: none;
    padding: 0.15rem 0.2rem;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    cursor: pointer;

    &:hover {
      color: hsl(var(--lv-scheme-hs), 90%);
    }

    &.is-active {
      color: var(--bulma-primary);
    }
  }
}

.settings-note {
  font-size: 0.68rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
