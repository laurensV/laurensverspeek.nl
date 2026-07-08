<template>
  <Teleport to="body">
    <LazyDesktopBoot v-if="booting" @done="onBootDone" />
    <div
      v-if="desktopActive && !booting"
      class="lvos"
      :style="wallpaperStyle"
      role="application"
      aria-label="lvOS desktop — press Escape to log out"
      @contextmenu.prevent="openContextMenu"
      @click="contextMenu.open = false"
    >
      <!-- right-click context menu -->
      <div
        v-if="contextMenu.open"
        class="lvos-context is-family-code"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
      >
        <button @click="openTerminal(); contextMenu.open = false">&gt;_ new terminal</button>
        <button @click="cycleWallpaper(); contextMenu.open = false">🖼 next wallpaper</button>
        <button @click="openWindow('settings'); contextMenu.open = false">⚙ settings</button>
        <button @click="openWindow('about-os'); contextMenu.open = false">ℹ about lvOS</button>
        <button @click="logout()">⏻ log out</button>
      </div>

      <!-- idle screensaver -->
      <LazyDesktopScreensaver v-if="screensaverOn" @wake="wakeScreensaver" />

      <!-- toast notifications -->
      <div class="lvos-toasts is-family-code" aria-live="polite">
        <div v-for="toast in toasts" :key="toast.id" class="lvos-toast">
          <span class="lvos-toast-icon">{{ toast.icon }}</span>
          <div>
            <p class="lvos-toast-title">{{ toast.title }}</p>
            <p v-if="toast.body" class="lvos-toast-body">{{ toast.body }}</p>
          </div>
        </div>
      </div>

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
        :key="win.id"
        class="lvos-window"
        :class="{
          'is-wide': win.id === 'browser' || win.id === 'blog' || win.id === 'terminal',
          'is-minimized': win.minimized,
          'is-maximized': win.maximized,
          'has-size': win.maximized || win.height !== undefined
        }"
        :style="windowStyle(win)"
        @pointerdown="focusWindow(win)"
      >
        <header
          class="lvos-window-titlebar is-family-code"
          @pointerdown.prevent="startDrag(win, $event)"
          @dblclick="toggleMaximize(win)"
        >
          <span class="lvos-window-title">{{ win.title }}</span>
          <span class="lvos-window-actions">
            <button :aria-label="`Minimize ${win.title}`" title="Minimize" @pointerdown.stop @click.stop="toggleMinimize(win)">–</button>
            <button
              :aria-label="`${win.maximized ? 'Restore' : 'Maximize'} ${win.title}`"
              :title="win.maximized ? 'Restore' : 'Maximize'"
              @pointerdown.stop
              @click.stop="toggleMaximize(win)"
            >{{ win.maximized ? '❐' : '□' }}</button>
            <button :aria-label="`Close ${win.title}`" title="Close" @pointerdown.stop @click.stop="closeWindow(win.id)">×</button>
          </span>
        </header>

        <div class="lvos-window-body" :class="{ 'is-flush': win.id === 'terminal' }">
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

          <!-- Lazy: each app is its own chunk, loaded only when first opened -->
          <LazyDesktopMinesweeper v-else-if="win.id === 'minesweeper'" />
          <LazyDesktopMedia v-else-if="win.id === 'media'" />
          <LazyDesktopFiles
            v-else-if="win.id === 'files'"
            @route="openRoute"
            @window="openWindow"
            @post="openBlogPost"
          />
          <LazyDesktopBrowser v-else-if="win.id === 'browser'" />
          <LazyDesktopBlog v-else-if="win.id === 'blog'" :open-path="blogOpenPath" />
          <LazyDesktopVim v-else-if="win.id === 'vim'" @close="closeWindow('vim')" />
          <LazyDesktopSettings v-else-if="win.id === 'settings'" />
          <LazyDesktopPaint v-else-if="win.id === 'paint'" />
          <LazyDesktopVisualizer v-else-if="win.id === 'visualizer'" />
          <LazyDesktopCalculator v-else-if="win.id === 'calc'" />
          <LazyDesktopClock v-else-if="win.id === 'clock'" />
          <LazyDesktopTerminal v-else-if="win.id === 'terminal'" :active="terminalActive" />
        </div>

        <span
          v-if="!win.maximized"
          class="lvos-resize"
          aria-hidden="true"
          @pointerdown.prevent.stop="startResize(win, $event)"
        />
      </div>

      <!-- taskbar -->
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
          <button @click="openWindow('about-os'); startOpen = false">ℹ about lvOS</button>
          <button @click="openWindow('settings'); startOpen = false">⚙ settings</button>
          <button @click="openTerminal(); startOpen = false">>_ terminal</button>
          <p class="lvos-start-label">wallpaper</p>
          <div class="lvos-wallpapers">
            <button
              v-for="(paper, i) in WALLPAPERS"
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
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNow, useEventListener, useIdle } from '@vueuse/core'
import type { IconName } from '~/components/AppIcon.vue'
import type { DesktopWindow } from '~/composables/useWindowManager'
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'

