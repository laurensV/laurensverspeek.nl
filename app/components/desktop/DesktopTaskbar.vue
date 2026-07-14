<template>
  <div class="lvos-taskbar is-family-code">
    <button
      class="lvos-start"
      :class="{ 'is-open': startOpen }"
      :aria-expanded="startOpen"
      aria-label="Start menu"
      @click="toggleStart"
    >
      <AppIcon name="grid" :size="14" /> lvOS
    </button>
    <DesktopStartMenu
      v-if="startOpen"
      v-model:wallpaper="wallpaper"
      :wallpapers="wallpapers"
      @select="onStartSelect"
      @launch="onStartLaunch"
    />

    <!-- the open-window buttons scroll as a group on touch so they can never
         push the tray off the right edge of a narrow phone -->
    <div class="lvos-tasks">
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
    </div>

    <!-- the tray: weather, battery, tiling, fullscreen, bell and clock sit
         together at the right, like every desktop since 1995. On a phone the
         two optional read-outs (weather, battery) collapse behind a ⋯ toggle so
         the row can't overflow — and the toggle only appears when at least one
         of them is actually present, so it's never a menu that opens onto
         nothing. Tile and fullscreen stay in the row: they're always there. -->
    <div class="lvos-tray">
      <button
        v-if="hasTrayExtras"
        class="lvos-tray-btn lvos-tray-toggle"
        :class="{ 'is-open': moreOpen }"
        :aria-expanded="moreOpen"
        aria-label="More tray items"
        @click="toggleMore"
      >⋯</button>
      <!-- tapping any item bubbles up and dismisses the collapsed tray, so it
           doesn't hover over the app/window the tap just opened -->
      <div class="lvos-tray-more" :class="{ 'is-open': moreOpen && hasTrayExtras }" @click="moreOpen = false">
        <button
          v-if="weather.temp.value !== null"
          class="lvos-tray-btn lvos-weather"
          title="Amsterdam · live from open-meteo — open the forecast"
          aria-label="Open the weather app"
          @click="emit('open', 'weather')"
        >{{ weather.glyph.value }} {{ weather.temp.value }}°</button>

        <span
          v-if="battery.supported.value && battery.percent.value !== null"
          class="lvos-tray-btn lvos-battery"
          :title="`battery: ${battery.percent.value}% — ${battery.charging.value ? 'charging' : 'discharging'}`"
        >{{ battery.charging.value ? '⚡' : '▮' }}{{ battery.percent.value }}%</span>
      </div>

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
        class="lvos-tray-btn lvos-volume"
        :class="{ 'is-open': volumeOpen }"
        :aria-expanded="volumeOpen"
        aria-label="Volume"
        :title="muted ? 'muted' : `volume: ${volume}%`"
        @click="toggleVolume"
      >{{ volGlyph }}</button>
      <div v-if="volumeOpen" class="lvos-volume-pop">
        <button
          class="lvos-volume-mute"
          :aria-pressed="muted"
          :aria-label="muted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >{{ volGlyph }}</button>
        <input
          v-model.number="volume"
          type="range"
          min="0"
          max="100"
          aria-label="Volume level"
        >
        <span class="lvos-volume-val">{{ muted ? '--' : volume }}</span>
      </div>

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
import { useNow, useFullscreen } from '@vueuse/core'
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { Wallpaper } from '~/composables/useWallpaper'
import type { Toast } from '~/composables/useDesktopToasts'
import type { StartAction } from '~/utils/desktopApps'

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
  update: []
  launch: [id: string]
}>()

// these are v-models so the parent can dismiss them on Escape
const startOpen = defineModel<boolean>('startOpen', { default: false })
const calendarOpen = defineModel<boolean>('calendarOpen', { default: false })
const notifOpen = defineModel<boolean>('notifOpen', { default: false })
const volumeOpen = defineModel<boolean>('volumeOpen', { default: false })
const wallpaper = defineModel<number>('wallpaper', { default: 0 })

