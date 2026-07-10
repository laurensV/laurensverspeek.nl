import type { TerminalContext } from '~/utils/terminal/types'

// The site effects, modelled as killable "processes" for `ps`/`kill`. Kept
// out of funCommands so the mapping (pid ⇄ effect flag) is unit-testable.

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

export const SYSTEM_PROCS: SystemProc[] = [
  { pid: 1, name: 'init' },
  { pid: 7, name: 'lvsh' },
  { pid: 77, name: 'easter_eggs.service' }
]

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

export type KillResult =
  | { ok: true, name: string }
  | { ok: false, reason: 'not-running' | 'not-permitted' | 'no-such-process' }

/** Resolve a `kill <pid>`: stop a running effect, or explain why not. */
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