// lvOS: the operating-system-in-a-browser easter egg. Boot with `desktop` in
// the terminal. Window mechanics live in useWindowManager; this component is
// the shell: icons, taskbar and the apps inside the windows.

const WINDOW_TITLES: Record<string, string> = {
  readme: 'readme.md — editor',
  projects: '~/projects — files',
  'about-os': 'about lvOS',
  minesweeper: 'minesweeper.exe',
  media: 'media player',
  files: 'file explorer',
  browser: 'lv browser',
  blog: '~/blog — reader',
  vim: 'vim — ~/notes.txt',
  settings: 'settings',
  paint: 'lvpaint.exe',
  visualizer: 'visualizer',
  calc: 'calculator',
  clock: 'clock',
  terminal: 'lvsh — terminal'
}

const { desktopActive } = useSiteEffects()
const terminal = useTerminal()
const router = useRouter()

const {
  windows,
  openWindow,
  closeWindow,
  focusWindow,
  toggleMinimize,
  toggleMaximize,
  startDrag,
  startResize
} = useWindowManager(WINDOW_TITLES)

const startOpen = ref(false)
const calendarOpen = ref(false)
const booting = ref(false)

// ---- toast notifications ----
interface Toast { id: number, icon: string, title: string, body?: string }
const toasts = ref<Toast[]>([])
let toastId = 0
const notify = (icon: string, title: string, body?: string) => {
  const id = toastId++
  toasts.value.push({ id, icon, title, body })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4200)
}

// ---- idle screensaver ----
// after 45s of no input on the desktop, drift into the screensaver
const { idle } = useIdle(45_000)
const dismissedIdle = ref(false)
const screensaverOn = computed(
  () => desktopActive.value && !booting.value && idle.value && !dismissedIdle.value
)
// while idle stays true, one wake dismiss should hold until real activity resets it
watch(idle, (isIdle) => {
  if (!isIdle) dismissedIdle.value = false
})
const wakeScreensaver = () => (dismissedIdle.value = true)

// ---- right-click context menu ----
const contextMenu = reactive({ open: false, x: 0, y: 0 })
const openContextMenu = (event: MouseEvent) => {
  // only on the desktop background, not on top of a window
  if ((event.target as HTMLElement).closest('.lvos-window, .lvos-taskbar')) return
  contextMenu.x = Math.min(event.clientX, window.innerWidth - 200)
  contextMenu.y = Math.min(event.clientY, window.innerHeight - 220)
  contextMenu.open = true
}

const now = useNow({ interval: 1000 })
const clock = computed(() =>
  now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
)

// ---- wallpaper (persisted for the session) ----
const WALLPAPERS = [
  {
    name: 'amber void',
    swatch: 'linear-gradient(135deg, #2a1e00, #0a0a0a)',
    css:
      'radial-gradient(60rem 40rem at 70% 20%, hsla(var(--lv-primary-hsl), 0.14), transparent),'
      + ' linear-gradient(160deg, hsl(var(--lv-scheme-hs), 8%), hsl(var(--bulma-scheme-h), 40%, 4%))'
  },
  {
    name: 'grid',
    swatch: 'linear-gradient(135deg, #0d0d0d, #1a1a1a)',
    css:
      'linear-gradient(hsla(var(--lv-primary-hsl), 0.06) 1px, transparent 1px) 0 0 / 2rem 2rem,'
      + ' linear-gradient(90deg, hsla(var(--lv-primary-hsl), 0.06) 1px, transparent 1px) 0 0 / 2rem 2rem,'
      + ' hsl(var(--lv-scheme-hs), 6%)'
  },
  {
    name: 'aurora',
    swatch: 'linear-gradient(135deg, #001a1a, #1a0033)',
    css:
      'radial-gradient(50rem 30rem at 20% 30%, hsla(180, 60%, 30%, 0.25), transparent),'
      + ' radial-gradient(50rem 30rem at 80% 70%, hsla(280, 60%, 30%, 0.25), transparent),'
      + ' hsl(var(--lv-scheme-hs), 5%)'
  }
]
const wallpaper = useState('lvos-wallpaper', () => 0)
const wallpaperStyle = computed(() => ({ background: WALLPAPERS[wallpaper.value]?.css }))
const cycleWallpaper = () => {
  wallpaper.value = (wallpaper.value + 1) % WALLPAPERS.length
  notify('🖼', 'Wallpaper changed', WALLPAPERS[wallpaper.value]!.name)
}

