import type { TerminalContext } from '~/utils/terminal/types'
import type { DesktopWindow } from '~/composables/useWindowManager'
import {
  effectProcs,
  windowProcs,
  gameProc,
  lvshProc,
  lvosSessionProc,
  SYSTEM_PROCS
} from '~/utils/terminal/effectProcs'
import type { EffectProc } from '~/utils/terminal/effectProcs'

/**
 * The site-wide effect flags in the shape the process table (and the terminal
 * context) expects. One builder, so the terminal's `ps`/`top`, the lvOS task
 * manager and the command modules all watch the exact same switches.
 */
export function useEffectFlags(): TerminalContext['effects'] {
  const { matrixActive, crtActive, destructActive, fireworksActive, toggleCrt } = useSiteEffects()
  return {
    matrix: matrixActive,
    train: useState(STATE_KEYS.fxTrain, () => false),
    bootReplay: useState(STATE_KEYS.bootReplay, () => false),
    party: useState(STATE_KEYS.fxParty, () => false),
    crt: crtActive,
    destruct: destructActive,
    boss: useState(STATE_KEYS.fxBoss, () => false),
    fireworks: fireworksActive,
    toggleCrt
  }
}

export interface ProcessShell {
  effects: TerminalContext['effects']
  /** The game/editor currently holding the terminal (null when idle) */
  game: { name: () => string | null, stop: () => void }
  /** Closing the shell: the terminal overlay, and its lvOS window if open */
  closeShell: () => void
}

/**
 * One process table for the whole site. Terminal effects, lvOS windows, the
 * running game/editor, the shell itself and (on /desktop) the session are all
 * killable processes with stable pids — `ps`, `top`/`htop` and the lvOS task
 * manager each render exactly this list.
 */
export function useProcessTable(shell: ProcessShell) {
  const windows = useState<DesktopWindow[]>(STATE_KEYS.lvosWindows, () => [])
  const router = useRouter()
  const route = useRoute()

  const closeWindow = (id: string) => {
    windows.value = windows.value.filter((win) => win.id !== id)
  }
  // killing lvsh takes the shell's lvOS window down with it
  const closeShell = () => {
    shell.closeShell()
    closeWindow('terminal')
  }

  const all = (): EffectProc[] => {
    const gameName = shell.game.name()
    return [
      ...effectProcs(shell.effects),
      ...windowProcs(windows.value, closeWindow),
      ...(gameName ? [gameProc(gameName, shell.game.stop)] : []),
      ...(route.path.startsWith('/desktop') ? [lvosSessionProc(() => void router.push('/'))] : []),
      lvshProc(closeShell)
    ]
  }

  const running = () => all().filter((proc) => proc.running()).sort((a, b) => a.pid - b.pid)

  return { all, running, system: SYSTEM_PROCS, windows }
}
