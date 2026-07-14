<template>
  <div class="lvos-start-menu">
    <button @click="emit('select', 'about')">ℹ about this computer</button>
    <button @click="emit('select', 'settings')">⚙ settings</button>
    <button @click="emit('select', 'terminal')">>_ terminal</button>
    <button @click="emit('select', 'tile')">▦ tile windows</button>
    <button @click="emit('select', 'run')">▷ run… (alt+r)</button>
    <button @click="emit('select', 'iso')">⤓ download lvos.iso</button>
    <button @click="emit('select', 'screenshot')">⌜⌟ screenshot</button>
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
    <button @click="emit('select', 'lock')">🔒 lock</button>
    <button @click="emit('select', 'logout')">← log out</button>
    <button @click="emit('select', 'reboot')">↻ reboot</button>
    <button @click="emit('select', 'shutdown')">⏻ shut down</button>
  </div>
</template>

<script setup lang="ts">
import type { Wallpaper } from '~/composables/useWallpaper'
import type { StartAction } from '~/utils/desktopApps'

// The lvOS start menu — pulled out of DesktopTaskbar so the bar stays about the
// tray/clock/tasks. It reports every choice as one `select` action the taskbar
// routes; the wallpaper swatch is a v-model so the pick lands in the shared state.

defineProps<{ wallpapers: Wallpaper[] }>()
const wallpaper = defineModel<number>('wallpaper', { default: 0 })
const emit = defineEmits<{ select: [action: StartAction] }>()
</script>

<style scoped lang="scss">
.lvos-start-menu {
  position: absolute;
  bottom: 2.6rem;

  @media (pointer: coarse) {
    bottom: 3.3rem;
  }
  left: 0.5rem;
  display: flex;
  flex-direction: column;
  min-width: 11rem;
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
