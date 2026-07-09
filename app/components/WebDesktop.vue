<template>
  <Teleport to="body">
    <LazyDesktopBoot v-if="booting" @done="onBootDone" />
    <div
      v-if="!booting"
      class="lvos"
      :class="{ 'is-powering-off': poweringOff }"
      :style="wallpaperStyle"
      role="application"
      aria-label="lvOS desktop — press Escape to log out"
      @contextmenu.prevent="openContextMenu"
      @click="contextMenu.open = false"
    >
      <!-- live wallpaper: a dim Game of Life behind everything -->
      <LazyDesktopLifeWallpaper v-if="wallpapers[wallpaper]?.live" />

      <!-- right-click context menu -->
      <DesktopContextMenu
        v-if="contextMenu.open"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @terminal="openTerminal(); contextMenu.open = false"
        @wallpaper="cycleWallpaper(); contextMenu.open = false"
        @open="(id) => { openWindow(id); contextMenu.open = false }"
        @logout="logout()"
      />

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
      <DesktopIcons :icons="icons" />

      <!-- Aero-style snap preview: a translucent ghost of where a dragged
           window will land when released against an edge -->
      <Transition name="lvos-snap">
        <div
          v-if="snapPreview"
          class="lvos-snap-preview"
          aria-hidden="true"
          :style="{
            left: `${snapPreview.x}px`,
            top: `${snapPreview.y}px`,
            width: `${snapPreview.width}px`,
            height: `${snapPreview.height}px`
          }"
        />
      </Transition>

      <!-- windows -->
      <div
        v-for="win in windows"
        :key="win.id"
        :data-win="win.id"
        class="lvos-window"
        :class="{
          'is-wide': win.id === 'browser' || win.id === 'blog' || win.id === 'terminal' || win.id === 'notes',
          'is-minimized': win.minimized,
          'is-maximized': win.maximized,
          'has-size': win.maximized || win.height !== undefined,
          'is-peek': peekedId === win.id,
          'is-dimmed': peekedId !== null && peekedId !== win.id
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
          <LazyDesktopNotes v-else-if="win.id === 'notes'" />
          <LazyDesktopLife v-else-if="win.id === 'life'" />
          <LazyDesktopTaskManager v-else-if="win.id === 'taskmgr'" @kill="closeWindow" />
          <LazyDesktopTerminal v-else-if="win.id === 'terminal'" :active="terminalActive" />
        </div>

        <template v-if="!win.maximized">
          <span
            v-for="dir in RESIZE_DIRS"
            :key="dir"
            class="lvos-resize"
            :class="`is-${dir}`"
            aria-hidden="true"
            @pointerdown.prevent.stop="startResize(win, $event, dir)"
          />
        </template>
      </div>

      <!-- lock screen: ceremonial, but it does cover everything -->
      <LazyDesktopLockScreen v-if="locked" @unlock="locked = false" />

      <!-- taskbar -->
      <DesktopTaskbar
        v-model:start-open="startOpen"
        v-model:calendar-open="calendarOpen"
        v-model:notif-open="notifOpen"
        v-model:wallpaper="wallpaper"
        :windows="windows"
        :wallpapers="wallpapers"
        :notifications="history"
        :unread="unread"
        @open="openWindow"
        @terminal="openTerminal"
        @logout="logout"
        @lock="lock"
        @shutdown="shutdown"
        @reboot="reboot"
        @minimize="toggleMinimize"
        @peek="peekedId = $event"
        @read="markRead"
        @clear="clearHistory"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener, useIdle } from '@vueuse/core'
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
  notes: 'sticky notes',
  life: 'game of life',
  taskmgr: 'task manager',
  terminal: 'lvsh — terminal'
}

// the eight resize handles (four edges + four corners)
const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const

const terminal = useTerminal()
const router = useRouter()

const {
  windows,
  openWindow,
  closeWindow,
  focusWindow,
  toggleMinimize: wmToggleMinimize,
  toggleMaximize,
  startDrag,
  startResize,
  snapPreview,
  cycleWindows
} = useWindowManager(WINDOW_TITLES)

// genie effect: aim each window's minimize at its own taskbar button rather
// than a generic point, by measuring the two rects at minimize time
const genie = reactive<Record<string, Record<string, string>>>({})
const toggleMinimize = (win: DesktopWindow) => {
  if (!win.minimized) {
    const btn = document.querySelector<HTMLElement>(`.lvos-task[data-win="${win.id}"]`)
    const winEl = document.querySelector<HTMLElement>(`.lvos-window[data-win="${win.id}"]`)
    if (btn && winEl) {
      const b = btn.getBoundingClientRect()
      const w = winEl.getBoundingClientRect()
      genie[win.id] = {
        '--gx': `${Math.round(b.left + b.width / 2 - (w.left + w.width / 2))}px`,
        '--gy': `${Math.round(b.top + b.height / 2 - (w.top + w.height / 2))}px`
      }
    }
  }
  wmToggleMinimize(win)
}

