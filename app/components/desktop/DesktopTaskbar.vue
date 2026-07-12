<template>
  <div class="lvos-taskbar is-family-code">
    <button
      class="lvos-start"
      :class="{ 'is-open': startOpen }"
      :aria-expanded="startOpen"
      aria-label="Start menu"
      @click="toggleStart"
    >
      ⚡ lvOS
    </button>
    <div v-if="startOpen" class="lvos-start-menu">
      <button @click="openFromStart('about-os')">ℹ about this computer</button>
      <button @click="openFromStart('settings')">⚙ settings</button>
      <button @click="terminalFromStart">>_ terminal</button>
      <button @click="emit('tile'); startOpen = false">▦ tile windows</button>
      <button @click="emit('run'); startOpen = false">▷ run… (alt+r)</button>
      <button @click="emit('iso'); startOpen = false">⤓ download lvos.iso</button>
      <button @click="emit('screenshot'); startOpen = false">⌜⌟ screenshot</button>
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
      <button @click="emit('lock')">🔒 lock</button>
      <button @click="emit('logout')">← log out</button>
      <button @click="emit('reboot')">↻ reboot</button>
      <button @click="emit('shutdown')">⏻ shut down</button>
    </div>

    <div
      v-for="win in windows"
      :key="win.id"
      class="lvos-task-wrap"
      @pointerenter="emit('peek', win.id)"
      @pointerleave="emit('peek', null)"
    >
      <button
        class="lvos-task"
        :class="{ 'is-minimized': win.minimized }"
        :data-win="win.id"
        @click="emit('minimize', win)"
      >
        {{ win.title }}
      </button>
      <!-- hover preview: full title, and the desktop peeks the window (see parent) -->
      <span class="lvos-task-preview is-family-code">{{ win.title }}</span>
    </div>

    <!-- the tray: weather, battery, tiling, fullscreen, bell and clock sit
         together at the right, like every desktop since 1995 -->
    <div class="lvos-tray">
      <span
        v-if="weather.temp.value !== null"
        class="lvos-tray-btn lvos-weather"
        :title="`Amsterdam · live from open-meteo`"
      >{{ weather.glyph.value }} {{ weather.temp.value }}°</span>

      <span
        v-if="battery.supported.value && battery.percent.value !== null"
        class="lvos-tray-btn lvos-battery"
        :title="`battery: ${battery.percent.value}% — ${battery.charging.value ? 'charging' : 'discharging'}`"
      >{{ battery.charging.value ? '⚡' : '▮' }}{{ battery.percent.value }}%</span>

      <button
        class="lvos-tray-btn lvos-tile"
        title="Tile windows"
        aria-label="Tile windows into a grid"
        @click="emit('tile')"
      >
        <AppIcon name="grid" :size="14" />
      </button>

      <button
        class="lvos-tray-btn lvos-fullscreen"
        :aria-pressed="isFullscreen"
        :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
        aria-label="Toggle fullscreen"
        @click="toggleFullscreen"
      >
        <AppIcon :name="isFullscreen ? 'minimize' : 'maximize'" :size="14" />
      </button>

      <button
        class="lvos-tray-btn lvos-bell"
        :class="{ 'is-open': notifOpen }"
        :aria-expanded="notifOpen"
        aria-label="Notifications"
        @click="toggleNotifications"
      >
        <AppIcon name="bell" :size="14" />
        <span v-if="unread > 0" class="lvos-bell-badge">{{ unread > 9 ? '9+' : unread }}</span>
      </button>
      <DesktopNotifCenter v-if="notifOpen" :notifications="notifications" @clear="emit('clear')" />

      <button
        class="lvos-clock"
        :class="{ 'is-open': calendarOpen }"
        :aria-expanded="calendarOpen"
        aria-label="Toggle calendar"
        @click="toggleCalendar"
      >
        {{ clock }}
      </button>
      <DesktopCalendarPopover v-if="calendarOpen" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNow, useFullscreen, useEventListener } from '@vueuse/core'
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { Wallpaper } from '~/composables/useWallpaper'
import type { Toast } from '~/composables/useDesktopToasts'

defineProps<{ windows: DesktopWindow[], wallpapers: Wallpaper[], notifications: Toast[], unread: number }>()
const emit = defineEmits<{
  open: [id: string]
  terminal: []
  logout: []
  lock: []
  shutdown: []
  reboot: []
  minimize: [win: DesktopWindow]
  peek: [id: string | null]
  read: []
  clear: []
  tile: []
  run: []
  iso: []
  screenshot: []
}>()

