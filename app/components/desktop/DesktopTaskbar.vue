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
import { useNow } from '@vueuse/core'
import type { DesktopWindow } from '~/composables/useWindowManager'

export interface Wallpaper { name: string, swatch: string, css: string }

defineProps<{ windows: DesktopWindow[], wallpapers: Wallpaper[] }>()
const emit = defineEmits<{
  open: [id: string]
  terminal: []
  logout: []
  minimize: [win: DesktopWindow]
  peek: [id: string | null]
}>()

// startOpen / calendarOpen are v-models so the parent can dismiss them on Escape
const startOpen = defineModel<boolean>('startOpen', { default: false })
const calendarOpen = defineModel<boolean>('calendarOpen', { default: false })
const wallpaper = defineModel<number>('wallpaper', { default: 0 })

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

.lvos-clock {
  margin-left: auto;
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
