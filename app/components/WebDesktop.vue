<template>
  <Teleport to="body">
    <div v-if="desktopActive" class="lvos" role="application" aria-label="lvOS desktop">
      <!-- desktop icons -->
      <div class="lvos-icons">
        <button v-for="icon in icons" :key="icon.id" class="lvos-icon is-family-code" @click="icon.action">
          <span class="lvos-icon-glyph"><AppIcon :name="icon.icon" :size="26" /></span>
          <span class="lvos-icon-label">{{ icon.label }}</span>
        </button>
      </div>

      <!-- windows -->
      <div
        v-for="win in windows"
        v-show="!win.minimized"
        :key="win.id"
        class="lvos-window"
        :class="{ 'is-wide': win.id === 'browser' }"
        :style="{ left: `${win.x}px`, top: `${win.y}px`, zIndex: win.z }"
        @pointerdown="focusWindow(win)"
      >
        <header
          class="lvos-window-titlebar is-family-code"
          @pointerdown.prevent="startDrag(win, $event)"
        >
          <span class="lvos-window-title">{{ win.title }}</span>
          <span class="lvos-window-actions">
            <button title="Minimize" @click.stop="win.minimized = true">–</button>
            <button title="Close" @click.stop="closeWindow(win.id)">×</button>
          </span>
        </header>

        <div class="lvos-window-body">
          <template v-if="win.id === 'readme'">
            <p class="is-family-code has-text-primary-on-scheme mb-2"># {{ profile.name }}</p>
            <p v-for="(paragraph, i) in profile.bio" :key="i" class="mb-2 is-size-7">
              {{ paragraph }}
            </p>
            <p class="is-family-code is-size-7 mt-3">
              <a v-for="social in profile.socials" :key="social.label" :href="social.url" target="_blank" rel="noopener" class="mr-3">
                [{{ social.label.toLowerCase() }}]
              </a>
            </p>
          </template>

          <template v-else-if="win.id === 'projects'">
            <button
              v-for="project in projects"
              :key="project.slug"
              class="lvos-file is-family-code"
              @click="openProject(project.slug)"
            >
              <AppIcon name="file" :size="14" />
              <span>{{ project.slug }}.md</span>
              <span class="lvos-file-meta">[{{ project.category }}]</span>
            </button>
          </template>

          <template v-else-if="win.id === 'about-os'">
            <p class="is-family-code is-size-7">
              <b>lvOS 2.0</b> — a very serious operating system<br>
              kernel: nuxt 4 (vue 3)<br>
              memory: unlimited localStorage<br>
              uptime: since you clicked that icon<br><br>
              © {{ new Date().getFullYear() }} laurensverspeek.nl
            </p>
          </template>

          <DesktopMinesweeper v-else-if="win.id === 'minesweeper'" />
          <DesktopMedia v-else-if="win.id === 'media'" />
          <DesktopFiles
            v-else-if="win.id === 'files'"
            @route="openRoute"
            @window="openWindow"
          />
          <DesktopBrowser v-else-if="win.id === 'browser'" />
        </div>
      </div>

      <!-- taskbar -->
      <div class="lvos-taskbar is-family-code">
        <button class="lvos-start" :class="{ 'is-open': startOpen }" @click="startOpen = !startOpen">
          ⚡ lvOS
        </button>
        <div v-if="startOpen" class="lvos-start-menu">
          <button @click="openWindow('about-os'); startOpen = false">ℹ about lvOS</button>
          <button @click="openTerminal">>_ terminal</button>
          <button @click="logout">⏻ log out</button>
        </div>

        <button
          v-for="win in windows"
          :key="win.id"
          class="lvos-task"
          :class="{ 'is-minimized': win.minimized }"
          @click="toggleMinimize(win)"
        >
          {{ win.title }}
        </button>

        <span class="lvos-clock">{{ clock }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNow, useEventListener } from '@vueuse/core'
import type { IconName } from '~/components/AppIcon.vue'
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'

// lvOS: the operating-system-in-a-browser easter egg. Boot with `desktop` in the terminal.

interface DesktopWindow {
  id: string
  title: string
  x: number
  y: number
  z: number
  minimized: boolean
}

const { desktopActive } = useSiteEffects()
const terminal = useTerminal()
const router = useRouter()

const windows = ref<DesktopWindow[]>([])
const startOpen = ref(false)
let zCounter = 10

const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)

const WINDOW_TITLES: Record<string, string> = {
  readme: 'readme.md — editor',
  projects: '~/projects — files',
  'about-os': 'about lvOS',
  minesweeper: 'minesweeper.exe',
  media: 'media player',
  files: 'file explorer',
  browser: 'lv browser'
}

const openWindow = (id: string) => {
  const existing = windows.value.find((w) => w.id === id)
  if (existing) {
    existing.minimized = false
    focusWindow(existing)
    return
  }
  const offset = windows.value.length * 34
  windows.value.push({
    id,
    title: WINDOW_TITLES[id] ?? id,
    x: Math.min(90 + offset, window.innerWidth / 3),
    y: 70 + offset,
    z: ++zCounter,
    minimized: false
  })
}

const closeWindow = (id: string) => {
  windows.value = windows.value.filter((w) => w.id !== id)
}

const focusWindow = (win: DesktopWindow) => {
  win.z = ++zCounter
}

