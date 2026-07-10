// Central registry of the app's shared `useState` keys. Keeping them here
// prevents silent typos (two components using slightly different strings would
// otherwise get separate, un-synced state) and documents the shared surface.

export const STATE_KEYS = {
  // terminal
  terminalOpen: 'terminal-open',
  terminalLines: 'terminal-lines',
  terminalHistory: 'terminal-history',
  terminalEnv: 'terminal-env',
  terminalAliases: 'terminal-aliases',
  terminalFs: 'terminal-fs',
  terminalFsCwd: 'terminal-fs-cwd',
  terminalFontScale: 'terminal-font-scale',
  terminalSshHost: 'terminal-ssh-host',
  terminalSpinner: 'terminal-spinner',
  terminalPanes: 'terminal-panes',
  terminalActivePane: 'terminal-active-pane',
  terminalPaneDir: 'terminal-pane-dir',
  // site-wide effects
  fxMatrix: 'fx-matrix',
  fxCrt: 'fx-crt',
  fxTrain: 'fx-train',
  fxParty: 'fx-party',
  fxDestruct: 'fx-destruct',
  fxBoss: 'fx-boss',
  fxFireworks: 'fx-fireworks',
  bootReplay: 'boot-replay',
  // the status-bar pet
  petState: 'pet-state',
  petNow: 'pet-now',
  // identity, theme, palette
  identityName: 'identity-name',
  accent: 'accent',
  paletteOpen: 'palette-open',
  paletteRecent: 'palette-recent',
  paletteCounts: 'palette-counts',
  vimPendingKey: 'vim-pending-key',
  // live visitors
  liveVisitorCount: 'live-visitor-count',
  liveCursorsVisible: 'live-cursors-visible',
  liveSayOutbox: 'live-say-outbox',
  // lvOS
  lvosWindows: 'lvos-windows',
  lvosNotes: 'lvos-notes',
  lvosWallpaper: 'lvos-wallpaper',
  lvosTrash: 'lvos-trash',
  lvosWallpaperCustom: 'lvos-wallpaper-custom'
} as const

export type StateKey = (typeof STATE_KEYS)[keyof typeof STATE_KEYS]
