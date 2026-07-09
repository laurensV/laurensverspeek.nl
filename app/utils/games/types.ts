// Shared contract for the terminal mini-games.
export interface GameHandle {
  /** Handle a keydown key; return true when the key was consumed */
  onKey(key: string): boolean
  /** Stop timers etc. (called when the terminal closes mid-game) */
  stop(): void
}

export interface GameCallbacks {
  onFrame(frame: string): void
  onEnd(lines: string[]): void
}