// ---- calendar popover ----
const today = computed(() => now.value.getDate())
const monthLabel = computed(() =>
  now.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)
const daysInMonth = computed(() =>
  new Date(now.value.getFullYear(), now.value.getMonth() + 1, 0).getDate()
)
// number of blank cells before day 1, with Monday as the first column
const leadingBlanks = computed(() => {
  const firstDay = new Date(now.value.getFullYear(), now.value.getMonth(), 1).getDay()
  return (firstDay + 6) % 7
})

const windowStyle = (win: DesktopWindow) =>
  win.maximized
    ? { zIndex: win.z }
    : {
        left: `${win.x}px`,
        top: `${win.y}px`,
        zIndex: win.z,
        width: win.width !== undefined ? `${win.width}px` : undefined,
        height: win.height !== undefined ? `${win.height}px` : undefined
      }

const onBootDone = () => {
  booting.value = false
  notify('⚡', 'Welcome to lvOS 2.0', 'right-click the desktop for a menu')
  // a playful nudge a moment later
  setTimeout(() => notify('🔋', 'Battery low', 'plug in your creativity'), 6000)
}

const openTerminal = () => {
  startOpen.value = false
  openWindow('terminal')
}

// the terminal window owns the keyboard only when it's the top, non-minimized window
const terminalActive = computed(() => {
  const term = windows.value.find((w) => w.id === 'terminal' && !w.minimized)
  if (!term) return false
  return windows.value.every((w) => w.minimized || w.z <= term.z)
})

// which post the blog reader should show (set by the file explorer)
const blogOpenPath = ref<string | null>(null)

const openBlogPost = (path: string) => {
  blogOpenPath.value = path
  openWindow('blog')
}

const openBlogApp = () => {
  blogOpenPath.value = null
  openWindow('blog')
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

// logging out keeps the window layout — logging back in restores the session
const logout = () => {
  startOpen.value = false
  calendarOpen.value = false
  desktopActive.value = false
}

const icons: { id: string, label: string, icon: IconName, action: () => void }[] = [
  { id: 'readme', label: 'readme.md', icon: 'file', action: () => openWindow('readme') },
  { id: 'files', label: 'files', icon: 'layers', action: () => openWindow('files') },
  { id: 'browser', label: 'lv browser', icon: 'globe', action: () => openWindow('browser') },
  { id: 'blog', label: 'blog', icon: 'book', action: openBlogApp },
  { id: 'terminal', label: 'terminal', icon: 'terminal', action: openTerminal },
  { id: 'minesweeper', label: 'mines.exe', icon: 'cpu', action: () => openWindow('minesweeper') },
  { id: 'vim', label: 'vim', icon: 'braces', action: () => openWindow('vim') },
  { id: 'paint', label: 'lvpaint', icon: 'pen', action: () => openWindow('paint') },
  { id: 'settings', label: 'settings', icon: 'settings', action: () => openWindow('settings') },
  { id: 'media', label: 'media', icon: 'sun', action: () => openWindow('media') },
  { id: 'visualizer', label: 'visualizer', icon: 'zap', action: () => openWindow('visualizer') },
  { id: 'calc', label: 'calculator', icon: 'hash', action: () => openWindow('calc') },
  { id: 'clock', label: 'clock', icon: 'sun', action: () => openWindow('clock') },
  { id: 'cv', label: 'resume.pdf', icon: 'mail', action: openCv },
  { id: 'logout', label: 'log out', icon: 'close', action: logout }
]

// booting shows the BIOS/POST screen; a fresh session then opens the readme,
// while a returning session restores the previous window layout.
// immediate: the component is lazy-mounted *after* desktopActive flips true, so
// a plain watch would miss that first transition and skip the boot screen.
watch(desktopActive, (active) => {
  if (!active) return
  const firstBoot = !windows.value.length
  booting.value = true
  if (firstBoot) openWindow('readme')
}, { immediate: true })

// inside the desktop, ~ opens/focuses the terminal window (unless typing)
useEventListener('keydown', (event: KeyboardEvent) => {
  if ((event.key !== '~' && event.key !== '`') || !desktopActive.value) return
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  openWindow('terminal')
})

useEventListener('keydown', (event: KeyboardEvent) => {
  // defaultPrevented means the terminal already consumed this Escape
  if (event.key !== 'Escape' || event.defaultPrevented || !desktopActive.value || terminal.isOpen.value) {
    return
  }
  // Escape first dismisses popups, only logging out when nothing is open
  if (contextMenu.open || startOpen.value || calendarOpen.value) {
    contextMenu.open = false
    startOpen.value = false
    calendarOpen.value = false
    return
  }
  logout()
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
      hsla(var(--lv-primary-hsl), 0.14),
      transparent
    ),
    linear-gradient(
      160deg,
      hsl(var(--lv-scheme-hs), 8%),
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
  color: hsl(var(--lv-scheme-hs), 90%);
  font-size: 0.7rem;
  cursor: pointer;

  .lvos-icon-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: var(--bulma-radius);
    background-color: hsla(var(--lv-primary-hsl), 0.15);
    color: var(--bulma-primary);
  }

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.4);
    background-color: hsla(var(--lv-primary-hsl), 0.08);
  }
}

