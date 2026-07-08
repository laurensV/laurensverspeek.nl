<template>
  <div class="settings is-family-code">
    <p class="settings-section"># identity</p>
    <div class="settings-row">
      <span class="settings-label">display name</span>
      <input
        v-model="nameInput"
        class="settings-name"
        maxlength="24"
        spellcheck="false"
        aria-label="Display name"
        @change="applyName"
        @keydown.enter="applyName"
      >
    </div>
    <p class="settings-note">// shown in the terminal prompt and to other visitors' cursors</p>

    <p class="settings-section mt-4"># appearance</p>
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
    <div class="settings-row">
      <span class="settings-label">accent</span>
      <div class="settings-swatches">
        <button
          v-for="a in accents"
          :key="a.name"
          class="settings-swatch"
          :class="{ 'is-active': accent === a.name }"
          :style="{ backgroundColor: `hsl(${a.h}, ${a.s}%, ${a.l}%)` }"
          :title="a.name"
          :aria-label="`Accent: ${a.name}`"
          :aria-pressed="accent === a.name"
          @click="setAccent(a.name)"
        />
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
const { accent, accents, setAccent } = useAccent()

const { name, setName } = useIdentity()
const nameInput = ref(name.value)
watch(name, (v) => (nameInput.value = v))
const applyName = () => {
  const applied = setName(nameInput.value)
  if (applied) nameInput.value = applied
  else nameInput.value = name.value
}

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

.settings-name {
  width: 10rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
  color: hsl(var(--lv-scheme-hs), 90%);
  font: inherit;
  font-size: 0.78rem;

  &:focus {
    outline: none;
    border-color: hsla(var(--lv-primary-hsl), 0.6);
  }
}

.settings-swatches {
  display: flex;
  gap: 0.35rem;
}

.settings-swatch {
  width: 1.3rem;
  height: 1.3rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.4);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;

  &.is-active {
    box-shadow: 0 0 0 2px hsl(var(--lv-scheme-hs), 10%), 0 0 0 3px currentColor;
    outline: none;
  }
}

.settings-note {
  font-size: 0.68rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
