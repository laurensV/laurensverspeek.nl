import type { IconName } from '~/components/AppIcon.vue'

// One registry for the lvOS window apps: their titles, desktop-icon metadata
// and layout hints. WebDesktop derives the window titles, the icon grid and the
// "wide window" set from this, so the three lists can't drift apart. (The
// component dispatch stays in the template — it maps ids to distinct Lazy*
// components with their own props.)

export interface DesktopApp {
  id: string
  /** Window title bar text */
  title: string
  /** Desktop icon label */
  label: string
  icon: IconName
  /** Opens at a wider default size */
  wide?: boolean
  /**
   * How the desktop icon acts. 'window' just opens the window (the default);
   * the named actions are wired to bespoke handlers in WebDesktop.
   */
  action?: 'window' | 'blog' | 'terminal' | 'cv' | 'logout'
}

export const DESKTOP_APPS: DesktopApp[] = [
  { id: 'readme', title: 'readme.md — editor', label: 'readme.md', icon: 'file' },
  { id: 'files', title: 'file explorer', label: 'files', icon: 'layers' },
  { id: 'browser', title: 'lv browser', label: 'lv browser', icon: 'globe', wide: true },
  { id: 'blog', title: '~/blog — reader', label: 'blog', icon: 'book', wide: true, action: 'blog' },
  { id: 'terminal', title: 'lvsh — terminal', label: 'terminal', icon: 'terminal', wide: true, action: 'terminal' },
  { id: 'minesweeper', title: 'minesweeper.exe', label: 'mines.exe', icon: 'cpu' },
  { id: 'vim', title: 'vim — ~/notes.txt', label: 'vim', icon: 'braces' },
  { id: 'paint', title: 'lvpaint.exe', label: 'lvpaint', icon: 'pen' },
  { id: 'settings', title: 'settings', label: 'settings', icon: 'settings' },
  { id: 'media', title: 'media player', label: 'media', icon: 'sun' },
  { id: 'visualizer', title: 'visualizer', label: 'visualizer', icon: 'zap' },
  { id: 'calc', title: 'calculator', label: 'calculator', icon: 'hash' },
  { id: 'clock', title: 'clock', label: 'clock', icon: 'sun' },
  { id: 'notes', title: 'sticky notes', label: 'notes', icon: 'type', wide: true },
  { id: 'life', title: 'game of life', label: 'life', icon: 'zap' },
  { id: 'snake', title: 'snake', label: 'snake', icon: 'zap' },
  { id: 'gallery', title: 'image viewer', label: 'gallery', icon: 'sun' },
  { id: 'taskmgr', title: 'task manager', label: 'taskmgr', icon: 'cpu' },
  { id: 'cv', title: 'resume.pdf', label: 'resume.pdf', icon: 'mail', action: 'cv' },
  { id: 'logout', title: 'log out', label: 'log out', icon: 'close', action: 'logout' }
]

// windows opened by ids not in the icon grid still need titles (projects/about)
export const EXTRA_TITLES: Record<string, string> = {
  projects: '~/projects — files',
  'about-os': 'about lvOS'
}

export const WINDOW_TITLES: Record<string, string> = {
  ...Object.fromEntries(DESKTOP_APPS.map((app) => [app.id, app.title])),
  ...EXTRA_TITLES
}

const WIDE = new Set(DESKTOP_APPS.filter((app) => app.wide).map((app) => app.id))
export const isWideWindow = (id: string) => WIDE.has(id)