.lvos-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: min(26rem, 88vw);

  &.is-wide {
    width: min(44rem, 92vw);
  }
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--lv-scheme-hs), 10%, 0.97);
  box-shadow: 0 18px 50px hsla(var(--lv-scheme-hs), 2%, 0.6);
  color: hsl(var(--lv-scheme-hs), 88%);
  overflow: hidden;
  animation: lvos-window-open 0.18s ease;
  transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;

  // minimize keeps the app mounted (game state survives) but sails it
  // down toward the taskbar
  &.is-minimized {
    opacity: 0;
    transform: translateY(45vh) scale(0.5);
    visibility: hidden;
    pointer-events: none;
  }

  &.is-maximized {
    inset: 0 0 2.4rem 0;
    width: auto;
    border-radius: 0;
  }
}

@keyframes lvos-window-open {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(0.5rem);
  }
}

.lvos-window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.8rem;
  font-size: 0.72rem;
  background-color: hsla(var(--lv-primary-hsl), 0.12);
  border-bottom: 1px solid hsla(var(--lv-primary-hsl), 0.25);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .lvos-window-actions {
    display: flex;

    button {
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
}

.lvos-window-body {
  flex: 1;
  padding: 1rem;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 0.85rem;

  a {
    color: var(--bulma-primary);
  }
}

// explicit size (resized, snapped or maximized): let the body fill the window
.lvos-window.has-size .lvos-window-body {
  max-height: none;
}

// the terminal app fills its window edge-to-edge
.lvos-window-body.is-flush {
  padding: 0;
}

.lvos-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1rem;
  height: 1rem;
  cursor: nwse-resize;
  touch-action: none;
  // three diagonal grip lines
  background:
    linear-gradient(
      135deg,
      transparent 0 50%,
      hsla(var(--lv-primary-hsl), 0.5) 50% 55%,
      transparent 55% 65%,
      hsla(var(--lv-primary-hsl), 0.5) 65% 70%,
      transparent 70% 80%,
      hsla(var(--lv-primary-hsl), 0.5) 80% 85%,
      transparent 85%
    );
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
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;

  .lvos-file-meta {
    margin-left: auto;
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
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

.lvos-context {
  position: absolute;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  min-width: 11rem;
  padding: 0.35rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 12px 30px hsla(var(--lv-scheme-hs), 2%, 0.6);

  button {
    padding: 0.45rem 0.7rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 88%);
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
      color: var(--bulma-primary);
    }
  }
}

.lvos-toasts {
  position: absolute;
  right: 1rem;
  bottom: 3.2rem;
  z-index: 10002;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 18rem;
}

.lvos-toast {
  display: flex;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 10%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);
  animation: lvos-toast-in 0.25s ease;

  .lvos-toast-icon {
    font-size: 1.1rem;
  }

  .lvos-toast-title {
    color: hsl(var(--lv-scheme-hs), 92%);
    font-size: 0.8rem;
  }

  .lvos-toast-body {
    color: hsl(var(--lv-scheme-hs), 60%);
    font-size: 0.7rem;
  }
}

@keyframes lvos-toast-in {
  from {
    opacity: 0;
    transform: translateX(1rem);
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
