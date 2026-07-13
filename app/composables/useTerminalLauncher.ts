// Lightweight openers for the terminal and command palette.
//
// The full useTerminal()/useCommandPalette() composables statically pull in the
// entire command registry (~45KB gz: cowsay, fortune, figlet, matrix, every
// help string, …). Always-mounted chrome — the navbar, footer, status bar and
// mobile nav — only ever needs to OPEN those overlays, not build their command
// maps, so it uses these instead. That keeps the registry out of the initial
// bundle and lets the overlays themselves be lazily mounted (`<LazyTerminalOverlay
// v-if="terminalOpen">`), so a visitor who never hits `~` never downloads them.
//
// The overlays share the exact same useState keys, so opening from here and
// closing from inside the mounted overlay stay in lock-step.
export function useTerminalLauncher() {
  const isOpen = useState(STATE_KEYS.terminalOpen, () => false)
  // commands queued from chrome (footer's `git show`, the pet click) that the
  // overlay drains once it mounts — see TerminalOverlay's pending watcher
  const pending = useState<string[]>(STATE_KEYS.terminalPending, () => [])
  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }
  const toggle = () => { isOpen.value = !isOpen.value }
  const run = (command: string) => {
    pending.value = [...pending.value, command]
    isOpen.value = true
  }
  return { isOpen, open, close, toggle, run, pending }
}

export function usePaletteLauncher() {
  const isOpen = useState(STATE_KEYS.paletteOpen, () => false)
  const open = () => { isOpen.value = true }
  const toggle = () => { isOpen.value = !isOpen.value }
  return { isOpen, open, toggle }
}
