import type { TerminalContext } from '~/utils/terminal/types'
import { DESKTOP_APPS } from '~/utils/desktopApps'

// The unified process table: terminal effects, lvOS windows, the active
// game/editor and the shell itself are all "processes" with stable pids, so
// `ps`/`kill`/`top` and the lvOS task manager see (and kill) the same world.

export interface EffectProc {
  pid: number
  name: string
  running: () => boolean
  stop: () => void
}

export interface SystemProc {
  pid: number
  name: string
}

// init and the daemons stay unkillable; lvsh (pid 7) is killable now —
// killing your own shell closes the terminal, like it should. This one list is
// the set dressing for ps, top AND the lvOS task manager, so they can't drift.
export const SYSTEM_PROCS: SystemProc[] = [
  { pid: 1, name: 'init' },
  { pid: 6, name: 'flow-field.service' },
  { pid: 23, name: 'dot-grid.css' },
  { pid: 77, name: 'easter_eggs.service' }
]

export const LVSH_PID = 7
export const LVOS_SESSION_PID = 95
export const GAME_PID = 4242

export function effectProcs(effects: TerminalContext['effects']): EffectProc[] {
  return [
    { pid: 314, name: 'matrix-rain', running: () => effects.matrix.value, stop: () => (effects.matrix.value = false) },
    { pid: 217, name: 'party-mode', running: () => effects.party.value, stop: () => (effects.party.value = false) },
    { pid: 42, name: 'sl-train', running: () => effects.train.value, stop: () => (effects.train.value = false) },
    { pid: 101, name: 'crt-filter', running: () => effects.crt.value, stop: () => void effects.toggleCrt(false) },
    { pid: 666, name: 'destroy-mode', running: () => effects.destruct.value, stop: () => (effects.destruct.value = false) },
    { pid: 925, name: 'quarterly-report.xlsx', running: () => effects.boss.value, stop: () => (effects.boss.value = false) },
    { pid: 1231, name: 'fireworks.sh', running: () => effects.fireworks.value, stop: () => (effects.fireworks.value = false) }
  ]
}

// stable pid per lvOS app id, derived from the app registry's order
const APP_PIDS = new Map<string, number>(DESKTOP_APPS.map((app, i) => [app.id, 2001 + i]))
const EXTRA_PIDS: Record<string, number> = { 'projects': 2101, 'about-os': 2102 }

export function windowPid(id: string): number {
  const known = APP_PIDS.get(id) ?? EXTRA_PIDS[id]
  if (known !== undefined) return known
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 97
  return 2900 + hash
}

/** Every open lvOS window as a killable process (killing really closes it). */
export function windowProcs(
  windows: { id: string }[],
  close: (id: string) => void
): EffectProc[] {
  return windows.map((win) => ({
    pid: windowPid(win.id),
    name: `lvos:${win.id}`,
    running: () => true,
    stop: () => close(win.id)
  }))
}

/** The active terminal game/editor (snake, vim, tail -f, …) as a process. */
export function gameProc(name: string, stop: () => void): EffectProc {
  return { pid: GAME_PID, name, running: () => true, stop }
}

/** The shell itself. Killing it closes the terminal — bold, but legal. */
export function lvshProc(close: () => void): EffectProc {
  return { pid: LVSH_PID, name: 'lvsh', running: () => true, stop: close }
}

/** The lvOS session while on /desktop; killing it logs the desktop out. */
export function lvosSessionProc(logout: () => void): EffectProc {
  return { pid: LVOS_SESSION_PID, name: 'lvos-session', running: () => true, stop: logout }
}

export type KillResult =
  | { ok: true, name: string }
  | { ok: false, reason: 'not-running' | 'not-permitted' | 'no-such-process' }

/** Resolve a `kill <pid>`: stop a running process, or explain why not. */
export function killByPid(procs: EffectProc[], system: SystemProc[], pid: number): KillResult {
  const effect = procs.find((proc) => proc.pid === pid)
  if (effect) {
    if (!effect.running()) return { ok: false, reason: 'not-running' }
    effect.stop()
    return { ok: true, name: effect.name }
  }
  if (system.some((proc) => proc.pid === pid)) return { ok: false, reason: 'not-permitted' }
  return { ok: false, reason: 'no-such-process' }
}
