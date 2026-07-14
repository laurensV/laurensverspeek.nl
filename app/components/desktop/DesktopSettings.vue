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
        <button
          v-if="accent === 'custom'"
          class="settings-swatch is-active is-custom"
          :style="{ backgroundColor: 'var(--bulma-primary)' }"
          title="custom colour — open the colour picker"
          aria-label="Accent: custom colour"
          :aria-pressed="true"
          @click="emit('open', 'colorpicker')"
        />
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">wallpaper</span>
      <div class="settings-swatches">
        <button
          v-for="(paper, i) in wallpapers"
          :key="paper.name"
          class="settings-swatch"
          :class="{ 'is-active': wallpaperIndex === i }"
          :style="{ background: paper.css }"
          :title="paper.name"
          :aria-label="`Wallpaper: ${paper.name}`"
          :aria-pressed="wallpaperIndex === i"
          @click="wallpaperIndex = i"
        />
      </div>
    </div>
    <p class="settings-note">// yes, this changes the real site behind the desktop</p>
    <div class="settings-row">
      <span class="settings-label">terminal text</span>
      <div class="settings-volume">
        <input v-model.number="fontScale.scale.value" type="range" min="0.7" max="1.6" step="0.1" aria-label="Terminal text scale">
        <span class="settings-volume-pct">{{ fontScale.scale.value.toFixed(1) }}×</span>
      </div>
    </div>
    <p class="settings-note">// the terminal's text scale — the same one `fontsize` and ctrl+= / ctrl+- set</p>

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
    <div class="settings-row">
      <span class="settings-label">screensaver</span>
      <div class="settings-options">
        <button
          v-for="id in saverIds"
          :key="id"
          :class="{ 'is-active': saver === id }"
          @click="saver = id"
        >[{{ saverNames[id] }}]</button>
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">night light</span>
      <div class="settings-options">
        <button :class="{ 'is-active': nightLight.enabled.value }" @click="nightLight.enabled.value = true">[on]</button>
        <button :class="{ 'is-active': !nightLight.enabled.value }" @click="nightLight.enabled.value = false">[off]</button>
      </div>
    </div>
    <div class="settings-row" :class="{ 'is-disabled': !nightLight.enabled.value }">
      <span class="settings-label">warmth</span>
      <div class="settings-volume">
        <input
          v-model.number="nightLight.warmth.value"
          type="range"
          min="0"
          max="100"
          :disabled="!nightLight.enabled.value"
          aria-label="Night light warmth"
        >
        <span class="settings-volume-pct">{{ nightLight.warmth.value }}%</span>
      </div>
    </div>

    <p class="settings-section mt-4"># sound</p>
    <div class="settings-row">
      <span class="settings-label">volume</span>
      <div class="settings-volume">
        <input v-model.number="sound.volume.value" type="range" min="0" max="100" aria-label="Volume">
        <span class="settings-volume-pct">{{ sound.muted.value ? 'muted' : `${sound.volume.value}%` }}</span>
        <div class="settings-options">
          <button @click="sound.toggleMute()">[{{ sound.muted.value ? 'unmute' : 'mute' }}]</button>
        </div>
      </div>
    </div>
    <p class="settings-note">// the one volume — tray, media app and the terminal's `volume` all share it</p>
    <div class="settings-row">
      <span class="settings-label">keyclick</span>
      <div class="settings-options">
        <button :class="{ 'is-active': keyclick.enabled.value }" @click="keyclick.toggle(true)">[on]</button>
        <button :class="{ 'is-active': !keyclick.enabled.value }" @click="keyclick.toggle(false)">[off]</button>
      </div>
    </div>
    <p class="settings-note">// a subtle mechanical tick per keystroke, in the terminal and lvOS text fields, through the shared volume (also the terminal's `keyclick`)</p>

    <p class="settings-section mt-4"># accessibility</p>
    <div class="settings-row">
      <span class="settings-label">reduce motion</span>
      <div class="settings-options">
        <button :class="{ 'is-active': reduceMotion.enabled.value }" @click="reduceMotion.enabled.value = true">[on]</button>
        <button :class="{ 'is-active': !reduceMotion.enabled.value }" @click="reduceMotion.enabled.value = false">[off]</button>
      </div>
    </div>
    <p class="settings-note">// flattens every animation and transition, whatever your system setting says</p>

    <p class="settings-section mt-4"># system</p>
    <p class="settings-note">
      lvOS 2.0 · kernel nuxt 4 · {{ windowCount }} window(s) open<br>
      settings are applied instantly and some persist in localStorage
    </p>

    <p class="settings-section mt-4"># danger zone</p>
    <div class="settings-row">
      <span class="settings-label">site files</span>
      <div class="settings-options">
        <button @click="reseedSite">[{{ reseeded ? `✓ restored ${reseeded}` : 'reseed originals' }}]</button>
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">everything</span>
      <div class="settings-options">
        <button class="is-danger" @click="factoryReset">
          [{{ resetArmed ? 'click again to wipe it all' : 'factory reset…' }}]
        </button>
      </div>
    </div>
    <p class="settings-note">
      // reseed regrows the site's own files (undoes your edits &amp; deletions)<br>
      // factory reset wipes ALL local data — files, scores, pet, the lot — and reboots
    </p>
  </div>
