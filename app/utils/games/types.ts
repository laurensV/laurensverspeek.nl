// Shared contract for the terminal mini-games. Members are property-style
// function types (not method syntax) because callers destructure them freely —
// none of them rely on `this`.
export interface GameHandle {
  /** Handle a keydown key; return true when the key was consumed */
  onKey: (key: string) => boolean
  /** Stop timers etc. (called when the terminal closes mid-game) */
  stop: () => void
}

export interface GameCallbacks {
  onFrame: (frame: string) => void
  onEnd: (lines: string[]) => void
}
