// One source of truth for every keyboard shortcut / trick on the site. The `?`
// overlay (ShortcutsHelp), the lvOS cheat sheet (DesktopShortcuts) and the
// printable /keyboard reference all render from these, so they can't drift.

export interface ShortcutRow {
  keys: string[]
  label: string
}
export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

/** Site-wide shortcuts (the `?` overlay shows these). */
export const siteShortcuts: ShortcutGroup[] = [
  {
    title: 'global',
    rows: [
      { keys: ['~'], label: 'open the interactive terminal' },
      { keys: ['ctrl', 'k'], label: 'open the command palette' },
      { keys: ['?'], label: 'show the shortcuts help' },
      { keys: ['esc'], label: 'close any overlay' },
      { keys: ['j', 'k'], label: 'scroll the page, vim style' },
      { keys: ['gg', 'G'], label: 'jump to top / bottom' },
      { keys: ['gh', 'gb', 'gp'], label: 'go to home / blog / projects' }
    ]
  },
  {
    title: 'terminal',
    rows: [
      { keys: ['↑', '↓'], label: 'walk through command history' },
      { keys: ['tab'], label: 'autocomplete commands & arguments' },
      { keys: ['ctrl', 'r'], label: 'reverse history search' },
      { keys: ['ctrl', 'l'], label: 'clear the screen' },
      { keys: ['|', 'grep'], label: 'pipe output through grep / head / tail / wc' },
      { keys: ['|', 'less'], label: 'page long output (j/k scroll, / search, q quit)' }
    ]
  },
  {
    title: 'try typing',
    rows: [
      { keys: ['help'], label: 'list every command' },
      { keys: ['tree'], label: 'the whole site as a directory tree' },
      { keys: ['desktop'], label: 'boot the lvOS desktop environment' },
      { keys: ['snake'], label: 'also: tetris · 2048 · hangman · top' },
      { keys: ['secrets'], label: 'reveal the hidden commands' }
    ]
  },
  {
    title: 'secrets',
    rows: [
      { keys: ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'b', 'a'], label: 'you know what this does' },
      { keys: ['/', '?desktop'], label: 'a URL that boots straight into lvOS' }
    ]
  }
]

/** lvOS desktop shortcuts (the in-desktop `?` cheat sheet shows these). */
export const desktopShortcuts: ShortcutRow[] = [
  { keys: ['~'], label: 'open a terminal window' },
  { keys: ['alt', 'r'], label: 'run… launch any app by name' },
  { keys: ['alt', 'tab'], label: 'switch between windows' },
  { keys: ['drag', 'edge'], label: 'snap a window to a half or corner' },
  { keys: ['ctrl', 'alt', '←→↑↓'], label: 'snap the top window from the keyboard' },
  { keys: ['dbl-click'], label: 'maximize / restore a window (title bar)' },
  { keys: ['right-click', 'title'], label: 'window menu: pin, minimize, close' },
  { keys: ['right-click', 'desktop'], label: 'new terminal · change wallpaper' },
  { keys: ['esc'], label: 'dismiss menus and popups' },
  { keys: ['?'], label: 'this cheat sheet' }
]