const toggleMinimize = (win: DesktopWindow) => {
  win.minimized = !win.minimized
  if (!win.minimized) focusWindow(win)
}

// window dragging
let dragging: DesktopWindow | null = null
let dragOffset = { x: 0, y: 0 }

const startDrag = (win: DesktopWindow, event: PointerEvent) => {
  dragging = win
  focusWindow(win)
  dragOffset = { x: event.clientX - win.x, y: event.clientY - win.y }
}

useEventListener('pointermove', (event: PointerEvent) => {
  if (!dragging) return
  dragging.x = Math.max(0, Math.min(event.clientX - dragOffset.x, window.innerWidth - 120))
  dragging.y = Math.max(0, Math.min(event.clientY - dragOffset.y, window.innerHeight - 80))
})
useEventListener('pointerup', () => (dragging = null))

const openTerminal = () => {
  startOpen.value = false
  terminal.open()
}

const openProject = (slug: string) => {
  desktopActive.value = false
  router.push(`/projects/${slug}`)
}

const openRoute = (path: string) => {
  desktopActive.value = false
  router.push(path)
}

const openCv = () => {
  desktopActive.value = false
  router.push('/cv')
}

const playSnake = () => {
  terminal.open()
  terminal.run('snake')
}

const logout = () => {
  startOpen.value = false
  windows.value = []
  desktopActive.value = false
}

const icons: { id: string, label: string, icon: IconName, action: () => void }[] = [
  { id: 'readme', label: 'readme.md', icon: 'file', action: () => openWindow('readme') },
  { id: 'files', label: 'files', icon: 'layers', action: () => openWindow('files') },
  { id: 'browser', label: 'lv browser', icon: 'globe', action: () => openWindow('browser') },
  { id: 'terminal', label: 'terminal', icon: 'terminal', action: openTerminal },
  { id: 'snake', label: 'snake.exe', icon: 'cpu', action: playSnake },
  { id: 'minesweeper', label: 'mines.exe', icon: 'cpu', action: () => openWindow('minesweeper') },
  { id: 'media', label: 'media', icon: 'sun', action: () => openWindow('media') },
  { id: 'cv', label: 'resume.pdf', icon: 'mail', action: openCv },
  { id: 'logout', label: 'log out', icon: 'close', action: logout }
]

// boot with readme open, esc logs out (when the terminal isn't using esc)
watch(desktopActive, (active) => {
  if (active) {
    windows.value = []
    openWindow('readme')
  }
})

useEventListener('keydown', (event: KeyboardEvent) => {
  // defaultPrevented means the terminal already consumed this Escape
  if (
    event.key === 'Escape'
    && !event.defaultPrevented
    && desktopActive.value
    && !terminal.isOpen.value
  ) {
    logout()
  }
})
</script>

<style scoped lang="scss">
.lvos {
  position: fixed;
  inset: 0;
  z-index: 95;
  overflow: hidden;
  background:
    radial-gradient(
      60rem 40rem at 70% 20%,
      hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.14),
      transparent
    ),
    linear-gradient(
      160deg,
      hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 8%),
      hsl(var(--bulma-scheme-h), 40%, 4%)
    );
}

.lvos-icons {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  bottom: 4rem;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.75rem;
}

.lvos-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 5.5rem;
  padding: 0.6rem 0.25rem;
  border: 1px solid transparent;
  border-radius: var(--bulma-radius);
  background: none;
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 90%);
  font-size: 0.7rem;
  cursor: pointer;

  .lvos-icon-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: var(--bulma-radius);
    background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
    color: var(--bulma-primary);
  }

  &:hover {
    border-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.4);
    background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.08);
  }
}

.lvos-window {
  position: absolute;
  width: min(26rem, 88vw);

  &.is-wide {
    width: min(44rem, 92vw);
  }
  border: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.4);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 10%, 0.97);
  box-shadow: 0 18px 50px hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 2%, 0.6);
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 88%);
  overflow: hidden;
}

.lvos-window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.8rem;
  font-size: 0.72rem;
  background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12);
  border-bottom: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.25);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .lvos-window-actions button {
    width: 1.4rem;
    border: none;
    background: none;
    color: inherit;
    font-size: 0.85rem;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary);
    }
  }
}

.lvos-window-body {
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 0.85rem;

  a {
    color: var(--bulma-primary);
  }
}

.lvos-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;

  .lvos-file-meta {
    margin-left: auto;
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 55%);
  }

  &:hover {
    background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
  }
}

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
  background-color: hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 6%, 0.95);
  border-top: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.3);
  font-size: 0.75rem;
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 85%);
}

.lvos-start {
  padding: 0.3rem 0.8rem;
  border: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.4);
  border-radius: var(--bulma-radius);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &.is-open {
    background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
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
  border: 1px solid hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--bulma-scheme-h), var(--bulma-scheme-s), 8%, 0.98);

  button {
    padding: 0.5rem 0.7rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 88%);
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.15);
    }
  }
}

.lvos-task {
  padding: 0.3rem 0.7rem;
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: none;
  border-radius: var(--bulma-radius-small);
  background-color: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12);
  color: inherit;
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;

  &.is-minimized {
    opacity: 0.5;
  }
}

.lvos-clock {
  margin-left: auto;
  color: hsl(var(--bulma-scheme-h), var(--bulma-scheme-s), 60%);
}
</style>