</template>

<script setup lang="ts">
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { Filesystem } from '~/utils/terminal/filesystem'
import { restoreSeeds } from '~/utils/terminal/siteFs'
import { storageWipe } from '~/utils/safeStorage'

// lvOS settings that actually control the real site: theme, CRT, party mode —
// plus the danger zone (reseed site files / factory reset).

const emit = defineEmits<{ open: [id: string] }>()

const colorMode = useColorMode()
const { crtActive, matrixActive, toggleCrt } = useSiteEffects()
const partyActive = useState(STATE_KEYS.fxParty, () => false)
const { accent, accents, setAccent } = useAccent()
const { wallpapers, wallpaper: wallpaperIndex } = useWallpaper()
const { saver, saverIds, saverNames } = useScreensaverChoice()
const nightLight = useNightLight()
const sound = useVolume()
const keyclick = useKeyClick()
// the terminal text scale — the one persisted pref that used to be terminal-only
const fontScale = useTermFontScale()
const reduceMotion = useReduceMotion()

const { name, setName } = useIdentity()
const nameInput = ref(name.value)
watch(name, (v) => (nameInput.value = v))
const applyName = () => {
  const applied = setName(nameInput.value)
  if (applied) nameInput.value = applied
  else nameInput.value = name.value
}

// read the shared window state directly — no need for the manager's listeners
const windows = useState<DesktopWindow[]>(STATE_KEYS.lvosWindows, () => [])
const windowCount = computed(() => windows.value.length)

// the rabbit hole opens right here — the desktop layout renders the rain
const enterMatrix = () => {
  matrixActive.value = true
}

// ---- danger zone ----
const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))
const reseeded = ref(0)
const reseedSite = () => {
  const result = restoreSeeds(files.value)
  files.value = result.files
  reseeded.value = result.restored
  setTimeout(() => (reseeded.value = 0), 2500)
}

// factory reset arms on the first click, fires on the second
const resetArmed = ref(false)
let disarmTimer: ReturnType<typeof setTimeout> | undefined
const factoryReset = () => {
  if (!resetArmed.value) {
    resetArmed.value = true
    disarmTimer = setTimeout(() => (resetArmed.value = false), 4000)
    return
  }
  clearTimeout(disarmTimer)
  storageWipe()
  window.location.reload()
}
onUnmounted(() => clearTimeout(disarmTimer))
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
  // wrap the controls below the label on a narrow window instead of clipping
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.3rem 0;

  .settings-label {
    color: hsl(var(--lv-scheme-hs), 80%);
  }

  &.is-disabled {
    opacity: 0.45;
  }
}

.settings-volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  input[type='range'] {
    width: 8rem;
    accent-color: var(--bulma-primary);
  }

  .settings-volume-pct {
    min-width: 3.2em;
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.7rem;
    text-align: right;
  }
}

.settings-options {
  display: flex;
  // let the option buttons (e.g. the three screensaver names) wrap to a second
  // line on a narrow window rather than clipping the last one off the edge
  flex-wrap: wrap;
  justify-content: flex-end;
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

    &.is-danger {
      color: hsl(var(--lv-scheme-hs), 55%);

      &:hover {
        color: var(--bulma-danger);
      }
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
    box-shadow: 0 0 0 2px hsl(var(--lv-scheme-hs), 10%), 0 0 0 3px currentcolor;
    outline: none;
  }

  // a 21px circle is a fiddly target for a picker on a phone — grow it
  @media (pointer: coarse) {
    width: 2rem;
    height: 2rem;
  }
}

.settings-note {
  font-size: 0.68rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
