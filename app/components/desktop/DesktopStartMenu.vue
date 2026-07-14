<template>
  <div class="lvos-start-menu">
    <!-- search: focused the moment the menu opens, so you can just start typing
         to find an app (Windows-style) instead of hunting the icon grid -->
    <div class="lvos-start-search">
      <AppIcon name="search" :size="13" class="lvos-start-search-icon" />
      <input
        ref="searchRef"
        v-model="query"
        type="text"
        class="lvos-start-search-input"
        placeholder="search apps…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Search apps"
        @keydown.enter="launchFirst"
        @keydown.esc="onSearchEsc"
      >
    </div>

    <!-- typing shows matching apps and launches them; empty shows the menu -->
    <div v-if="query.trim()" class="lvos-start-results">
      <button
        v-for="app in results"
        :key="app.id"
        class="lvos-start-app"
        @click="launch(app.id)"
      >
        <AppIcon :name="app.icon" :size="16" />
        <span>{{ app.label }}</span>
      </button>
      <p v-if="!results.length" class="lvos-start-empty">no apps match “{{ query.trim() }}”</p>
    </div>

    <template v-else>
      <p class="lvos-start-label">system</p>
      <button @click="emit('select', 'about')">ℹ about this computer</button>
      <button @click="emit('select', 'settings')">⚙ settings</button>
      <button @click="emit('select', 'terminal')">&gt;_ terminal</button>
      <button @click="emit('select', 'tile')">▦ tile windows</button>
      <button @click="emit('select', 'run')">▷ run… (alt+r)</button>
      <button @click="emit('select', 'screenshot')">⎙ screenshot</button>
      <button @click="emit('select', 'iso')">⤓ download lvos.iso</button>
      <button @click="emit('select', 'update')">⟳ system update</button>

      <p class="lvos-start-label">wallpaper</p>
      <div class="lvos-wallpapers">
        <button
          v-for="(paper, i) in wallpapers"
          :key="i"
          class="lvos-wallpaper-swatch"
          :class="{ 'is-active': wallpaper === i }"
          :style="{ background: paper.swatch }"
          :title="paper.name"
          :aria-label="`Wallpaper: ${paper.name}`"
          :aria-pressed="wallpaper === i"
          @click="wallpaper = i"
        />
      </div>

      <!-- the four session/power actions as a compact labelled row instead of
           four full-width rows — the menu was getting very tall -->
      <p class="lvos-start-label">session</p>
      <div class="lvos-start-power">
        <button title="Lock" @click="emit('select', 'lock')">
          <span class="pw-glyph">🔒</span><span class="pw-label">lock</span>
        </button>
        <button title="Log out" @click="emit('select', 'logout')">
          <span class="pw-glyph">←</span><span class="pw-label">log out</span>
        </button>
        <button title="Reboot" @click="emit('select', 'reboot')">
          <span class="pw-glyph">↻</span><span class="pw-label">reboot</span>
        </button>
        <button title="Shut down" @click="emit('select', 'shutdown')">
          <span class="pw-glyph">⏻</span><span class="pw-label">shut down</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Wallpaper } from '~/composables/useWallpaper'
import { DESKTOP_APPS, type StartAction } from '~/utils/desktopApps'

// The lvOS start menu — pulled out of DesktopTaskbar so the bar stays about the
// tray/clock/tasks. It reports every choice as one `select` action the taskbar
// routes; the wallpaper swatch is a v-model so the pick lands in the shared
// state. The search box launches any app by id — a `launch` action the taskbar
// forwards to the same launcher Alt+R uses.

defineProps<{ wallpapers: Wallpaper[] }>()
const wallpaper = defineModel<number>('wallpaper', { default: 0 })
const emit = defineEmits<{ select: [action: StartAction], launch: [id: string] }>()

const query = ref('')
const searchRef = ref<HTMLInputElement>()

// match on id or label so 'mines', 'time', 'terminal' all find their app; the
// 'log out' entry is reachable from the session row, so keep it out of results
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return DESKTOP_APPS.filter(
    (app) => app.action !== 'logout' && (app.id.includes(q) || app.label.toLowerCase().includes(q))
  )
})

const launch = (id: string) => {
  query.value = ''
  emit('launch', id)
}
const launchFirst = () => {
  const first = results.value[0]
  if (first) launch(first.id)
}
// esc clears a query first, then (empty) lets the desktop close the whole menu
const onSearchEsc = (event: KeyboardEvent) => {
  if (query.value) {
    query.value = ''
    event.stopPropagation()
  }
}

// focus the search the instant the menu opens, so typing goes straight to it
onMounted(() => searchRef.value?.focus())
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

.lvos-start-menu {
  position: absolute;
  bottom: 2.6rem;

  @media (pointer: coarse) {
    bottom: 3.3rem;
  }
  left: 0.5rem;
  display: flex;
  flex-direction: column;
  min-width: 13rem;
  max-height: min(72vh, 34rem);
  overflow-y: auto;
  padding: 0.35rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);

  @include lv-glass(8%, 0.98, 0.8, 16px);

  z-index: 10000;

  button {
    padding: 0.5rem 0.7rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 88%);
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }
  }
}

// search box pinned at the top of the menu
.lvos-start-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  padding: 0.1rem 0.55rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background-color: hsla(var(--lv-scheme-hs), 50%, 0.08);

  &:focus-within {
    border-color: hsla(var(--lv-primary-hsl), 0.6);
  }

  .lvos-start-search-icon {
    flex-shrink: 0;
    color: hsl(var(--lv-scheme-hs), 55%);
  }
}

.lvos-start-search-input {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0;
  border: none;
  outline: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 92%);
  font: inherit;

  &::placeholder {
    color: hsl(var(--lv-scheme-hs), 45%);
  }
}

// live app-search results
.lvos-start-results {
  display: flex;
  flex-direction: column;
}

.lvos-start-menu .lvos-start-app {
  display: flex;
  align-items: center;
  gap: 0.55rem;

  :deep(svg) {
    flex-shrink: 0;
    color: var(--bulma-primary);
  }
}

.lvos-start-empty {
  padding: 0.5rem 0.7rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.72rem;
}

// the four session actions sit in one compact labelled row, not four tall rows
.lvos-start-power {
  display: flex;
  gap: 0.3rem;
  padding: 0.1rem 0.2rem 0.2rem;

  button {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.4rem 0.1rem;
    text-align: center;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  }

  .pw-glyph {
    font-size: 0.95rem;
    line-height: 1;
  }

  .pw-label {
    font-size: 0.56rem;
    white-space: nowrap;
    color: hsl(var(--lv-scheme-hs), 65%);
  }
}

.lvos-start-label {
  padding: 0.4rem 0.7rem 0.2rem;
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.lvos-wallpapers {
  display: flex;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem 0.4rem;

  .lvos-wallpaper-swatch {
    width: 1.6rem;
    height: 1.6rem;
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.4);
    border-radius: 2px;
    cursor: pointer;

    &.is-active {
      border-color: var(--bulma-primary);
      box-shadow: 0 0 0 1px var(--bulma-primary);
    }
  }
}
</style>
