<template>
  <Teleport to="body">
    <LazyDesktopBoot v-if="booting" @done="onBootDone" />
    <div
      v-if="!booting"
      class="lvos"
      :class="{ 'is-powering-off': poweringOff }"
      :style="wallpaperStyle"
      role="application"
      aria-label="lvOS desktop — log out from the start menu"
      @contextmenu.prevent="openContextMenu"
      @click="contextMenu.open = false; titleMenu.open = false"
    >
      <!-- live wallpaper: a dim Game of Life behind everything -->
      <LazyDesktopLifeWallpaper v-if="wallpapers[wallpaper]?.live" />

      <!-- night-light warm wash (Displays app); over everything, click-through -->
      <div v-if="nightLight.overlayOpacity.value" class="lvos-nightlight" :style="{ opacity: nightLight.overlayOpacity.value }" />

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

      <!-- desktop icons (with live badges: unread mail, binned files) -->
      <DesktopIcons :icons="icons" :badges="iconBadges" />

      <!-- the tamagotchi wanders the desktop, if one has been adopted -->
      <DesktopPetWidget />

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

      <!-- windows: chrome lives in DesktopWindow, the apps are slotted in -->
      <DesktopWindow
        v-for="win in windows"
        :key="win.id"
        :win="win"
        :wide="isWideWindow(win.id)"
        :peek="peekedId === win.id"
        :dimmed="peekedId !== null && peekedId !== win.id"
        :flush="win.id === 'terminal'"
        :style="windowStyle(win)"
        @focus="focusWindow(win)"
        @drag="startDrag(win, $event)"
        @minimize="toggleMinimize(win)"
        @maximize="toggleMaximize(win)"
        @close="closeWindow(win.id)"
        @menu="openTitleMenu(win, $event)"
        @resize="(event, dir) => startResize(win, event, dir)"
      >
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

        <LazyDesktopAbout v-else-if="win.id === 'about-os'" :since="sessionStart" />

        <!-- apps with bespoke props/events stay explicit; the rest go through
             one registry-driven <component :is> (each still its own lazy chunk) -->
        <LazyDesktopFiles
          v-else-if="win.id === 'files'"
          @window="openWindow"
          @post="openBlogPost"
          @edit="openVim"
        />
        <LazyDesktopBlog v-else-if="win.id === 'blog'" :open-path="blogOpenPath" />
        <LazyDesktopVim v-else-if="win.id === 'vim'" :open-path="vimOpenPath" @close="closeWindow('vim')" />
        <LazyDesktopTaskManager v-else-if="win.id === 'taskmgr'" />
        <LazyDesktopRss v-else-if="win.id === 'rss'" @post="openBlogPost" />
        <LazyDesktopMail v-else-if="win.id === 'mail'" @post="openBlogPost" />
        <LazyWorldCanvas v-else-if="win.id === 'world'" class="lvos-world" />
        <LazyDesktopTerminal v-else-if="win.id === 'terminal'" :active="terminalActive" />
        <component :is="SIMPLE_APPS[win.id]" v-else-if="SIMPLE_APPS[win.id]" />
      </DesktopWindow>

      <!-- window titlebar context menu -->
      <div
        v-if="titleMenu.open && titleMenuWin"
        class="lvos-titlemenu is-family-code"
        :style="{ left: `${titleMenu.x}px`, top: `${titleMenu.y}px` }"
      >
        <button @click="titleMenuAct((w) => toggleMinimize(w))">– minimize</button>
        <button @click="titleMenuAct((w) => toggleMaximize(w))">{{ titleMenuWin.maximized ? '❐ restore' : '□ maximize' }}</button>
        <button @click="titleMenuAct((w) => togglePin(w))">📌 {{ titleMenuWin.pinned ? 'unpin from top' : 'pin on top' }}</button>
        <button class="is-close" @click="titleMenuAct((w) => closeWindow(w.id))">× close</button>
      </div>

      <!-- run dialog (Alt+R): keyboard-first app launching -->
      <LazyDesktopRunDialog v-if="runOpen" @launch="launchById" @close="runOpen = false" />

      <!-- keyboard cheat sheet (press ? on the desktop) -->
      <DesktopShortcuts v-if="shortcutsOpen" @close="shortcutsOpen = false" />

      <!-- lock screen: ceremonial, but it does cover everything -->
      <LazyDesktopLockScreen v-if="locked" @unlock="locked = false" />

      <!-- taskbar -->
      <DesktopTaskbar
        v-model:start-open="startOpen"
        v-model:calendar-open="calendarOpen"
        v-model:notif-open="notifOpen"
        v-model:volume-open="volumeOpen"
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
        @tile="tileAll"
        @run="runOpen = true"
        @iso="downloadIso"
        @screenshot="takeScreenshot"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useIdle } from '@vueuse/core'
