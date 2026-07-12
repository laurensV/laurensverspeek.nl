import type { IconName } from '~/utils/icons'

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
  action?: 'window' | 'blog' | 'terminal' | 'logout'
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
  { id: 'playground', title: 'code playground', label: 'playground', icon: 'code', wide: true },
  { id: 'settings', title: 'settings', label: 'settings', icon: 'settings' },
  { id: 'media', title: 'media player', label: 'media', icon: 'play', wide: true },
  { id: 'calc', title: 'calculator', label: 'calculator', icon: 'hash' },
  { id: 'clock', title: 'clock', label: 'clock', icon: 'sun' },
  { id: 'notes', title: 'sticky notes', label: 'notes', icon: 'type', wide: true },
  { id: 'life', title: 'game of life', label: 'life', icon: 'zap' },
  { id: 'snake', title: 'snake', label: 'snake', icon: 'zap' },
  { id: 'gallery', title: 'image viewer', label: 'gallery', icon: 'image' },
  { id: 'camera', title: 'camera — asciicam', label: 'camera', icon: 'camera' },
  { id: 'chess', title: 'chess — vs the house', label: 'chess', icon: 'chess' },
  { id: 'taskmgr', title: 'task manager', label: 'taskmgr', icon: 'cpu' },
  { id: 'sysmon', title: 'system monitor', label: 'sysmon', icon: 'zap' },
  { id: 'displays', title: 'displays', label: 'displays', icon: 'sun' },
  { id: 'trash', title: 'recycle bin', label: 'recycle bin', icon: 'trash' },
  { id: 'mail', title: 'mail — inbox', label: 'mail', icon: 'mail', wide: true },
  { id: 'rss', title: 'feed reader', label: 'rss', icon: 'sparkles', wide: true },
  { id: 'scores', title: 'hall of fame', label: 'scores', icon: 'zap' },
  { id: 'world', title: 'the pixel world', label: 'world', icon: 'globe', wide: true },
  { id: 'cv', title: 'resume.pdf — viewer', label: 'resume.pdf', icon: 'file', wide: true },
  { id: 'chat', title: 'chat — #lounge', label: 'chat', icon: 'chat' },
  { id: 'globe', title: 'visitor globe', label: 'globe', icon: 'globe' },
  { id: 'weather', title: 'weather — amsterdam', label: 'weather', icon: 'sun' },
  { id: 'colorpicker', title: 'colour picker', label: 'colours', icon: 'pen' },
  { id: 'logout', title: 'log out', label: 'log out', icon: 'close', action: 'logout' }
]

// windows opened by ids not in the icon grid still need titles
export const EXTRA_TITLES: Record<string, string> = {
  'about-os': 'about this computer'
}

export const WINDOW_TITLES: Record<string, string> = {
  ...Object.fromEntries(DESKTOP_APPS.map((app) => [app.id, app.title])),
  ...EXTRA_TITLES
}

const WIDE = new Set(DESKTOP_APPS.filter((app) => app.wide).map((app) => app.id))
export const isWideWindow = (id: string) => WIDE.has(id)

/**
 * Resolve a run-dialog query to an app: exact id, then exact label, then
 * prefix of either. Used by the Win+R style launcher (and its completion).
 */
export function matchApp(query: string, apps: DesktopApp[] = DESKTOP_APPS): DesktopApp | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  return apps.find((app) => app.id === q)
    ?? apps.find((app) => app.label.toLowerCase() === q)
    ?? apps.find((app) => app.id.startsWith(q) || app.label.toLowerCase().startsWith(q))
    ?? null
}

/** Completion candidates for a partial run-dialog query. */
export function appCandidates(query: string, apps: DesktopApp[] = DESKTOP_APPS): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return apps
    .filter((app) => app.id.startsWith(q) || app.label.toLowerCase().startsWith(q))
    .map((app) => app.id)
}
