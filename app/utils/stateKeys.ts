// Central registry of the app's shared `useState` keys. Keeping them here
// prevents silent typos (two components using slightly different strings would
// otherwise get separate, un-synced state) and documents the shared surface.

export const STATE_KEYS = {
  // terminal
  terminalOpen: 'terminal-open',
  terminalPending: 'terminal-pending',
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
  // bumped by the `exit` command so the lvOS terminal window can close itself
  terminalExit: 'terminal-exit',
  // site-wide effects
  fxMatrix: 'fx-matrix',
  fxCrt: 'fx-crt',
  fxTrain: 'fx-train',
  fxParty: 'fx-party',
  fxDestruct: 'fx-destruct',
  fxBoss: 'fx-boss',
  fxFireworks: 'fx-fireworks',
  fxCelebrate: 'fx-celebrate',
  fxWorldRecord: 'fx-world-record',
  bootReplay: 'boot-replay',
  // the console dev-hunt reward: unlocks the hidden `backstage` command
  huntSolved: 'lv-hunt-solved',
  // the status-bar pet
  petState: 'pet-state',
  petNow: 'pet-now',
  petWallet: 'pet-wallet',
  // accessibility
  reduceMotion: 'reduce-motion',
  keyClick: 'key-click',

  // identity, theme, palette
  identityName: 'identity-name',
  accent: 'accent',
  paletteOpen: 'palette-open',
  paletteRecent: 'palette-recent',
  paletteCounts: 'palette-counts',
  vimPendingKey: 'vim-pending-key',
  // the chat room (relay)
  chatMessages: 'chat-messages',
  chatOnline: 'chat-online',
  chatStatus: 'chat-status',
  // the co-draw whiteboard (relay)
  drawStrokes: 'draw-strokes',
  drawOnline: 'draw-online',
  drawStatus: 'draw-status',
  drawCursors: 'draw-cursors',
  // live visitors
  liveVisitorCount: 'live-visitor-count',
  liveCursorsVisible: 'live-cursors-visible',
  liveSayOutbox: 'live-say-outbox',
  liveVisitorGeo: 'live-visitor-geo',
  // lvOS
  lvosWindows: 'lvos-windows',
  lvosWallpaper: 'lvos-wallpaper',
  lvosTrash: 'lvos-trash',
  lvosWallpaperCustom: 'lvos-wallpaper-custom',
  lvosVolume: 'lvos-volume',
  lvosMuted: 'lvos-muted',
  lvosSaver: 'lvos-saver',
  // an app id the terminal `desktop <app>` command wants opened once lvOS mounts
  lvosPendingApp: 'lvos-pending-app',
  // recent clipboard copies, for the lvOS Clipboard app
  clipboardHistory: 'clipboard-history'
} as const

export type StateKey = (typeof STATE_KEYS)[keyof typeof STATE_KEYS]