const startOpen = ref(false)
const calendarOpen = ref(false)
const notifOpen = ref(false)
const booting = ref(false)
// which window the taskbar is currently peeking (Aero-peek highlight)
const peekedId = ref<string | null>(null)

// ---- toast notifications ----
const { toasts, history, unread, notify, markRead, clearHistory } = useDesktopToasts()

// ---- idle screensaver ----
// after 45s of no input on the desktop, drift into the screensaver
const { idle } = useIdle(45_000)
const dismissedIdle = ref(false)
const screensaverOn = computed(
  () => !booting.value && idle.value && !dismissedIdle.value
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

// ---- wallpaper (persisted for the session) ----
const { wallpapers, wallpaper, wallpaperStyle, cycleWallpaper: nextWallpaper } = useWallpaper()
const cycleWallpaper = () => notify('🖼', 'Wallpaper changed', nextWallpaper())

const windowStyle = (win: DesktopWindow) =>
  win.maximized
    ? { zIndex: win.z, ...genie[win.id] }
    : {
        left: `${win.x}px`,
        top: `${win.y}px`,
        zIndex: win.z,
        width: win.width !== undefined ? `${win.width}px` : undefined,
        height: win.height !== undefined ? `${win.height}px` : undefined,
        ...genie[win.id]
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

// leaving the /desktop route unmounts the desktop; the window layout is kept in
// useState, so returning restores the session (after another quick boot).
const openProject = (slug: string) => router.push(`/projects/${slug}`)

const openRoute = (path: string) => router.push(path)

const openCv = () => router.push('/cv')

const logout = () => {
  startOpen.value = false
  calendarOpen.value = false
  router.push('/')
}

// the lock screen overlays everything; keyboard shortcuts pause while it's up
const locked = ref(false)
const lock = () => {
  startOpen.value = false
  calendarOpen.value = false
  locked.value = true
}

// CRT power-off: collapse the desktop to a bright line, then act. Reduced
// motion skips straight to the action.
const poweringOff = ref(false)
let powerTimer: ReturnType<typeof setTimeout> | undefined
const powerOff = (after: () => void) => {
  startOpen.value = false
  calendarOpen.value = false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return after()
  poweringOff.value = true
  powerTimer = setTimeout(() => {
    poweringOff.value = false
    after()
  }, 950)
}
onUnmounted(() => clearTimeout(powerTimer))

const shutdown = () => powerOff(() => router.push('/'))
const reboot = () => powerOff(() => {
  booting.value = true
})

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
  { id: 'notes', label: 'notes', icon: 'type', action: () => openWindow('notes') },
  { id: 'life', label: 'life', icon: 'zap', action: () => openWindow('life') },
  { id: 'taskmgr', label: 'taskmgr', icon: 'cpu', action: () => openWindow('taskmgr') },
  { id: 'cv', label: 'resume.pdf', icon: 'mail', action: openCv },
  { id: 'logout', label: 'log out', icon: 'close', action: logout }
]

// entering the /desktop page runs the BIOS/POST screen; a fresh session then
// opens the readme, while a returning session restores its previous windows.
onMounted(() => {
  const firstBoot = !windows.value.length
  booting.value = true
  if (firstBoot) openWindow('readme')
})

// inside the desktop, ~ opens/focuses the terminal window (unless typing)
useEventListener('keydown', (event: KeyboardEvent) => {
  if (locked.value) return
  if (event.key !== '~' && event.key !== '`') return
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  openWindow('terminal')
})

// Alt+Tab switches between open windows (Shift+Alt+Tab goes backwards). Note the
// OS may reserve Alt+Tab; the taskbar remains the always-available switcher.
useEventListener('keydown', (event: KeyboardEvent) => {
  if (locked.value) return
  if (event.key !== 'Tab' || !event.altKey) return
  event.preventDefault()
  cycleWindows(event.shiftKey ? -1 : 1)
})

useEventListener('keydown', (event: KeyboardEvent) => {
  // a locked screen ignores Escape — it wouldn't be much of a lock otherwise
  if (locked.value) return
  // defaultPrevented means the terminal already consumed this Escape
  if (event.key !== 'Escape' || event.defaultPrevented || terminal.isOpen.value) {
    return
  }
  // Escape first dismisses popups, only logging out when nothing is open
  if (contextMenu.open || startOpen.value || calendarOpen.value || notifOpen.value) {
    contextMenu.open = false
    startOpen.value = false
    calendarOpen.value = false
    notifOpen.value = false
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

// CRT power-off: the desktop collapses to a bright horizontal line, then a dot
.lvos.is-powering-off {
  animation: lvos-poweroff 0.9s cubic-bezier(0.55, 0, 0.85, 0.4) forwards;
  pointer-events: none;
}

@keyframes lvos-poweroff {
  0% {
    transform: scaleY(1);
    filter: brightness(1);
  }
  55% {
    transform: scaleY(0.006);
    filter: brightness(2.5);
  }
  75% {
    transform: scaleY(0.006) scaleX(0.6);
    filter: brightness(3.5);
  }
  100% {
    transform: scaleY(0.004) scaleX(0.003);
    filter: brightness(6);
  }
}

// Aero-style snap preview ghost
.lvos-snap-preview {
  position: absolute;
  z-index: 8;
  border: 2px solid hsla(var(--lv-primary-hsl), 0.7);
  border-radius: var(--bulma-radius-large, 0.75rem);
  background: hsla(var(--lv-primary-hsl), 0.14);
  backdrop-filter: blur(2px);
  box-shadow: 0 12px 40px hsla(var(--lv-primary-hsl), 0.22);
  pointer-events: none;
  // glide between zones as the pointer moves along an edge
  transition: left 0.16s ease, top 0.16s ease, width 0.16s ease, height 0.16s ease;
}

.lvos-snap-enter-active,
.lvos-snap-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.lvos-snap-enter-from,
.lvos-snap-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

// icons, taskbar, context menu and calendar styles live in their own components
// (DesktopIcons, DesktopTaskbar, DesktopContextMenu)

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

  // minimize keeps the app mounted (game state survives) but genies it toward
  // its own taskbar button (--gx/--gy measured at minimize time; fall back to a
  // generic downward sail)
  &.is-minimized {
    opacity: 0;
    transform: translate(var(--gx, 0), var(--gy, 45vh)) scale(0.08);
    visibility: hidden;
    pointer-events: none;
  }

  &.is-maximized {
    inset: 0 0 2.4rem 0;
    width: auto;
    border-radius: 0;
  }

  // Aero-peek: hovering a taskbar item highlights its window and fades the rest
  &.is-peek {
    border-color: var(--bulma-primary);
    box-shadow: 0 0 0 1px var(--bulma-primary), 0 18px 50px hsla(var(--lv-primary-hsl), 0.3);
  }

  // a peeked, minimized window ghosts back into view instead of staying hidden
  &.is-minimized.is-peek {
    opacity: 0.55;
    transform: translateY(18vh) scale(0.7);
    visibility: visible;
  }

  &.is-dimmed:not(.is-minimized) {
    opacity: 0.4;
  }
}

@keyframes lvos-window-open {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(0.5rem);
  }
}

// respect reduced motion: windows appear/minimize without the fly-in or genie,
// and the CRT power-off is skipped (the JS side already acts immediately)
@media (prefers-reduced-motion: reduce) {
  .lvos-window {
    animation: none;
    transition: opacity 0.12s ease, visibility 0.12s;

    &.is-minimized {
      transform: none;
    }
  }

  .lvos.is-powering-off {
    animation: none;
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

// resize handles: thin invisible hit areas on each edge, small squares on the
// corners. The south-east corner keeps the visible diagonal grip.
.lvos-resize {
  position: absolute;
  touch-action: none;
  z-index: 3;

  // edges (kept just inside the window so overflow:hidden doesn't clip them)
  &.is-n, &.is-s { left: 0.6rem; right: 0.6rem; height: 6px; cursor: ns-resize; }
  &.is-e, &.is-w { top: 0.6rem; bottom: 0.6rem; width: 6px; cursor: ew-resize; }
  &.is-n { top: 0; }
  &.is-s { bottom: 0; }
  &.is-e { right: 0; }
  &.is-w { left: 0; }

  // corners sit above the edges
  &.is-ne, &.is-nw, &.is-se, &.is-sw { width: 14px; height: 14px; z-index: 4; }
  &.is-ne { top: 0; right: 0; cursor: nesw-resize; }
  &.is-nw { top: 0; left: 0; cursor: nwse-resize; }
  &.is-sw { bottom: 0; left: 0; cursor: nesw-resize; }
  &.is-se {
    bottom: 0;
    right: 0;
    width: 1rem;
    height: 1rem;
    cursor: nwse-resize;
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

</style>
