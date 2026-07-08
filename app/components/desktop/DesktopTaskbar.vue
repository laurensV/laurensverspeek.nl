<template>
  <div class="lvos-taskbar is-family-code">
    <button
      class="lvos-start"
      :class="{ 'is-open': startOpen }"
      :aria-expanded="startOpen"
      aria-label="Start menu"
      @click="startOpen = !startOpen"
    >
      ⚡ lvOS
    </button>
    <div v-if="startOpen" class="lvos-start-menu">
      <button @click="openFromStart('about-os')">ℹ about lvOS</button>
      <button @click="openFromStart('settings')">⚙ settings</button>
      <button @click="terminalFromStart">>_ terminal</button>
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
      <button @click="emit('logout')">⏻ log out</button>
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
        @click="emit('minimize', win)"
      >
        {{ win.title }}
      </button>
      <!-- hover preview: full title, and the desktop peeks the window (see parent) -->
      <span class="lvos-task-preview is-family-code">{{ win.title }}</span>
    </div>

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
    <div v-if="notifOpen" class="lvos-notif is-family-code">
      <div class="lvos-notif-head">
        <span>notifications</span>
        <button v-if="notifications.length" class="lvos-notif-clear" @click="emit('clear')">clear</button>
      </div>
      <p v-if="!notifications.length" class="lvos-notif-empty">nothing here yet.</p>
      <div v-for="note in notifications" v-else :key="note.id" class="lvos-notif-item">
        <span class="lvos-notif-icon">{{ note.icon }}</span>
        <div>
          <p class="lvos-notif-title">{{ note.title }}</p>
          <p v-if="note.body" class="lvos-notif-body">{{ note.body }}</p>
        </div>
      </div>
    </div>

    <button
      class="lvos-clock"
      :class="{ 'is-open': calendarOpen }"
      :aria-expanded="calendarOpen"
      aria-label="Toggle calendar"
      @click="calendarOpen = !calendarOpen"
    >
      {{ clock }}
    </button>
    <div v-if="calendarOpen" class="lvos-calendar is-family-code">
      <p class="lvos-calendar-title">{{ monthLabel }}</p>
      <div class="lvos-calendar-grid">
        <span v-for="(d, di) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="di" class="lvos-cal-dow">{{ d }}</span>
        <span v-for="blank in leadingBlanks" :key="`b${blank}`" />
        <span
          v-for="day in daysInMonth"
          :key="day"
          class="lvos-cal-day"
          :class="{ 'is-today': day === today }"
        >{{ day }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNow, useFullscreen } from '@vueuse/core'
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { Wallpaper } from '~/composables/useWallpaper'
import type { Toast } from '~/composables/useDesktopToasts'

defineProps<{ windows: DesktopWindow[], wallpapers: Wallpaper[], notifications: Toast[], unread: number }>()
const emit = defineEmits<{
  open: [id: string]
  terminal: []
  logout: []
  minimize: [win: DesktopWindow]
  peek: [id: string | null]
  read: []
  clear: []
}>()

// these are v-models so the parent can dismiss them on Escape
const startOpen = defineModel<boolean>('startOpen', { default: false })
const calendarOpen = defineModel<boolean>('calendarOpen', { default: false })
const notifOpen = defineModel<boolean>('notifOpen', { default: false })
const wallpaper = defineModel<number>('wallpaper', { default: 0 })

const toggleNotifications = () => {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) emit('read') // opening the panel clears the unread badge
}

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

// clock + calendar live here since only the taskbar shows them
const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)
const today = computed(() => now.value.getDate())
const monthLabel = computed(() =>
  now.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)
const daysInMonth = computed(() =>
  new Date(now.value.getFullYear(), now.value.getMonth() + 1, 0).getDate()
)
// blank cells before day 1, with Monday as the first column
const leadingBlanks = computed(() => {
  const firstDay = new Date(now.value.getFullYear(), now.value.getMonth(), 1).getDay()
  return (firstDay + 6) % 7
})
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
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.95);
  border-top: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  font-size: 0.75rem;
  color: hsl(var(--lv-scheme-hs), 85%);
}

.lvos-start {
  padding: 0.3rem 0.8rem;
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

// tray buttons (fullscreen, …) sit at the right, next to the clock
.lvos-tray-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem;
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 60%);
  cursor: pointer;

  &:hover,
  &[aria-pressed='true'] {
    color: var(--bulma-primary);
  }
}

// the first right-aligned element absorbs the free space
.lvos-fullscreen {
  margin-left: auto;
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

.lvos-notif {
  position: absolute;
  bottom: 2.6rem;
  right: 0.5rem;
  width: 17rem;
  max-height: 20rem;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);

  .lvos-notif-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem 0.4rem 0.5rem;
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;

    .lvos-notif-clear {
      border: none;
      background: none;
      color: hsl(var(--lv-scheme-hs), 55%);
      font: inherit;
      font-size: 0.68rem;
      text-transform: none;
      cursor: pointer;

      &:hover {
        color: var(--bulma-primary);
      }
    }
  }

  .lvos-notif-empty {
    padding: 0.75rem 0.4rem;
    color: hsl(var(--lv-scheme-hs), 45%);
    font-size: 0.75rem;
  }

  .lvos-notif-item {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.4rem;
    border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

    .lvos-notif-icon {
      font-size: 1rem;
    }

    .lvos-notif-title {
      color: hsl(var(--lv-scheme-hs), 90%);
      font-size: 0.78rem;
    }

    .lvos-notif-body {
      color: hsl(var(--lv-scheme-hs), 60%);
      font-size: 0.7rem;
    }
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

.lvos-calendar {
  position: absolute;
  bottom: 2.6rem;
  right: 0.5rem;
  width: 15rem;
  padding: 0.75rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);

  .lvos-calendar-title {
    margin-bottom: 0.5rem;
    color: var(--bulma-primary);
    font-size: 0.78rem;
  }

  .lvos-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.15rem;
    text-align: center;
    font-size: 0.7rem;
  }

  .lvos-cal-dow {
    color: hsl(var(--lv-scheme-hs), 50%);
    padding-bottom: 0.2rem;
  }

  .lvos-cal-day {
    padding: 0.2rem 0;
    color: hsl(var(--lv-scheme-hs), 82%);
    border-radius: 2px;

    &.is-today {
      background-color: var(--bulma-primary);
      color: var(--bulma-primary-invert);
      font-weight: 700;
    }
  }
}
</style>