// these are v-models so the parent can dismiss them on Escape
const startOpen = defineModel<boolean>('startOpen', { default: false })
const calendarOpen = defineModel<boolean>('calendarOpen', { default: false })
const notifOpen = defineModel<boolean>('notifOpen', { default: false })
const wallpaper = defineModel<number>('wallpaper', { default: 0 })

// the taskbar popovers behave like popovers: opening one closes the others,
// and clicking anywhere outside the taskbar dismisses them all
const closePopovers = () => {
  startOpen.value = false
  calendarOpen.value = false
  notifOpen.value = false
}

const toggleNotifications = () => {
  const next = !notifOpen.value
  closePopovers()
  notifOpen.value = next
  if (next) emit('read') // opening the panel clears the unread badge
}

const toggleCalendar = () => {
  const next = !calendarOpen.value
  closePopovers()
  calendarOpen.value = next
}

const toggleStart = () => {
  const next = !startOpen.value
  closePopovers()
  startOpen.value = next
}

useEventListener(document, 'pointerdown', (event: PointerEvent) => {
  if ((event.target as HTMLElement).closest('.lvos-taskbar')) return
  closePopovers()
})

// real battery in the tray, when the browser admits to having one
const battery = useBattery()
// a live temperature chip (Amsterdam)
const weather = useWeatherChip()

// browser fullscreen for the whole desktop page
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

const openFromStart = (id: string) => {
  emit('open', id)
  startOpen.value = false
}
const terminalFromStart = () => {
  emit('terminal')
  startOpen.value = false
}

// the clock lives here; its calendar popover is DesktopCalendarPopover
const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)
</script>

<style scoped lang="scss">
.lvos-taskbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.4rem;
  padding: 0 0.6rem;

  // the whole bar grows on touch so nothing inside it is a 20px target
  @media (pointer: coarse) {
    height: 3.1rem;
  }
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.95);
  border-top: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  font-size: 0.75rem;
  color: hsl(var(--lv-scheme-hs), 85%);
}

.lvos-start {
  padding: 0.3rem 0.8rem;

  // a thumb-sized start button on touch screens
  @media (pointer: coarse) {
    padding: 0.55rem 1.1rem;
    font-size: 0.85rem;
  }
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &.is-open {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}

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
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
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

.lvos-task-wrap {
  position: relative;
}

.lvos-task {
  padding: 0.3rem 0.7rem;

  @media (pointer: coarse) {
    padding: 0.55rem 0.9rem;
  }
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: none;
  border-radius: var(--bulma-radius-small);
  background-color: hsla(var(--lv-primary-hsl), 0.12);
  color: inherit;
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;

  &.is-minimized {
    opacity: 0.5;
  }
}

// hover preview tooltip floating above the taskbar button
.lvos-task-preview {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%) translateY(0.25rem);
  padding: 0.3rem 0.6rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-small);
  background-color: hsla(var(--lv-scheme-hs), 10%, 0.98);
  color: hsl(var(--lv-scheme-hs), 90%);
  font-size: 0.7rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.lvos-task-wrap:hover .lvos-task-preview {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .lvos-task-preview {
    transition: none;
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

// the tray absorbs the free space so everything in it right-aligns
.lvos-tray {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
}

// tray buttons (tile, fullscreen, …) sit at the right, next to the clock
.lvos-tray-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem;

  @media (pointer: coarse) {
    padding: 0.55rem 0.45rem;
  }
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 60%);
  cursor: pointer;

  &:hover,
  &[aria-pressed='true'] {
    color: var(--bulma-primary);
  }
}

.lvos-bell {
  position: relative;

  &.is-open {
    color: var(--bulma-primary);
  }

  .lvos-bell-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 0.85rem;
    height: 0.85rem;
    padding: 0 0.15rem;
    border-radius: 0.5rem;
    background-color: var(--bulma-primary);
    color: var(--bulma-primary-invert);
    font-size: 0.55rem;
    line-height: 0.85rem;
    text-align: center;
  }
}


.lvos-clock {
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 60%);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;

  &:hover,
  &.is-open {
    color: var(--bulma-primary);
  }
}


.lvos-battery,
.lvos-weather {
  color: hsl(var(--lv-scheme-hs), 70%);
  font-size: 0.68rem;
  cursor: default;
}
</style>