import type { DesktopWindow } from '~/composables/useWindowManager'
import { DESKTOP_APPS, WINDOW_TITLES, isWideWindow } from '~/utils/desktopApps'
import { dirEntries } from '~/utils/terminal/filesystem'
import { storageDegraded } from '~/utils/terminal/storageHealth'
import { profile } from '~/data/profile'

// Prop-less window apps render through one <component :is>, each still its own
// lazy chunk via defineAsyncComponent. Apps with bespoke props/events (files,
// blog, vim, taskmgr, rss, terminal, world) stay explicit in the template.
// (eslint's TS service types dynamic .vue imports as any — vue-tsc checks them)
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const SIMPLE_APPS: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  minesweeper: defineAsyncComponent(() => import('~/components/desktop/DesktopMinesweeper.vue')),
  media: defineAsyncComponent(() => import('~/components/desktop/DesktopMedia.vue')),
  browser: defineAsyncComponent(() => import('~/components/desktop/DesktopBrowser.vue')),
  settings: defineAsyncComponent(() => import('~/components/desktop/DesktopSettings.vue')),
  paint: defineAsyncComponent(() => import('~/components/desktop/DesktopPaint.vue')),
  playground: defineAsyncComponent(() => import('~/components/desktop/DesktopPlayground.vue')),
  cv: defineAsyncComponent(() => import('~/components/desktop/DesktopResume.vue')),
  calc: defineAsyncComponent(() => import('~/components/desktop/DesktopCalculator.vue')),
  clock: defineAsyncComponent(() => import('~/components/desktop/DesktopClock.vue')),
  notes: defineAsyncComponent(() => import('~/components/desktop/DesktopNotes.vue')),
  life: defineAsyncComponent(() => import('~/components/desktop/DesktopLife.vue')),
  snake: defineAsyncComponent(() => import('~/components/desktop/DesktopSnake.vue')),
  gallery: defineAsyncComponent(() => import('~/components/desktop/DesktopGallery.vue')),
  camera: defineAsyncComponent(() => import('~/components/desktop/DesktopCamera.vue')),
  chess: defineAsyncComponent(() => import('~/components/desktop/DesktopChess.vue')),
  trash: defineAsyncComponent(() => import('~/components/desktop/DesktopTrash.vue')),
  scores: defineAsyncComponent(() => import('~/components/desktop/DesktopScores.vue')),
  sysmon: defineAsyncComponent(() => import('~/components/desktop/DesktopSysMon.vue')),
  displays: defineAsyncComponent(() => import('~/components/desktop/DesktopDisplays.vue'))
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

// lvOS: the operating-system-in-a-browser easter egg. Boot with `desktop` in
// the terminal. Window mechanics live in useWindowManager, per-window chrome
// in DesktopWindow; this component is the shell: icons, taskbar and the apps
// inside the windows. Titles come from the app registry (utils/desktopApps).

const terminal = useTerminal()