// collapsed-tray state is local (touch-only, dismissed by outside-click)
const moreOpen = ref(false)
const { toggleStart, toggleCalendar, toggleNotifications, toggleVolume, toggleMore } = useTaskbarPopovers(
  startOpen, calendarOpen, notifOpen, volumeOpen, moreOpen, () => emit('read')
)

// one real volume: the slider here is the same state the chiptune engine obeys
const { volume, muted, glyph: volGlyph, toggleMute } = useVolume()

// real battery in the tray, when the browser admits to having one
const battery = useBattery()
// a live temperature chip (Amsterdam)
const weather = useWeatherChip()

// only these two are collapsible; the ⋯ toggle appears solely when one of them
// is present, so it can never open onto an empty menu
const hasTrayExtras = computed(() =>
  weather.temp.value !== null ||
  (battery.supported.value && battery.percent.value !== null)
)

// browser fullscreen for the whole desktop page
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

// the start-menu search launches an app by id — close the menu and hand it to
// the desktop's launcher (the same one Alt+R uses)
const onStartLaunch = (id: string) => {
  startOpen.value = false
  emit('launch', id)
}

// route the start menu's single `select` action onto the taskbar's own emits
const onStartSelect = (action: StartAction) => {
  startOpen.value = false
  switch (action) {
    case 'about': emit('open', 'about-os'); break
    case 'settings': emit('open', 'settings'); break
    case 'terminal': emit('terminal'); break
    case 'tile': emit('tile'); break
    case 'run': emit('run'); break
    case 'iso': emit('iso'); break
    case 'screenshot': emit('screenshot'); break
    case 'update': emit('update'); break
    case 'lock': emit('lock'); break
    case 'logout': emit('logout'); break
    case 'reboot': emit('reboot'); break
    case 'shutdown': emit('shutdown'); break
  }
}

// the clock lives here; its calendar popover is DesktopCalendarPopover
const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

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
  // blur on a pseudo-element so the bar doesn't become a stacking context
  // that traps the start menu's z-index below the windows
  @include lv-glass-behind(6%, 0.95, 0.72);

  border-top: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  font-size: 0.75rem;
  color: hsl(var(--lv-scheme-hs), 85%);
}

.lvos-start {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
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

.lvos-volume-pop {
  position: absolute;
  right: 0.5rem;
  bottom: 2.6rem;

  @media (pointer: coarse) {
    bottom: 3.3rem;
  }
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);

  @include lv-glass(8%, 0.98, 0.8, 16px);

  z-index: 10000;

  input[type='range'] {
    width: 8rem;
    accent-color: var(--bulma-primary);
  }
}

.lvos-volume-mute {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  line-height: 1;
}

.lvos-volume-val {
  min-width: 2ch;
  color: hsl(var(--lv-scheme-hs), 88%);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.lvos-tasks {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;

  // on touch the strip shrinks and scrolls instead of shoving the tray
  // off-screen; on desktop it stays visible so the upward hover preview
  // (which an overflow context would clip) still shows
  @media (pointer: coarse) {
    flex: 0 1 auto;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

.lvos-task-wrap {
  position: relative;
  flex-shrink: 0;
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

  @include lv-glass(10%, 0.98, 0.82);

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

// the tray absorbs the free space so everything in it right-aligns, and never
// shrinks — the task strip scrolls instead so the tray stays reachable
.lvos-tray {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  flex-shrink: 0;
}

// the ⋯ toggle only exists on touch; on desktop the group sits inline
.lvos-tray-toggle {
  display: none;
}

.lvos-tray-more {
  display: contents;
}

@media (pointer: coarse) {
  .lvos-tray-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  // weather + battery collapse into a popover so the tray can't overflow a
  // narrow phone; tile, fullscreen, volume, bell and clock stay in the row
  .lvos-tray-more {
    display: none;

    &.is-open {
      display: flex;
      position: absolute;
      right: 0.5rem;
      bottom: 3.3rem;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.5rem;
      z-index: 10000;
      border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
      border-radius: var(--bulma-radius);

      @include lv-glass(8%, 0.98, 0.8, 16px);
    }
  }
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