const {
  windows,
  openWindow,
  closeWindow,
  focusWindow,
  toggleMinimize: wmToggleMinimize,
  toggleMaximize,
  togglePin,
  startDrag,
  startResize,
  snapPreview,
  keySnap,
  cycleWindows,
  tileAll
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
const volumeOpen = ref(false)
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
// night-light warm wash, toggled from the Displays app
const nightLight = useNightLight()
const cycleWallpaper = () => notify('🖼', 'Wallpaper changed', nextWallpaper())

// right-click menu on a window titlebar
const titleMenu = reactive({ open: false, x: 0, y: 0, winId: '' })
const openTitleMenu = (win: DesktopWindow, event: MouseEvent) => {
  focusWindow(win)
  titleMenu.open = true
  titleMenu.x = event.clientX
  titleMenu.y = event.clientY
  titleMenu.winId = win.id
}
const titleMenuWin = computed(() => windows.value.find((w) => w.id === titleMenu.winId))
const titleMenuAct = (action: (win: DesktopWindow) => void) => {
  if (titleMenuWin.value) action(titleMenuWin.value)
  titleMenu.open = false
}

const zIndexFor = (win: DesktopWindow) => win.z + (win.pinned ? 1000 : 0)

const windowStyle = (win: DesktopWindow) =>
  win.maximized
    ? { zIndex: zIndexFor(win), ...genie[win.id] }
    : {
        left: `${win.x}px`,
        top: `${win.y}px`,
        zIndex: zIndexFor(win),
        width: win.width !== undefined ? `${win.width}px` : undefined,
        height: win.height !== undefined ? `${win.height}px` : undefined,
        ...genie[win.id]
      }

const onBootDone = () => {
  booting.value = false
  notify('⚡', 'Welcome to lvOS 2.0', 'right-click the desktop for a menu')
  // the battery nudge tells the truth where the Battery API exists, and
  // keeps the classic bit where it doesn't
  setTimeout(() => {
    const pct = battery.percent.value
    if (!battery.supported.value || pct === null) {
      notify('🔋', 'Battery low', 'plug in your creativity')
    } else if (!battery.charging.value && pct <= 30) {
      notify('🔋', `Battery low (${pct}%)`, 'plug in your creativity — and the charger')
    } else {
      notify('🔋', `Battery at ${pct}%${battery.charging.value ? ', charging' : ''}`, 'plug in your creativity anyway')
    }
  }, 6000)
}

// About This Computer (DesktopAbout) shows uptime since this mount
const sessionStart = Date.now()

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

// which file vim edits (set by the file explorer's "edit in vim")
const vimOpenPath = ref<string | null>(null)
const openVim = (path: string) => {
  vimOpenPath.value = path
  openWindow('vim')
}

const openBlogPost = (path: string) => {
  blogOpenPath.value = path
  openWindow('blog')
}

const openBlogApp = () => {
  blogOpenPath.value = null
  openWindow('blog')
}

// session, lock screen and the CRT power-off live in useDesktopPower
const { locked, lock, logout, poweringOff, shutdown, reboot } = useDesktopPower({ booting, startOpen, calendarOpen })
const shortcutsOpen = ref(false)

const iconActions: Record<string, () => void> = {
  blog: openBlogApp,
  terminal: openTerminal,
  logout
}
const icons = DESKTOP_APPS.map((app) => ({
  id: app.id,
  label: app.label,
  icon: app.icon,
  action: app.action && app.action !== 'window' ? iconActions[app.action]! : () => openWindow(app.id)
}))

// the real battery feeds the boot nudge (and the taskbar tray)
const battery = useBattery()

// the lvos.iso joke download and the desktop screenshot → Gallery (see composable)
const { downloadIso, takeScreenshot } = useDesktopIo({
  windows, icons, wallpapers, wallpaper, battery, terminal, notify
})

// when storage fills up, file writes silently die — make it loud
watch(storageDegraded, (degraded) => {
  if (degraded) notify('⚠', 'Disk full', 'browser storage is full — file changes are not being saved')
})

// live icon badges from the shared state the apps themselves use — sticky
// notes are files in ~/stickies, so their count is right from boot
const { unread: mailUnread } = useLvosMail()
const { entries: trashEntries } = useTrash()
const { unseen: rssUnseen } = useLvosRss()
const iconBadges = computed<Record<string, number>>(() => ({
  mail: mailUnread.value,
  trash: trashEntries.value.length,
  notes: dirEntries(terminal.files.value, 'stickies').filter((entry) => !entry.dir).length,
  rss: rssUnseen.value
}))

// ---- run dialog (Alt+R): launches by app id through the same actions ----
const runOpen = ref(false)
const launchById = (id: string) => {
  const app = DESKTOP_APPS.find((candidate) => candidate.id === id)
  if (app?.action && app.action !== 'window') iconActions[app.action]!()
  else openWindow(id)
}
// entering the /desktop page runs the BIOS/POST screen; a fresh session then
// opens the readme, while a returning session restores its previous windows.
onMounted(() => {
  const firstBoot = !windows.value.length
  booting.value = true
  if (firstBoot) openWindow('readme')
})

// the desktop keyboard (?, ~, alt+r, alt+tab, ctrl+alt+arrows, escape)
useDesktopShortcuts({
  locked,
  shortcutsOpen,
  runOpen,
  startOpen,
  calendarOpen,
  notifOpen,
  volumeOpen,
  contextMenu,
  titleMenu,
  terminalOpen: terminal.isOpen,
  windows,
  openWindow,
  keySnap,
  cycleWindows
})
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

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

// night light: a warm amber wash over the whole desktop, click-through
.lvos-nightlight {
  position: fixed;
  inset: 0;
  z-index: 10050;
  pointer-events: none;
  background: linear-gradient(160deg, #ff8c1a, #ff5e1a);
  mix-blend-mode: multiply;
  transition: opacity 0.4s ease;
}

// titlebar right-click menu (same look as the desktop context menu)
.lvos-titlemenu {
  position: fixed;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  min-width: 10rem;
  padding: 0.3rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);

  @include lv-glass(8%, 0.98, 0.82);

  font-size: 0.75rem;

  button {
    padding: 0.4rem 0.6rem;
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

    &.is-close:hover {
      color: var(--bulma-danger);
    }
  }
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

// the CRT power-off is skipped under reduced motion (the JS side already
// acts immediately); window-level reduced motion lives in DesktopWindow
@media (prefers-reduced-motion: reduce) {
  .lvos.is-powering-off {
    animation: none;
  }
}

.lvos-world {
  min-width: 30rem;
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
